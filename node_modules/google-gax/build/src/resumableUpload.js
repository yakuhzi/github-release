"use strict";
/**
 * Copyright 2026 Google LLC
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumableUploadSession = exports.ResumableUploadApiCaller = exports.ResumableUploadDescriptor = exports.resumableUploadStub = exports.ResumableUploadState = exports.DEFAULT_STALL_TIMEOUT_MS = exports.DEFAULT_PER_REQUEST_TIMEOUT_MS = exports.DEFAULT_MAX_INNER_RETRIES = exports.MAX_GLOBAL_DEADLINE_MS = exports.DEFAULT_GLOBAL_DEADLINE_MS = exports.DEFAULT_CHUNK_SIZE = void 0;
const serializer = __importStar(require("proto3-json-serializer"));
const call_1 = require("./call");
const fallbackRest_1 = require("./fallbackRest");
const gax_1 = require("./gax");
const googleError_1 = require("./googleError");
const status_1 = require("./status");
const transcoding_1 = require("./transcoding");
exports.DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024;
exports.DEFAULT_GLOBAL_DEADLINE_MS = 10 * 60 * 1000;
exports.MAX_GLOBAL_DEADLINE_MS = 24 * 60 * 60 * 1000;
exports.DEFAULT_MAX_INNER_RETRIES = 5;
exports.DEFAULT_PER_REQUEST_TIMEOUT_MS = 60 * 1000;
exports.DEFAULT_STALL_TIMEOUT_MS = 15 * 1000;
// Assumed sustained upload throughput, in bytes per millisecond, used to
// scale the global deadline when `uploadSize` is provided (~5 MB/s).
const DEFAULT_UPLOAD_RATE_BYTES_PER_MS = 5 * 1024;
// Resumable upload protocol headers.
const UPLOAD_PROTOCOL_HEADER = 'x-goog-upload-protocol';
const UPLOAD_PROTOCOL_RESUMABLE = 'resumable';
const UPLOAD_COMMAND_HEADER = 'x-goog-upload-command';
const UPLOAD_OFFSET_HEADER = 'x-goog-upload-offset';
const UPLOAD_URL_HEADER = 'x-goog-upload-url';
const UPLOAD_STATUS_HEADER = 'x-goog-upload-status';
const UPLOAD_SIZE_RECEIVED_HEADER = 'x-goog-upload-size-received';
const UPLOAD_CHUNK_GRANULARITY_HEADER = 'x-goog-upload-chunk-granularity';
// Resumable upload protocol commands.
const COMMAND_START = 'start';
const COMMAND_UPLOAD = 'upload';
const COMMAND_QUERY = 'query';
const COMMAND_FINALIZE = 'finalize';
const COMMAND_CANCEL = 'cancel';
const COMMAND_UPLOAD_FINALIZE = 'upload, finalize';
// Category 1 errors are transient and can be retried without modification.
const CATEGORY_1_RETRY_CODES = new Set([408, 429, 500, 502, 503, 504]);
// Category 2 errors are state mismatches; recovery must query the server for
// the committed byte offset before retrying.
const CATEGORY_2_RETRY_CODES = new Set([400, 409, 412, 416]);
/** The possible states of a resumable upload session. */
var ResumableUploadState;
(function (ResumableUploadState) {
    /** The upload has not yet begun transmitting. */
    ResumableUploadState["STARTING"] = "STARTING";
    /** The stream transfer is in progress. */
    ResumableUploadState["TRANSMISSION"] = "TRANSMISSION";
    /** The transfer is complete, but we are waiting for confirmation. */
    ResumableUploadState["FINALIZING"] = "FINALIZING";
    /** Recovery from an existing upload session URL. */
    ResumableUploadState["RECOVERY"] = "RECOVERY";
})(ResumableUploadState || (exports.ResumableUploadState = ResumableUploadState = {}));
/** Transient error that should be retried (Category 1). */
class TransientError extends Error {
}
/** State mismatch error that triggers the recovery phase (Category 2). */
class Category2Error extends Error {
    httpStatusCode;
    constructor(message, httpStatusCode) {
        super(message);
        this.httpStatusCode = httpStatusCode;
        this.code = status_1.Status.FAILED_PRECONDITION;
    }
    code;
}
/** Fatal error that cannot be recovered from (Category 3). */
class Category3Error extends Error {
    constructor(message, httpStatusCode) {
        super(message);
        if (httpStatusCode !== undefined) {
            this.code = (0, status_1.rpcCodeFromHttpStatusCode)(httpStatusCode);
        }
    }
    code;
}
/** Raised when an in-flight request made no progress for too long. */
class StallError extends Error {
}
/**
 * Internal signal used to restart transmission from a server-committed
 * offset by opening a fresh stream from the `ResumableSource`.
 */
class RestartUploadError extends Error {
    offset;
    constructor(offset) {
        super(`Restarting the resumable upload transmission from byte ${offset}.`);
        this.offset = offset;
    }
}
function createGoogleError(message, code) {
    const err = new googleError_1.GoogleError(message);
    if (code !== undefined) {
        err.code = code;
    }
    return err;
}
/**
 * A no-op RPC stub used by GAPIC-generated resumable upload methods.
 * Resumable uploads perform their own HTTP requests through the
 * {@link ResumableUploadSession} object, so the stub passed to
 * `createApiCall` is never invoked.
 */
exports.resumableUploadStub = (() => {
    return { cancel() { } };
});
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function asBuffer(chunk) {
    if (Buffer.isBuffer(chunk)) {
        return chunk;
    }
    if (chunk instanceof Uint8Array) {
        return Buffer.from(chunk);
    }
    return Buffer.from(String(chunk));
}
function parseHeaderInt(value) {
    if (value === null || value === '') {
        return null;
    }
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
}
function parsePositiveHeaderInt(value) {
    const parsed = parseHeaderInt(value);
    return parsed === null || parsed <= 0 ? null : parsed;
}
/**
 * Descriptor that identifies a method as a resumable upload method and
 * provides the caller that constructs the {@link ResumableUploadSession}
 * object.
 */
class ResumableUploadDescriptor {
    uploadPrefix;
    constructor(uploadPrefix = '/resumable/upload') {
        this.uploadPrefix = uploadPrefix;
    }
    getApiCaller() {
        return new ResumableUploadApiCaller(this);
    }
}
exports.ResumableUploadDescriptor = ResumableUploadDescriptor;
/**
 * API caller for resumable upload methods. The GAPIC method call resolves
 * with a {@link ResumableUploadSession} object; the actual upload state
 * machine is driven by {@link ResumableUploadSession.start}.
 */
class ResumableUploadApiCaller {
    descriptor;
    constructor(descriptor) {
        this.descriptor = descriptor;
    }
    init(callback) {
        if (callback) {
            return new call_1.OngoingCall(callback);
        }
        return new call_1.OngoingCallPromise();
    }
    // The regular API call function is never invoked for resumable uploads;
    // the upload session performs its own HTTP requests.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    wrap(func) {
        return func;
    }
    call(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    apiCall, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    argument, settings, canceller) {
        const context = settings.resumableUpload;
        if (!context) {
            canceller.callback(createGoogleError('The resumable upload transport context was not provided. ' +
                'This is a bug in the generated client library.'));
            return;
        }
        const settingsStartHeaders = settings.otherArgs?.headers
            ? Object.fromEntries(Object.entries(settings.otherArgs.headers).map(([k, v]) => [
                k,
                String(v),
            ]))
            : undefined;
        const session = new ResumableUploadSession({
            ...context,
            uploadPrefix: context.uploadPrefix ??
                this.descriptor.uploadPrefix ??
                '/resumable/upload',
            defaultTimeout: context.defaultTimeout ?? settings.timeout,
            defaultRetry: context.defaultRetry !== undefined
                ? context.defaultRetry
                : settings.retry,
            defaultStartHeaders: settingsStartHeaders || context.defaultStartHeaders
                ? {
                    ...(settingsStartHeaders ?? {}),
                    ...(context.defaultStartHeaders ?? {}),
                }
                : undefined,
        });
        canceller.completed = true;
        canceller.callback(null, session);
    }
    fail(canceller, err) {
        canceller.callback(err);
    }
    result(canceller) {
        return canceller.promise;
    }
}
exports.ResumableUploadApiCaller = ResumableUploadApiCaller;
/**
 * Client-side state machine for the resumable upload protocol.
 *
 * A `ResumableUploadSession` object is returned by a GAPIC-generated client
 * method for a resumable upload RPC. The user calls
 * {@link ResumableUploadSession.start}
 * with a source and upload parameters, optionally supplies a `resumeUrl` from
 * a previous session, and awaits {@link ResumableUploadSession.finished} for the
 * final RPC response.
 */
class ResumableUploadSession {
    context;
    params = null;
    state_ = ResumableUploadState.STARTING;
    uploadUrl_ = null;
    committedBytes_ = 0;
    startTimeMs = 0;
    globalDeadlineMs = exports.DEFAULT_GLOBAL_DEADLINE_MS;
    effectiveChunkSize_ = exports.DEFAULT_CHUNK_SIZE;
    negotiatedGranularity_ = null;
    activeAbortController = null;
    activeStream_ = null;
    activeIterator_ = null;
    deadlineTimer = null;
    stallTimer = null;
    canceled_ = false;
    started_ = false;
    done_ = false;
    finishedPromise_;
    resolveFinished_;
    rejectFinished_;
    constructor(context) {
        this.context = context;
        this.finishedPromise_ = new Promise((resolve, reject) => {
            this.resolveFinished_ = resolve;
            this.rejectFinished_ = reject;
        });
    }
    /** The session URL, available once the upload session has been started. */
    get uploadUrl() {
        return this.uploadUrl_;
    }
    /** The current state of the upload session. */
    get state() {
        return this.state_;
    }
    /** The actual chunk size used for the session (granularity rounded). */
    get chunkSize() {
        return this.started_ ? this.effectiveChunkSize_ : null;
    }
    /** The number of bytes the server has committed so far. */
    get committedBytes() {
        return this.committedBytes_;
    }
    /**
     * Cancels the upload session, aborts any in-flight HTTP request, releases
     * the active upload source stream, and rejects the promise returned by
     * {@link ResumableUploadSession.finished}.
     */
    cancel() {
        if (this.canceled_ || this.done_) {
            return;
        }
        this.canceled_ = true;
        this.clearDeadlineTimer();
        this.clearStallTimer();
        if (this.uploadUrl_) {
            // Best-effort server-side cancellation of the session.
            const controller = new AbortController();
            this.context.auth
                .request({
                url: this.uploadUrl_,
                method: 'POST',
                headers: {
                    [UPLOAD_PROTOCOL_HEADER]: UPLOAD_PROTOCOL_RESUMABLE,
                    [UPLOAD_COMMAND_HEADER]: COMMAND_CANCEL,
                },
                signal: controller.signal,
                responseType: 'text',
                timeout: this.getPerRequestTimeoutMs(),
                validateStatus: () => true,
            })
                .catch(() => { });
        }
        this.activeAbortController?.abort();
        // Release the active upload source stream so the transmission loop does
        // not stay subscribed to it indefinitely (for example, when it is
        // stalled).
        this.releaseActiveStream();
        const err = createGoogleError('The resumable upload was cancelled.', status_1.Status.CANCELLED);
        this.rejectFinished_(err);
    }
    /**
     * Starts the upload session and begins transmitting the source.
     *
     * The returned promise resolves once the upload session has been
     * established (either via the `start` command or via recovery from a
     * `resumeUrl`) and the transmission loop is running. Await
     * {@link ResumableUploadSession.finished} for the final response.
     */
    async start(params) {
        if (this.started_) {
            throw createGoogleError('The resumable upload has already been started.');
        }
        if (this.canceled_) {
            throw createGoogleError('The resumable upload was cancelled.');
        }
        if (!params.uploadSource) {
            throw createGoogleError('uploadSource must be provided to start a resumable upload.');
        }
        this.params = params;
        this.started_ = true;
        this.startTimeMs = Date.now();
        this.globalDeadlineMs = this.computeGlobalDeadlineMs(params);
        this.armDeadlineTimer();
        let sessionUrl;
        let finalResponse;
        try {
            if (params.resumeUrl) {
                this.state_ = ResumableUploadState.RECOVERY;
                const queried = await this.queryOffset(params.resumeUrl);
                this.uploadUrl_ = params.resumeUrl;
                this.committedBytes_ = queried.offset;
                this.effectiveChunkSize_ = this.computeEffectiveChunkSize(params.chunkSize, queried.granularity);
                this.reportProgress();
                sessionUrl = params.resumeUrl;
                finalResponse = queried.finalResponse;
            }
            else {
                this.state_ = ResumableUploadState.STARTING;
                const started = await this.sendStart();
                sessionUrl = started.uploadUrl;
                this.uploadUrl_ = sessionUrl;
                this.effectiveChunkSize_ = this.computeEffectiveChunkSize(params.chunkSize, started.granularity);
                if (started.committedOffset !== undefined) {
                    this.committedBytes_ = started.committedOffset;
                    this.reportProgress();
                }
                finalResponse = started.finalResponse;
            }
        }
        catch (err) {
            // Session setup failed before transmission began; make sure awaiting
            // `finished()` does not hang forever.
            this.done_ = true;
            this.clearDeadlineTimer();
            this.rejectFinished_(err);
            throw err;
        }
        if (finalResponse !== undefined) {
            this.state_ = ResumableUploadState.FINALIZING;
            this.done_ = true;
            this.clearDeadlineTimer();
            this.resolveFinished_(finalResponse);
            return;
        }
        this.state_ = ResumableUploadState.TRANSMISSION;
        // The transmission loop runs in the background; `start()` resolves once
        // the session is established so the user can inspect `uploadUrl`.
        void this.runTransmission(sessionUrl);
    }
    /**
     * Returns a promise that resolves with the final RPC response when the
     * upload completes, or rejects if the upload fails or is cancelled.
     */
    finished() {
        return this.finishedPromise_;
    }
    /** Total payload size in bytes, preferring the explicit upload size. */
    uploadSizeForDeadline(params) {
        if (params.uploadSize !== undefined && params.uploadSize > 0) {
            return params.uploadSize;
        }
        return params.uploadSource.size > 0 ? params.uploadSource.size : 0;
    }
    computeGlobalDeadlineMs(params) {
        if (params.globalDeadlineMs !== undefined && params.globalDeadlineMs > 0) {
            return params.globalDeadlineMs;
        }
        let deadline = exports.DEFAULT_GLOBAL_DEADLINE_MS;
        const uploadSize = this.uploadSizeForDeadline(params);
        if (uploadSize > 0) {
            const scaled = Math.ceil(uploadSize / DEFAULT_UPLOAD_RATE_BYTES_PER_MS);
            deadline = Math.max(deadline, scaled);
        }
        return Math.min(deadline, exports.MAX_GLOBAL_DEADLINE_MS);
    }
    computeEffectiveChunkSize(chunkSize, granularity) {
        const requested = chunkSize ?? exports.DEFAULT_CHUNK_SIZE;
        if (!granularity || granularity <= 0) {
            return requested;
        }
        this.negotiatedGranularity_ = granularity;
        const effective = Math.floor(requested / granularity) * granularity;
        // Non-final chunks must be a multiple of the server granularity. If the
        // user's requested chunk size rounds down to zero, fall back to the
        // smallest legal chunk size.
        return effective > 0 ? effective : granularity;
    }
    async sendStart() {
        const rpc = this.context.rpc;
        if (!rpc.resolvedRequestType) {
            throw new Category3Error(`Cannot start resumable upload for method ${rpc.name}: ` +
                'the resolved request type is unavailable.');
        }
        const message = rpc.resolvedRequestType.fromObject(this.context.request);
        const json = serializer.toProto3JSON(message, {
            numericEnums: this.context.numericEnums ?? false,
        });
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
            throw new Category3Error(`Cannot serialize the request for resumable upload method ${rpc.name}.`);
        }
        let queryString = '';
        let transcodedPath = '';
        let bodyPayload = json;
        try {
            const transcoded = (0, transcoding_1.transcode)(json, rpc.parsedOptions);
            if (transcoded) {
                queryString = transcoded.queryString ?? '';
                transcodedPath = transcoded.url
                    ? transcoded.url.replace(/^\/?/, '/')
                    : '';
                bodyPayload = transcoded.data === '' ? {} : transcoded.data;
            }
        }
        catch {
            // The method may not have a google.api.http rule; the request body is
            // still sent as proto JSON to the upload endpoint.
        }
        if (this.context.numericEnums) {
            queryString = `${queryString ? `${queryString}&` : ''}$alt=json%3Benum-encoding=int`;
        }
        if (this.context.minifyJson) {
            queryString = `${queryString ? `${queryString}&` : ''}$prettyPrint=0`;
        }
        const uploadPrefix = (this.context.uploadPrefix ?? '/resumable/upload').replace(/\/$/, '');
        const url = `${this.getEndpointBase()}${uploadPrefix}${transcodedPath}${queryString ? `?${queryString}` : ''}`;
        const body = JSON.stringify(bodyPayload);
        const knownSize = this.params ? this.uploadSizeForDeadline(this.params) : 0;
        const startHeaders = {
            'content-type': 'application/json',
            ...(knownSize > 0
                ? { 'x-goog-upload-header-content-length': String(knownSize) }
                : {}),
            ...(this.context.defaultStartHeaders ?? {}),
            ...(this.params?.startHeaders ?? {}),
        };
        const response = await this.sendCommandWithRetry(url, COMMAND_START, body, -1, startHeaders);
        const uploadUrl = response.headers.get(UPLOAD_URL_HEADER);
        if (!uploadUrl) {
            throw new Category3Error('The resumable upload start response did not include a ' +
                `${UPLOAD_URL_HEADER} header.`);
        }
        const granularity = parsePositiveHeaderInt(response.headers.get(UPLOAD_CHUNK_GRANULARITY_HEADER));
        // A successful start normally includes X-Goog-Upload-Status. If it is
        // missing, the session was still created: reconcile with a query and
        // resume from the server-committed offset instead of failing.
        if (response.headers.get(UPLOAD_STATUS_HEADER) === null) {
            this.state_ = ResumableUploadState.RECOVERY;
            const queried = await this.queryOffset(uploadUrl);
            return {
                uploadUrl,
                granularity: granularity ?? queried.granularity,
                committedOffset: queried.offset,
                finalResponse: queried.finalResponse,
            };
        }
        return { uploadUrl, granularity };
    }
    /**
     * Builds the protocol/host/port prefix for upload endpoints, parsing a
     * `host:port` form from `servicePath` when present (matching the fallback
     * transport behavior).
     */
    getEndpointBase() {
        let servicePath = this.context.servicePath;
        let servicePort = this.context.servicePort;
        const match = servicePath.match(/^(\[[^\]]+\]|[^:]+):(\d+)$/);
        if (match) {
            servicePath = match[1];
            servicePort = parseInt(match[2], 10);
        }
        return `${this.context.protocol}://${servicePath}:${servicePort}`;
    }
    async queryOffset(sessionUrl) {
        this.state_ = ResumableUploadState.RECOVERY;
        const response = await this.sendCommandWithRetry(sessionUrl, COMMAND_QUERY, null, -1, undefined);
        if (response.status < 200 || response.status >= 300) {
            throw new Category3Error(`Resumable upload recovery query failed: HTTP ${response.status}.`, response.status);
        }
        const uploadStatus = response.headers.get(UPLOAD_STATUS_HEADER);
        const size = parseHeaderInt(response.headers.get(UPLOAD_SIZE_RECEIVED_HEADER));
        const granularity = parsePositiveHeaderInt(response.headers.get(UPLOAD_CHUNK_GRANULARITY_HEADER));
        if (uploadStatus === 'final') {
            const finalResponse = this.decodeFinalResponse(response);
            const offset = size ??
                (this.params ? this.uploadSizeForDeadline(this.params) : 0) ??
                this.committedBytes_;
            return { offset, granularity, finalResponse };
        }
        if (size === null) {
            throw new Category3Error('The resumable upload recovery query did not include a ' +
                `${UPLOAD_SIZE_RECEIVED_HEADER} header.`);
        }
        return { offset: size, granularity };
    }
    async runTransmission(sessionUrl) {
        try {
            // Annotated rather than inferred: Buffer.alloc() narrows to
            // Buffer<ArrayBuffer>, while the remainder returned by readNextChunk()
            // and skipBytes() is the wider Buffer<ArrayBufferLike>.
            let buffer = Buffer.alloc(0);
            let offset = this.committedBytes_;
            let response = null;
            await this.openSourceAt(offset);
            // eslint-disable-next-line no-constant-condition
            while (true) {
                this.assertActive();
                this.assertDeadline();
                const read = await this.readNextChunk(buffer);
                buffer = read.remainder;
                if (read.chunk === null) {
                    // EOF with no pending bytes: either the stream was empty or the
                    // payload ended exactly on a chunk boundary. Send the finalize
                    // command on its own.
                    this.state_ = ResumableUploadState.FINALIZING;
                    response = await this.transmitFinalize(sessionUrl, offset);
                    break;
                }
                const transmit = await this.transmitChunk(sessionUrl, read.chunk, offset, read.eof);
                offset = transmit.newOffset;
                if (!transmit.recoveredFinal) {
                    this.committedBytes_ = offset;
                    this.reportProgress();
                }
                if (transmit.skipAhead > 0) {
                    if (buffer.length >= transmit.skipAhead) {
                        buffer = buffer.subarray(transmit.skipAhead);
                    }
                    else {
                        buffer = await this.skipBytes(transmit.skipAhead - buffer.length);
                    }
                }
                if (transmit.finalized) {
                    response = transmit.response;
                    break;
                }
            }
            if (this.state_ !== ResumableUploadState.FINALIZING) {
                this.state_ = ResumableUploadState.FINALIZING;
            }
            if (response === null) {
                throw new Category3Error('The resumable upload completed without a final response.');
            }
            this.done_ = true;
            this.clearDeadlineTimer();
            this.resolveFinished_(response);
        }
        catch (err) {
            if (err instanceof RestartUploadError) {
                // The server reported an offset that is not covered by the local
                // buffer. Re-open the source at the committed offset and continue.
                try {
                    this.committedBytes_ = err.offset;
                    this.state_ = ResumableUploadState.TRANSMISSION;
                    // Restart the transmission loop from the new offset.
                    await this.runTransmission(sessionUrl);
                    return;
                }
                catch (restartErr) {
                    if (!this.canceled_) {
                        this.done_ = true;
                        this.clearDeadlineTimer();
                        this.rejectFinished_(restartErr);
                    }
                    return;
                }
            }
            if (!this.canceled_) {
                this.done_ = true;
                this.clearDeadlineTimer();
                this.rejectFinished_(err);
            }
        }
        finally {
            this.releaseActiveStream();
        }
    }
    /**
     * Arms a watchdog timer that enforces the global deadline across the whole
     * session, including time spent waiting for data from the upload stream
     * (which the point-in-time {@link assertDeadline} checks cannot cover).
     */
    armDeadlineTimer() {
        this.clearDeadlineTimer();
        this.deadlineTimer = setTimeout(() => {
            if (this.canceled_ || this.done_) {
                return;
            }
            // Abort any in-flight request and release the stream so the
            // transmission loop terminates instead of remaining suspended.
            this.activeAbortController?.abort();
            this.clearStallTimer();
            this.releaseActiveStream();
            this.done_ = true;
            this.rejectFinished_(this.deadlineError());
        }, this.globalDeadlineMs);
    }
    clearDeadlineTimer() {
        if (this.deadlineTimer) {
            clearTimeout(this.deadlineTimer);
            this.deadlineTimer = null;
        }
    }
    clearStallTimer() {
        if (this.stallTimer) {
            clearTimeout(this.stallTimer);
            this.stallTimer = null;
        }
    }
    /**
     * Opens the current upload stream from the source at the given byte
     * offset, releasing any previously active stream first.
     */
    async openSourceAt(offset) {
        const source = this.params?.uploadSource;
        if (!source) {
            throw createGoogleError('Cannot open the upload source because start() was not called.');
        }
        this.releaseActiveStream();
        const stream = source.getStream(offset);
        this.activeStream_ = stream;
        this.activeIterator_ = stream[Symbol.asyncIterator]();
    }
    /**
     * Best-effort release of the active upload stream, so a transmission
     * loop blocked waiting for stream data does not stay subscribed forever.
     */
    releaseActiveStream() {
        if (this.activeStream_) {
            this.activeStream_.destroy?.();
            this.activeStream_ = null;
            this.activeIterator_ = null;
        }
    }
    deadlineError() {
        return createGoogleError('The resumable upload exceeded its global deadline of ' +
            `${this.globalDeadlineMs} ms.`, status_1.Status.DEADLINE_EXCEEDED);
    }
    /**
     * Reads the next chunk of the requested size from the stream, aggregating
     * stream data events until the chunk is full or the stream ends.
     */
    async readNextChunk(buffer) {
        const iterator = this.activeIterator_;
        if (!iterator) {
            throw createGoogleError('Cannot read from the upload source because it is not open.');
        }
        const chunkSize = this.effectiveChunkSize_;
        while (buffer.length < chunkSize) {
            const next = await iterator.next();
            if (next.done) {
                if (buffer.length === 0) {
                    return { chunk: null, eof: true, remainder: Buffer.alloc(0) };
                }
                return { chunk: buffer, eof: true, remainder: Buffer.alloc(0) };
            }
            buffer = Buffer.concat([buffer, asBuffer(next.value)]);
        }
        const chunk = buffer.subarray(0, chunkSize);
        return { chunk, eof: false, remainder: buffer.subarray(chunkSize) };
    }
    /**
     * Discards `bytes` bytes from the active stream, returning any leftover
     * bytes from the chunk that crossed the boundary so they can be prepended
     * to the transmission buffer.
     */
    async skipBytes(bytes) {
        const iterator = this.activeIterator_;
        if (!iterator) {
            throw createGoogleError('Cannot skip the upload source because it is not open.');
        }
        let remaining = bytes;
        while (remaining > 0) {
            const next = await iterator.next();
            if (next.done) {
                throw new Category3Error(`The server committed ${bytes} bytes beyond the end of the ` +
                    'provided stream; the payload appears shorter than expected.');
            }
            const chunk = asBuffer(next.value);
            if (chunk.length >= remaining) {
                return chunk.subarray(remaining);
            }
            remaining -= chunk.length;
        }
        return Buffer.alloc(0);
    }
    /**
     * Transmits a chunk, applying the outer recovery loop when the server
     * reports a state mismatch (Category 2 error).
     */
    async transmitChunk(sessionUrl, chunk, offset, isFinal) {
        let currentChunk = chunk;
        let currentOffset = offset;
        const retry = this.getRetrySettings();
        let sameOffsetAttempts = 0;
        let sameOffsetDelay = retry.initialDelayMs;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            this.assertActive();
            this.assertDeadline();
            const command = isFinal ? COMMAND_UPLOAD_FINALIZE : COMMAND_UPLOAD;
            try {
                const response = await this.sendCommandWithRetry(sessionUrl, command, currentChunk, currentOffset, undefined);
                if (isFinal) {
                    if (response.headers.get(UPLOAD_STATUS_HEADER) !== 'final') {
                        throw new Category2Error('The resumable upload finalize response did not include ' +
                            `${UPLOAD_STATUS_HEADER}: final.`);
                    }
                    return {
                        finalized: true,
                        response: this.decodeFinalResponse(response),
                        newOffset: currentOffset + currentChunk.length,
                        skipAhead: 0,
                    };
                }
                return {
                    finalized: false,
                    response: null,
                    newOffset: currentOffset + currentChunk.length,
                    skipAhead: 0,
                };
            }
            catch (err) {
                const recoverable = err instanceof Category2Error || err instanceof StallError;
                if (!recoverable) {
                    throw err;
                }
                // Outer recovery: query the server for the exact committed offset,
                // align the local state, and re-enter the transmission phase.
                this.state_ = ResumableUploadState.RECOVERY;
                const prevEffectiveChunkSize = this.effectiveChunkSize_;
                const queried = await this.queryOffset(sessionUrl);
                if (queried.granularity !== null && queried.granularity > 0) {
                    this.effectiveChunkSize_ = this.computeEffectiveChunkSize(this.params?.chunkSize, queried.granularity);
                }
                const chunkSizeChanged = this.effectiveChunkSize_ !== prevEffectiveChunkSize;
                const serverOffset = queried.offset;
                this.committedBytes_ = serverOffset;
                this.reportProgress();
                if (queried.finalResponse !== undefined) {
                    this.state_ = ResumableUploadState.FINALIZING;
                    return {
                        finalized: true,
                        response: queried.finalResponse,
                        newOffset: serverOffset,
                        skipAhead: 0,
                        recoveredFinal: true,
                    };
                }
                this.state_ = ResumableUploadState.TRANSMISSION;
                if (err instanceof StallError) {
                    // A stalled request may have committed any number of bytes; the
                    // safest recovery is to re-open the source at the committed offset.
                    throw new RestartUploadError(serverOffset);
                }
                if (serverOffset === currentOffset) {
                    // If the recovery query negotiated a different effective chunk size
                    // or the chunk currently in flight is not a multiple of the
                    // negotiated granularity, restart from the server offset so the
                    // source is re-read with an aligned chunk size.
                    if (!isFinal &&
                        (chunkSizeChanged ||
                            (this.negotiatedGranularity_ !== null &&
                                currentChunk.length % this.negotiatedGranularity_ !== 0))) {
                        throw new RestartUploadError(serverOffset);
                    }
                    // Nothing was committed; apply retry limit and backoff before
                    // retrying the same chunk so a persistent Category 2 error does not
                    // spin in a tight 0ms loop.
                    if (sameOffsetAttempts >= retry.maxRetries) {
                        throw createGoogleError(`Exceeded the maximum number of recovery retries (${retry.maxRetries}) ` +
                            `without forward progress at byte offset ${currentOffset}: ` +
                            `${err.message}`, status_1.Status.DEADLINE_EXCEEDED);
                    }
                    this.assertDeadline();
                    await sleep(sameOffsetDelay);
                    sameOffsetDelay = Math.min(sameOffsetDelay * retry.delayMultiplier, retry.maxDelayMs);
                    sameOffsetAttempts += 1;
                    continue;
                }
                if (serverOffset > currentOffset) {
                    if (serverOffset === currentOffset + currentChunk.length) {
                        // The chunk was committed but the response was lost.
                        if (isFinal) {
                            const finalResponse = await this.transmitFinalize(sessionUrl, serverOffset);
                            return {
                                finalized: true,
                                response: finalResponse,
                                newOffset: serverOffset,
                                skipAhead: 0,
                            };
                        }
                        return {
                            finalized: false,
                            response: null,
                            newOffset: serverOffset,
                            skipAhead: 0,
                        };
                    }
                    if (serverOffset > currentOffset + currentChunk.length) {
                        // The server is ahead of the local state; skip the stream forward
                        // by the number of bytes already committed.
                        if (isFinal) {
                            // The final chunk was already committed; retrieve the response
                            // by sending the finalize command on its own.
                            const finalResponse = await this.transmitFinalize(sessionUrl, serverOffset);
                            return {
                                finalized: true,
                                response: finalResponse,
                                newOffset: serverOffset,
                                skipAhead: 0,
                            };
                        }
                        return {
                            finalized: false,
                            response: null,
                            newOffset: serverOffset,
                            skipAhead: serverOffset - (currentOffset + currentChunk.length),
                        };
                    }
                    // The server committed part of this chunk; retransmit the tail if
                    // it remains aligned to the negotiated granularity, or restart from
                    // the server offset otherwise.
                    const tail = currentChunk.subarray(serverOffset - currentOffset);
                    if (!isFinal &&
                        (chunkSizeChanged ||
                            (this.negotiatedGranularity_ !== null &&
                                tail.length % this.negotiatedGranularity_ !== 0))) {
                        throw new RestartUploadError(serverOffset);
                    }
                    currentChunk = tail;
                    currentOffset = serverOffset;
                    sameOffsetAttempts = 0;
                    sameOffsetDelay = retry.initialDelayMs;
                    continue;
                }
                // The server is behind the local state: restart the stream from the
                // server-committed offset so outgoing chunks respect chunkSize and
                // granularity alignment.
                throw new RestartUploadError(serverOffset);
            }
        }
    }
    /**
     * Sends the `finalize` command, recovering from state mismatches by
     * re-querying the committed offset.
     */
    async transmitFinalize(sessionUrl, offset) {
        let currentOffset = offset;
        const retry = this.getRetrySettings();
        let sameOffsetAttempts = 0;
        let sameOffsetDelay = retry.initialDelayMs;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            this.assertActive();
            this.assertDeadline();
            try {
                const response = await this.sendCommandWithRetry(sessionUrl, COMMAND_FINALIZE, null, currentOffset, undefined);
                if (response.headers.get(UPLOAD_STATUS_HEADER) !== 'final') {
                    throw new Category2Error('The resumable upload finalize response did not include ' +
                        `${UPLOAD_STATUS_HEADER}: final.`);
                }
                return this.decodeFinalResponse(response);
            }
            catch (err) {
                const recoverable = err instanceof Category2Error || err instanceof StallError;
                if (!recoverable) {
                    throw err;
                }
                this.state_ = ResumableUploadState.RECOVERY;
                const queried = await this.queryOffset(sessionUrl);
                if (queried.granularity !== null && queried.granularity > 0) {
                    this.effectiveChunkSize_ = this.computeEffectiveChunkSize(this.params?.chunkSize, queried.granularity);
                }
                const serverOffset = queried.offset;
                this.committedBytes_ = serverOffset;
                this.reportProgress();
                if (queried.finalResponse !== undefined) {
                    this.state_ = ResumableUploadState.FINALIZING;
                    return queried.finalResponse;
                }
                this.state_ = ResumableUploadState.FINALIZING;
                if (err instanceof StallError) {
                    throw new RestartUploadError(serverOffset);
                }
                if (serverOffset >= currentOffset) {
                    if (serverOffset === currentOffset) {
                        if (sameOffsetAttempts >= retry.maxRetries) {
                            throw createGoogleError(`Exceeded the maximum number of recovery retries (${retry.maxRetries}) ` +
                                `while finalizing at byte offset ${currentOffset}: ` +
                                `${err.message}`, status_1.Status.DEADLINE_EXCEEDED);
                        }
                        this.assertDeadline();
                        await sleep(sameOffsetDelay);
                        sameOffsetDelay = Math.min(sameOffsetDelay * retry.delayMultiplier, retry.maxDelayMs);
                        sameOffsetAttempts += 1;
                    }
                    else {
                        sameOffsetAttempts = 0;
                        sameOffsetDelay = retry.initialDelayMs;
                    }
                    currentOffset = serverOffset;
                    continue;
                }
                throw new RestartUploadError(serverOffset);
            }
        }
    }
    decodeFinalResponse(response) {
        try {
            return (0, fallbackRest_1.decodeResponse)(this.context.rpc, true, response.body);
        }
        catch (err) {
            throw new Category3Error(`Failed to decode the resumable upload final response: ${err.message}`);
        }
    }
    /**
     * Sends a single protocol command, retrying transient (Category 1) errors
     * with exponential backoff.
     */
    async sendCommandWithRetry(url, command, body, offset, extraHeaders) {
        const retry = this.getRetrySettings();
        let attempt = 0;
        let delay = retry.initialDelayMs;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                return await this.fetchCommand(url, command, body, offset, extraHeaders);
            }
            catch (err) {
                if (this.canceled_) {
                    throw createGoogleError('The resumable upload was cancelled.', status_1.Status.CANCELLED);
                }
                if (err instanceof Category2Error ||
                    err instanceof Category3Error ||
                    err instanceof googleError_1.GoogleError) {
                    throw err;
                }
                if (!(err instanceof TransientError)) {
                    throw err;
                }
                if (attempt >= retry.maxRetries) {
                    throw createGoogleError(`Exceeded the maximum number of retries (${retry.maxRetries}) ` +
                        `while sending the resumable upload command "${command}": ` +
                        `${err.message}`, status_1.Status.DEADLINE_EXCEEDED);
                }
                this.assertDeadline();
                await sleep(delay);
                delay = Math.min(delay * retry.delayMultiplier, retry.maxDelayMs);
                attempt += 1;
            }
        }
    }
    async fetchCommand(url, command, body, offset, extraHeaders) {
        const headers = {
            [UPLOAD_PROTOCOL_HEADER]: UPLOAD_PROTOCOL_RESUMABLE,
            [UPLOAD_COMMAND_HEADER]: command,
        };
        const requiresOffset = body !== null ||
            command === COMMAND_UPLOAD ||
            command === COMMAND_UPLOAD_FINALIZE ||
            command === COMMAND_FINALIZE;
        if (requiresOffset && offset >= 0) {
            headers[UPLOAD_OFFSET_HEADER] = String(offset);
        }
        if (command === COMMAND_START) {
            headers['content-type'] = 'application/json';
        }
        else if (body !== null) {
            headers['content-type'] = 'application/octet-stream';
        }
        if (extraHeaders) {
            for (const [name, value] of Object.entries(extraHeaders)) {
                headers[name.toLowerCase()] = value;
            }
        }
        const controller = new AbortController();
        this.activeAbortController = controller;
        let stalled = false;
        const isTransferRequest = command === COMMAND_UPLOAD ||
            command === COMMAND_UPLOAD_FINALIZE ||
            command === COMMAND_FINALIZE;
        if (isTransferRequest) {
            this.clearStallTimer();
            this.stallTimer = setTimeout(() => {
                stalled = true;
                controller.abort(new Error('Resumable upload stalled.'));
            }, this.params?.stallTimeoutMs ?? exports.DEFAULT_STALL_TIMEOUT_MS);
        }
        try {
            // Mirror the fetch behavior used by the REST fallback transport:
            // `responseType: 'stream'` returns a Response-like object with access
            // to status, headers, and the body. `validateStatus` is disabled so
            // error statuses can be classified as Category 1/2/3 by the state
            // machine instead of being rejected by gaxios.
            const response = (await this.context.auth.request({
                url,
                method: 'POST',
                headers,
                body: body === null || body === undefined
                    ? undefined
                    : typeof body === 'string'
                        ? body
                        : Buffer.from(body),
                signal: controller.signal,
                responseType: 'stream',
                timeout: this.getPerRequestTimeoutMs(),
                validateStatus: () => true,
            }));
            const responseBody = Buffer.from(await response.arrayBuffer());
            const uploadResponse = {
                status: response.status,
                headers: this.normalizeHeaders(response.headers),
                body: responseBody,
            };
            this.throwOnNonTransientStatus(uploadResponse, command);
            return uploadResponse;
        }
        catch (err) {
            if (this.canceled_) {
                throw createGoogleError('The resumable upload was cancelled.', status_1.Status.CANCELLED);
            }
            if (stalled) {
                throw new StallError('The resumable upload request stalled: no progress was made within ' +
                    `${this.params?.stallTimeoutMs ?? exports.DEFAULT_STALL_TIMEOUT_MS} ms.`);
            }
            if (err instanceof Category2Error ||
                err instanceof Category3Error ||
                err instanceof googleError_1.GoogleError ||
                err instanceof TransientError) {
                throw err;
            }
            throw new TransientError(err instanceof Error ? err.message : String(err));
        }
        finally {
            this.clearStallTimer();
            if (this.activeAbortController === controller) {
                this.activeAbortController = null;
            }
        }
    }
    /**
     * Classifies the HTTP response status. Transient errors are thrown as
     * {@link TransientError}, state mismatches as {@link Category2Error}, and
     * everything else as {@link GoogleError} / {@link Category3Error}.
     */
    throwOnNonTransientStatus(response, command) {
        const uploadStatus = response.headers.get(UPLOAD_STATUS_HEADER);
        if (response.status >= 200 && response.status < 300) {
            if (uploadStatus === null) {
                if (this.state_ === ResumableUploadState.RECOVERY) {
                    // During a recovery query there is no offset to reconcile, so a
                    // missing status header is fatal.
                    throw new Category3Error(`The resumable upload ${command} response did not include a ` +
                        `${UPLOAD_STATUS_HEADER} header while in recovery.`);
                }
                if (command === COMMAND_START) {
                    if (response.headers.get(UPLOAD_URL_HEADER)) {
                        // The start handler reconciles via the returned session URL.
                        return;
                    }
                    throw new TransientError('The resumable upload start response did not include ' +
                        `${UPLOAD_STATUS_HEADER} or ${UPLOAD_URL_HEADER} headers.`);
                }
                // A missing status header on a starting/transmission/finalizing
                // response is a recoverable state mismatch.
                if (this.state_ === ResumableUploadState.STARTING ||
                    this.state_ === ResumableUploadState.TRANSMISSION ||
                    this.state_ === ResumableUploadState.FINALIZING) {
                    throw new Category2Error('The resumable upload response did not include a ' +
                        `${UPLOAD_STATUS_HEADER} header.`);
                }
                throw new Category3Error(`The resumable upload ${command} response did not include a ` +
                    `${UPLOAD_STATUS_HEADER} header.`);
            }
            return;
        }
        // If the server returns X-Goog-Upload-Status: final on a non-2xx response,
        // the upload session has been terminated by the server and cannot be
        // retried or recovered via query.
        if (uploadStatus === 'final') {
            this.throwFatalHttpResponse(response);
        }
        if (CATEGORY_2_RETRY_CODES.has(response.status)) {
            if (command === COMMAND_UPLOAD ||
                command === COMMAND_UPLOAD_FINALIZE ||
                command === COMMAND_FINALIZE) {
                throw new Category2Error(`Resumable upload state mismatch: HTTP ${response.status}.`, response.status);
            }
            if (command === COMMAND_START && uploadStatus === null) {
                throw new TransientError(`Resumable upload transient error: HTTP ${response.status}.`);
            }
        }
        if (CATEGORY_1_RETRY_CODES.has(response.status)) {
            throw new TransientError(`Resumable upload transient error: HTTP ${response.status}.`);
        }
        this.throwFatalHttpResponse(response);
    }
    throwFatalHttpResponse(response) {
        try {
            (0, fallbackRest_1.decodeResponse)(this.context.rpc, false, response.body, response.status);
        }
        catch (err) {
            if (err instanceof googleError_1.GoogleError) {
                if (err.code === undefined) {
                    err.code = (0, status_1.rpcCodeFromHttpStatusCode)(response.status);
                }
                throw err;
            }
        }
        throw createGoogleError(`Resumable upload failed: HTTP ${response.status}.`, (0, status_1.rpcCodeFromHttpStatusCode)(response.status));
    }
    normalizeHeaders(headers) {
        if (headers && typeof headers.get === 'function') {
            return headers;
        }
        const map = new Map();
        if (headers && typeof headers === 'object') {
            for (const [name, value] of Object.entries(headers)) {
                map.set(name.toLowerCase(), String(value));
            }
        }
        return {
            get(name) {
                return map.get(name.toLowerCase()) ?? null;
            },
        };
    }
    getPerRequestTimeoutMs() {
        return (this.params?.timeout ??
            this.context.defaultTimeout ??
            exports.DEFAULT_PER_REQUEST_TIMEOUT_MS);
    }
    getRetrySettings() {
        const retry = this.params?.retry !== undefined
            ? this.params.retry
            : this.context.defaultRetry;
        if (retry === null) {
            return {
                maxRetries: 0,
                initialDelayMs: 100,
                delayMultiplier: 1.3,
                maxDelayMs: 60000,
            };
        }
        const backoffSettings = retry?.backoffSettings ?? (0, gax_1.createDefaultBackoffSettings)();
        return {
            maxRetries: backoffSettings.maxRetries ?? exports.DEFAULT_MAX_INNER_RETRIES,
            initialDelayMs: backoffSettings.initialRetryDelayMillis ?? 100,
            delayMultiplier: backoffSettings.retryDelayMultiplier ?? 1.3,
            maxDelayMs: backoffSettings.maxRetryDelayMillis ?? 60000,
        };
    }
    reportProgress() {
        if (this.params?.onProgress && this.uploadUrl_) {
            this.params.onProgress({
                bytesUploaded: this.committedBytes_,
                uploadUrl: this.uploadUrl_,
            });
        }
    }
    assertActive() {
        if (this.canceled_) {
            throw createGoogleError('The resumable upload was cancelled.', status_1.Status.CANCELLED);
        }
    }
    assertDeadline() {
        if (Date.now() - this.startTimeMs >= this.globalDeadlineMs) {
            throw this.deadlineError();
        }
    }
}
exports.ResumableUploadSession = ResumableUploadSession;
//# sourceMappingURL=resumableUpload.js.map