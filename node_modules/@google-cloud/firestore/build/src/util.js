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
exports.Deferred = void 0;
exports.autoId = autoId;
exports.requestTag = requestTag;
exports.isObject = isObject;
exports.isPlainObject = isPlainObject;
exports.isEmpty = isEmpty;
exports.isFunction = isFunction;
exports.isPermanentRpcError = isPermanentRpcError;
exports.getRetryCodes = getRetryCodes;
exports.getTotalTimeout = getTotalTimeout;
exports.getRetryParams = getRetryParams;
exports.silencePromise = silencePromise;
exports.wrapError = wrapError;
exports.tryGetPreferRestEnvironmentVariable = tryGetPreferRestEnvironmentVariable;
exports.mapToArray = mapToArray;
exports.isArrayEqual = isArrayEqual;
exports.isOptionalEqual = isOptionalEqual;
exports.isPrimitiveArrayEqual = isPrimitiveArrayEqual;
exports.cast = cast;
exports.forEach = forEach;
const crypto_1 = require("crypto");
const gapicConfig = require("./v1/firestore_client_config.json");
/**
 * A Promise implementation that supports deferred resolution.
 * @private
 * @internal
 */
class Deferred {
    promise;
    resolve = () => { };
    reject = () => { };
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
exports.Deferred = Deferred;
/**
 * Generate a unique client-side identifier.
 *
 * Used for the creation of new documents.
 *
 * @private
 * @internal
 * @returns {string} A unique 20-character wide identifier.
 */
function autoId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let autoId = '';
    while (autoId.length < 20) {
        const bytes = (0, crypto_1.randomBytes)(40);
        bytes.forEach(b => {
            // Length of `chars` is 62. We only take bytes between 0 and 62*4-1
            // (both inclusive). The value is then evenly mapped to indices of `char`
            // via a modulo operation.
            const maxValue = 62 * 4 - 1;
            if (autoId.length < 20 && b <= maxValue) {
                autoId += chars.charAt(b % 62);
            }
        });
    }
    return autoId;
}
/**
 * Generate a short and semi-random client-side identifier.
 *
 * Used for the creation of request tags.
 *
 * @private
 * @internal
 * @returns {string} A random 5-character wide identifier.
 */
function requestTag() {
    return autoId().substr(0, 5);
}
/**
 * Determines whether `value` is a JavaScript object.
 *
 * @private
 * @internal
 */
function isObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
}
/**
 * Verifies that 'obj' is a plain JavaScript object that can be encoded as a
 * 'Map' in Firestore.
 *
 * @private
 * @internal
 * @param input The argument to verify.
 * @returns 'true' if the input can be a treated as a plain object.
 */
function isPlainObject(input) {
    return (isObject(input) &&
        (Object.getPrototypeOf(input) === Object.prototype ||
            Object.getPrototypeOf(input) === null ||
            input.constructor.name === 'Object'));
}
/**
 * Returns whether `value` has no custom properties.
 *
 * @private
 * @internal
 */
function isEmpty(value) {
    return Object.keys(value).length === 0;
}
/**
 * Determines whether `value` is a JavaScript function.
 *
 * @private
 * @internal
 */
function isFunction(value) {
    return typeof value === 'function';
}
/**
 * Determines whether the provided error is considered permanent for the given
 * RPC.
 *
 * @private
 * @internal
 */
function isPermanentRpcError(err, methodName) {
    if (err.code !== undefined) {
        const retryCodes = getRetryCodes(methodName);
        return retryCodes.indexOf(err.code) === -1;
    }
    else {
        return false;
    }
}
let serviceConfig;
/**
 * Lazy-loads the service config when first accessed.
 * @private
 * @internal
 **/
function getServiceConfig(methodName) {
    if (!serviceConfig) {
        serviceConfig = require('google-gax/fallback').constructSettings('google.firestore.v1.Firestore', gapicConfig, {}, require('google-gax').Status);
    }
    return serviceConfig[methodName];
}
/**
 * Returns the list of retryable error codes specified in the service
 * configuration.
 * @private
 * @internal
 */
function getRetryCodes(methodName) {
    return getServiceConfig(methodName)?.retry?.retryCodes ?? [];
}
/**
 * Gets the total timeout in milliseconds from the retry settings in
 * the service config for the given RPC. If the total timeout is not
 * set, then `0` is returned.
 *
 * @private
 * @internal
 */
function getTotalTimeout(methodName) {
    return (getServiceConfig(methodName)?.retry?.backoffSettings?.totalTimeoutMillis ??
        0);
}
/**
 * Returns the backoff setting from the service configuration.
 * @private
 * @internal
 */
function getRetryParams(methodName) {
    return (getServiceConfig(methodName)?.retry?.backoffSettings ??
        require('google-gax/fallback').createDefaultBackoffSettings());
}
/**
 * Returns a promise with a void return type. The returned promise swallows all
 * errors and never throws.
 *
 * This is primarily used to wait for a promise to complete when the result of
 * the promise will be discarded.
 *
 * @private
 * @internal
 */
function silencePromise(promise) {
    return promise.then(() => { }, () => { });
}
/**
 * Wraps the provided error in a new error that includes the provided stack.
 *
 * Used to preserve stack traces across async calls.
 * @private
 * @internal
 */
function wrapError(err, stack) {
    err.stack += '\nCaused by: ' + stack;
    return err;
}
/**
 * Parses the value of the environment variable FIRESTORE_PREFER_REST, and
 * returns a value indicating if the environment variable enables or disables
 * preferRest.
 *
 * This function will warn to the console if the environment variable is set
 * to an unsupported value.
 *
 * @returns `true` if the environment variable enables `preferRest`,
 * `false` if the environment variable disables `preferRest`, or `undefined`
 * if the environment variable is not set or is set to an unsupported value.
 *
 * @internal
 * @private
 */
function tryGetPreferRestEnvironmentVariable() {
    const rawValue = process.env.FIRESTORE_PREFER_REST?.trim().toLowerCase();
    if (rawValue === undefined) {
        return undefined;
    }
    else if (rawValue === '1' || rawValue === 'true') {
        return true;
    }
    else if (rawValue === '0' || rawValue === 'false') {
        return false;
    }
    else {
        // eslint-disable-next-line no-console
        console.warn(`An unsupported value was specified for the environment variable FIRESTORE_PREFER_REST. Value ${rawValue} is unsupported.`);
        return undefined;
    }
}
/**
 * Returns an array of values that are calculated by performing the given `fn`
 * on all keys in the given `obj` dictionary.
 *
 * @private
 * @internal
 */
function mapToArray(obj, fn) {
    const result = [];
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result.push(fn(obj[key], key, obj));
        }
    }
    return result;
}
/**
 * Verifies equality for an array of objects using the `isEqual` interface.
 *
 * @private
 * @internal
 * @param left Array of objects supporting `isEqual`.
 * @param right Array of objects supporting `isEqual`.
 * @returns True if arrays are equal.
 */
function isArrayEqual(left, right) {
    if (left.length !== right.length) {
        return false;
    }
    for (let i = 0; i < left.length; ++i) {
        if (!left[i].isEqual(right[i])) {
            return false;
        }
    }
    return true;
}
/**
 * Verifies equality for an optional type using the `isEqual` interface.
 *
 * @private
 * @internal
 * @param left Optional object supporting `isEqual`.
 * @param right Optional object supporting `isEqual`.
 * @returns True if equal.
 */
function isOptionalEqual(left, right) {
    if (left === undefined && right === undefined) {
        return true;
    }
    if (left === undefined || right === undefined) {
        return false;
    }
    return left.isEqual(right);
}
/**
 * Verifies equality for an array of primitives.
 *
 * @private
 * @internal
 * @param left Array of primitives.
 * @param right Array of primitives.
 * @returns True if arrays are equal.
 */
function isPrimitiveArrayEqual(left, right) {
    if (left.length !== right.length) {
        return false;
    }
    for (let i = 0; i < left.length; ++i) {
        if (left[i] !== right[i]) {
            return false;
        }
    }
    return true;
}
function cast(val, constructor) {
    if (!constructor) {
        return val;
    }
    else if (val instanceof constructor) {
        return val;
    }
    throw new Error(`${val} not instance of ${constructor}`);
}
function forEach(obj, fn) {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn(key, obj[key]);
        }
    }
}
//# sourceMappingURL=util.js.map