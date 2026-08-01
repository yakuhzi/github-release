"use strict";
/*!
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientPool = exports.CLIENT_TERMINATED_ERROR_MSG = void 0;
const assert = require("assert");
const logger_1 = require("./logger");
const util_1 = require("./util");
exports.CLIENT_TERMINATED_ERROR_MSG = 'The client has already been terminated';
/**
 * An auto-resizing pool that distributes concurrent operations over multiple
 * clients of type `T`.
 *
 * ClientPool is used within Firestore to manage a pool of GAPIC clients and
 * automatically initializes multiple clients if we issue more than 100
 * concurrent operations.
 *
 * @private
 * @internal
 */
class ClientPool {
    concurrentOperationLimit;
    maxIdleClients;
    clientFactory;
    clientDestructor;
    grpcEnabled = false;
    /**
     * Stores each active clients and how many operations it has outstanding.
     */
    activeClients = new Map();
    /**
     * A set of clients that have seen RST_STREAM errors (see
     * https://github.com/googleapis/nodejs-firestore/issues/1023) and should
     * no longer be used.
     */
    failedClients = new Set();
    /**
     * A mapping from "client" objects to their corresponding IDs. These IDs have
     * no semantic meaning but are used for logging to enable tracing the events
     * of a particular client over time (such as creating, acquiring, and
     * releasing).
     */
    clientIdByClient = new WeakMap();
    /**
     * An object that can be specified to `logger()` to lazily calculate a long
     * log message that includes all client IDs of active and pending clients.
     */
    lazyLogStringForAllClientIds;
    /**
     * Whether the Firestore instance has been terminated. Once terminated, the
     * ClientPool can longer schedule new operations.
     */
    terminated = false;
    /**
     * Deferred promise that is resolved when there are no active operations on
     * the client pool after terminate() has been called.
     */
    terminateDeferred = new util_1.Deferred();
    /**
     * A unique identifier for this object, for inclusion in log messages.
     */
    instanceId = 'cpl' + (0, util_1.requestTag)();
    /**
     * @param concurrentOperationLimit The number of operations that each client
     * can handle.
     * @param maxIdleClients The maximum number of idle clients to keep before
     * garbage collecting.
     * @param clientFactory A factory function called as needed when new clients
     * are required.
     * @param clientDestructor A cleanup function that is called when a client is
     * disposed of.
     */
    constructor(concurrentOperationLimit, maxIdleClients, clientFactory, clientDestructor = () => Promise.resolve()) {
        this.concurrentOperationLimit = concurrentOperationLimit;
        this.maxIdleClients = maxIdleClients;
        this.clientFactory = clientFactory;
        this.clientDestructor = clientDestructor;
        this.lazyLogStringForAllClientIds = new LazyLogStringForAllClientIds({
            activeClients: this.activeClients,
            failedClients: this.failedClients,
            clientIdByClient: this.clientIdByClient,
        });
    }
    /**
     * Transitions the pool to gRPC and eagerly garbage-collects idle REST clients.
     * REST clients with in-flight requests will be garbage collected upon request completion.
     */
    transitionToGrpc(requestTag) {
        this.grpcEnabled = true;
        (0, logger_1.logger)(`ClientPool[${this.instanceId}].acquire`, requestTag, 'Transitioning pool to gRPC (requiresGrpc: true)');
        for (const [client, metadata] of this.activeClients) {
            if (!metadata.grpcEnabled && metadata.activeRequestCount === 0) {
                this.activeClients.delete(client);
                this.failedClients.delete(client);
                void Promise.resolve(this.clientDestructor(client)).catch(err => {
                    (0, logger_1.logger)(`ClientPool[${this.instanceId}].transitionToGrpc`, requestTag, 'Failed to destroy client: %s', err);
                });
            }
        }
    }
    /**
     * Returns an already existing client if it has less than the maximum number
     * of concurrent operations or initializes and returns a new client.
     *
     * @private
     * @internal
     */
    acquire(requestTag, requiresGrpc) {
        let selectedClient = null;
        let selectedClientRequestCount = -1;
        if (!this.grpcEnabled && requiresGrpc) {
            this.transitionToGrpc(requestTag);
        }
        // Require a grpc client for this operation if we have transitioned to grpc.
        requiresGrpc = requiresGrpc || this.grpcEnabled;
        for (const [client, metadata] of this.activeClients) {
            const isEligible = metadata.grpcEnabled || !requiresGrpc;
            if (!isEligible || this.failedClients.has(client)) {
                continue;
            }
            // Use the "most-full" client that can still accommodate the request
            // in order to maximize the number of idle clients as operations start to
            // complete.
            if (metadata.activeRequestCount > selectedClientRequestCount &&
                metadata.activeRequestCount < this.concurrentOperationLimit) {
                selectedClient = client;
                selectedClientRequestCount = metadata.activeRequestCount;
            }
        }
        if (selectedClient) {
            const selectedClientId = this.clientIdByClient.get(selectedClient);
            (0, logger_1.logger)(`ClientPool[${this.instanceId}].acquire`, requestTag, 'Re-using existing client [%s] with %s remaining operations', selectedClientId, this.concurrentOperationLimit - selectedClientRequestCount);
        }
        else {
            const newClientId = 'cli' + (0, util_1.requestTag)();
            (0, logger_1.logger)(`ClientPool[${this.instanceId}].acquire`, requestTag, 'Creating a new client [%s] (requiresGrpc: %s)', newClientId, requiresGrpc);
            selectedClient = this.clientFactory(requiresGrpc);
            this.clientIdByClient.set(selectedClient, newClientId);
            selectedClientRequestCount = 0;
            assert(!this.activeClients.has(selectedClient), 'The provided client factory returned an existing instance');
        }
        this.activeClients.set(selectedClient, {
            grpcEnabled: requiresGrpc,
            activeRequestCount: selectedClientRequestCount + 1,
        });
        return selectedClient;
    }
    /**
     * Reduces the number of operations for the provided client, potentially
     * removing it from the pool of active clients.
     * @private
     * @internal
     */
    async release(requestTag, client) {
        const clientId = this.clientIdByClient.get(client);
        const metadata = this.activeClients.get(client);
        assert(metadata && metadata.activeRequestCount > 0, 'No active requests');
        this.activeClients.set(client, {
            grpcEnabled: metadata.grpcEnabled,
            activeRequestCount: metadata.activeRequestCount - 1,
        });
        if (this.terminated && this.opCount === 0) {
            this.terminateDeferred.resolve();
        }
        const gcDetermination = this.shouldGarbageCollectClient(client);
        (0, logger_1.logger)(`ClientPool[${this.instanceId}].release`, requestTag, 'Releasing client [%s] (gc=%s)', clientId, gcDetermination);
        if (!gcDetermination.shouldGarbageCollectClient) {
            return;
        }
        (0, logger_1.logger)(`ClientPool[${this.instanceId}].release`, requestTag, 'Garbage collecting client [%s] (%s)', clientId, this.lazyLogStringForAllClientIds);
        const activeClientDeleted = this.activeClients.delete(client);
        this.failedClients.delete(client);
        await this.clientDestructor(client);
        (0, logger_1.logger)(`ClientPool[${this.instanceId}].release`, requestTag, 'Garbage collected client [%s] activeClientDeleted=%s (%s)', clientId, activeClientDeleted, this.lazyLogStringForAllClientIds);
    }
    /**
     * Given the current operation counts, determines if the given client should
     * be garbage collected.
     * @private
     * @internal
     */
    shouldGarbageCollectClient(client) {
        const clientMetadata = this.activeClients.get(client);
        if (clientMetadata.activeRequestCount !== 0) {
            // Don't garbage collect clients that have active requests.
            return new ClientHasActiveRequests({
                shouldGarbageCollectClient: false,
                clientActiveRequestCount: clientMetadata.activeRequestCount,
            });
        }
        if (this.grpcEnabled !== clientMetadata.grpcEnabled) {
            // We are transitioning to GRPC. Garbage collect REST clients.
            return new PoolIsTransitioningToGrpc({
                shouldGarbageCollectClient: true,
                clientActiveRequestCount: clientMetadata.activeRequestCount,
                poolGrpcEnabled: this.grpcEnabled,
                clientGrpcEnabled: clientMetadata.grpcEnabled,
            });
        }
        // Idle clients that have received RST_STREAM errors are always garbage
        // collected.
        if (this.failedClients.has(client)) {
            return new ClientIsFailed({
                shouldGarbageCollectClient: true,
                clientActiveRequestCount: clientMetadata.activeRequestCount,
            });
        }
        // Otherwise, only garbage collect if we have too much idle capacity (e.g.
        // more than 100 idle capacity with default settings).
        let idleCapacityCount = 0;
        for (const [, metadata] of this.activeClients) {
            if (metadata.grpcEnabled === this.grpcEnabled) {
                idleCapacityCount +=
                    this.concurrentOperationLimit - metadata.activeRequestCount;
            }
        }
        const maxIdleCapacityCount = this.maxIdleClients * this.concurrentOperationLimit;
        return new IdleCapacity({
            shouldGarbageCollectClient: idleCapacityCount > maxIdleCapacityCount,
            clientActiveRequestCount: clientMetadata.activeRequestCount,
            idleCapacityCount: idleCapacityCount,
            maxIdleCapacityCount: maxIdleCapacityCount,
            maxIdleClients: this.maxIdleClients,
            concurrentOperationLimit: this.concurrentOperationLimit,
        });
    }
    /**
     * The number of currently registered clients.
     *
     * @returns Number of currently registered clients.
     * @private
     * @internal
     */
    // Visible for testing.
    get size() {
        return this.activeClients.size;
    }
    /**
     * The number of currently active operations.
     *
     * @returns Number of currently active operations.
     * @private
     * @internal
     */
    // Visible for testing.
    get opCount() {
        let activeOperationCount = 0;
        this.activeClients.forEach(metadata => (activeOperationCount += metadata.activeRequestCount));
        return activeOperationCount;
    }
    /**
     * The currently active clients.
     *
     * @returns The currently active clients.
     * @private
     * @internal
     */
    // Visible for testing.
    get _activeClients() {
        return this.activeClients;
    }
    /**
     * Runs the provided operation in this pool. This function may create an
     * additional client if all existing clients already operate at the concurrent
     * operation limit.
     *
     * @param requestTag A unique client-assigned identifier for this operation.
     * @param op A callback function that returns a Promise. The client T will
     * be returned to the pool when callback finishes.
     * @returns A Promise that resolves with the result of `op`.
     * @private
     * @internal
     */
    run(requestTag, requiresGrpc, op) {
        if (this.terminated) {
            return Promise.reject(new Error(exports.CLIENT_TERMINATED_ERROR_MSG));
        }
        const client = this.acquire(requestTag, requiresGrpc);
        return op(client)
            .catch(async (err) => {
            if (err.message?.match(/RST_STREAM/)) {
                // Once a client has seen a RST_STREAM error, the GRPC channel can
                // no longer be used. We mark the client as failed, which ensures that
                // we open a new GRPC channel for the next request.
                this.failedClients.add(client);
            }
            await this.release(requestTag, client);
            return Promise.reject(err);
        })
            .then(async (res) => {
            await this.release(requestTag, client);
            return res;
        });
    }
    async terminate() {
        this.terminated = true;
        // Wait for all pending operations to complete before terminating.
        if (this.opCount > 0) {
            (0, logger_1.logger)(`ClientPool[${this.instanceId}].terminate`, 
            /* requestTag= */ null, 'Waiting for %s pending operations to complete before terminating (%s)', this.opCount, this.lazyLogStringForAllClientIds);
            await this.terminateDeferred.promise;
        }
        (0, logger_1.logger)(`ClientPool[${this.instanceId}].terminate`, 
        /* requestTag= */ null, 'Closing all active clients (%s)', this.lazyLogStringForAllClientIds);
        for (const [client] of this.activeClients) {
            this.activeClients.delete(client);
            await this.clientDestructor(client);
        }
    }
}
exports.ClientPool = ClientPool;
/**
 * Helper class that, when logged as a direct argument of `logger()`, will
 * lazily evaluate to a long string that contains all IDs of both active and
 * failed clients.
 */
class LazyLogStringForAllClientIds {
    activeClients;
    failedClients;
    clientIdByClient;
    constructor(config) {
        this.activeClients = config.activeClients;
        this.failedClients = config.failedClients;
        this.clientIdByClient = config.clientIdByClient;
    }
    toString() {
        const activeClientsDescription = Array.from(this.activeClients.entries())
            .map(([client, metadata]) => `${this.clientIdByClient.get(client)}=${metadata.activeRequestCount}`)
            .sort()
            .join(', ');
        const failedClientsDescription = Array.from(this.failedClients)
            .map(client => `${this.clientIdByClient.get(client)}`)
            .sort()
            .join(', ');
        return (`${this.activeClients.size} active clients: {` +
            activeClientsDescription +
            '}, ' +
            `${this.failedClients.size} failed clients: {` +
            failedClientsDescription +
            '}');
    }
}
/**
 * Minimum data to be included in the objects returned from
 * ClientPool.shouldGarbageCollectClient().
 */
class BaseShouldGarbageCollectClientResult {
    /**
     * Return a terse, one-line string representation. This makes it easy to
     * grep through log output to find the logged values.
     */
    toString() {
        const propertyStrings = [];
        for (const propertyName of Object.getOwnPropertyNames(this)) {
            const propertyValue = this[propertyName];
            propertyStrings.push(`${propertyName}=${propertyValue}`);
        }
        return '{' + propertyStrings.join(', ') + '}';
    }
}
class ClientHasActiveRequests extends BaseShouldGarbageCollectClientResult {
    name = 'ClientHasActiveRequests';
    shouldGarbageCollectClient;
    clientActiveRequestCount;
    constructor(args) {
        super();
        this.shouldGarbageCollectClient = args.shouldGarbageCollectClient;
        this.clientActiveRequestCount = args.clientActiveRequestCount;
    }
}
class PoolIsTransitioningToGrpc extends BaseShouldGarbageCollectClientResult {
    name = 'PoolIsTransitioningToGrpc';
    shouldGarbageCollectClient;
    clientActiveRequestCount;
    poolGrpcEnabled;
    clientGrpcEnabled;
    constructor(args) {
        super();
        this.shouldGarbageCollectClient = args.shouldGarbageCollectClient;
        this.clientActiveRequestCount = args.clientActiveRequestCount;
        this.poolGrpcEnabled = args.poolGrpcEnabled;
        this.clientGrpcEnabled = args.clientGrpcEnabled;
    }
}
class ClientIsFailed extends BaseShouldGarbageCollectClientResult {
    name = 'ClientIsFailed';
    shouldGarbageCollectClient;
    clientActiveRequestCount;
    constructor(args) {
        super();
        this.shouldGarbageCollectClient = args.shouldGarbageCollectClient;
        this.clientActiveRequestCount = args.clientActiveRequestCount;
    }
}
class IdleCapacity extends BaseShouldGarbageCollectClientResult {
    name = 'IdleCapacity';
    shouldGarbageCollectClient;
    clientActiveRequestCount;
    idleCapacityCount;
    maxIdleCapacityCount;
    maxIdleClients;
    concurrentOperationLimit;
    constructor(args) {
        super();
        this.shouldGarbageCollectClient = args.shouldGarbageCollectClient;
        this.clientActiveRequestCount = args.clientActiveRequestCount;
        this.idleCapacityCount = args.idleCapacityCount;
        this.maxIdleCapacityCount = args.maxIdleCapacityCount;
        this.maxIdleClients = args.maxIdleClients;
        this.concurrentOperationLimit = args.concurrentOperationLimit;
    }
}
//# sourceMappingURL=pool.js.map