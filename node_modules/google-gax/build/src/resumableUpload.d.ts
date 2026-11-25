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
/**
 * Resumable upload protocol support.
 *
 * This module implements the client-side state machine for the resumable
 * upload protocol used by Google APIs to transfer large payloads over
 * HTTP(S). The upload session is managed by a {@link ResumableUploadSession}
 * object, which is returned by GAPIC-generated client methods for resumable
 * upload RPCs.
 *
 * The protocol commands are sent through the `X-Goog-Upload-Command` header
 * and the payload is transferred in discrete chunks. Transient errors
 * (Category 1) are retried with exponential backoff, state mismatches
 * (Category 2) trigger a recovery phase that queries the server for the
 * committed byte offset, and everything else (Category 3) is fatal.
 */
import type { AuthClient, GoogleAuth } from 'google-auth-library';
import * as protobuf from 'protobufjs';
import { APICaller } from './apiCaller';
import { APICallback, GRPCCall, SimpleCallbackFunction } from './apitypes';
import { OngoingCall, OngoingCallPromise } from './call';
import { Descriptor } from './descriptor';
import { CallSettings, RetryOptions } from './gax';
import { GoogleError } from './googleError';
export declare const DEFAULT_CHUNK_SIZE: number;
export declare const DEFAULT_GLOBAL_DEADLINE_MS: number;
export declare const MAX_GLOBAL_DEADLINE_MS: number;
export declare const DEFAULT_MAX_INNER_RETRIES = 5;
export declare const DEFAULT_PER_REQUEST_TIMEOUT_MS: number;
export declare const DEFAULT_STALL_TIMEOUT_MS: number;
/** The possible states of a resumable upload session. */
export declare enum ResumableUploadState {
    /** The upload has not yet begun transmitting. */
    STARTING = "STARTING",
    /** The stream transfer is in progress. */
    TRANSMISSION = "TRANSMISSION",
    /** The transfer is complete, but we are waiting for confirmation. */
    FINALIZING = "FINALIZING",
    /** Recovery from an existing upload session URL. */
    RECOVERY = "RECOVERY"
}
/**
 * A seekable source of upload bytes.
 *
 * The upload session only accepts a `ResumableSource`, never a bare stream,
 * because recovery may need to open a new stream at the server-committed
 * byte offset. Callers that only have a non-seekable stream can wrap it in a
 * `ResumableSource` whose `getStream(offset)` throws when an offset other
 * than 0 is requested.
 */
export interface ResumableSource {
    /**
     * Generates a readable stream starting at the specified byte offset. If
     * `offset` is omitted or 0, the stream starts from the beginning.
     */
    getStream: (offset?: number) => NodeJS.ReadableStream | ReadableStream;
    /** Total byte length of the data. */
    size: number;
}
/** Progress reported to the `onProgress` callback. */
export interface ResumableUploadProgress {
    /** The number of bytes committed by the server so far. */
    bytesUploaded: number;
    /** The session URL, which can be saved and reused to resume the upload. */
    uploadUrl: string;
}
/**
 * Parameters accepted by {@link ResumableUploadSession.start}.
 */
export interface ResumableUploadStartParams {
    /**
     * Seekable source of the upload payload. The session may call
     * `getStream(offset)` again during recovery, so callers must not pass a
     * bare one-shot `Readable`.
     */
    uploadSource: ResumableSource;
    /**
     * Desired chunk size in bytes. The effective chunk size is rounded down to
     * a multiple of the server-provided chunk granularity.
     */
    chunkSize?: number;
    /**
     * Called after each committed chunk and after recovery queries. The return
     * value is reserved for future cancellation support and is not yet acted
     * on.
     */
    onProgress?: (status: ResumableUploadProgress) => boolean | void;
    /**
     * Reserved for headers that may accompany upload-phase data. Not yet
     * supported; passing a value is a compile-time error.
     */
    uploadHeaders?: never;
    /**
     * Session URL of a previous (possibly interrupted) upload session. When
     * provided, the `start` command is skipped and the upload enters the
     * recovery phase to determine the server-committed byte offset.
     */
    resumeUrl?: string;
    /**
     * Total size of the payload in bytes, if known. Used to scale the global
     * deadline for large payloads.
     */
    uploadSize?: number;
    /**
     * Override for the global deadline, in milliseconds. The deadline bounds
     * the entire upload session, including time spent waiting for data from
     * the upload source.
     */
    globalDeadlineMs?: number;
    /**
     * Headers that must only be sent with the initial `start` request (for
     * example, `developer-token`).
     */
    startHeaders?: {
        [name: string]: string;
    };
    /**
     * Reserved for checksum validation. Not yet supported; passing a value is
     * a compile-time error.
     */
    validationAlgorithm?: never;
    /**
     * Reserved for a user-supplied checksum. Not yet supported; passing a
     * value is a compile-time error.
     */
    providedChecksum?: never;
    /** Per-request timeout in milliseconds. Defaults to 60000. */
    timeout?: number;
    /**
     * Inactivity timeout, in milliseconds, for an in-flight upload/finalize
     * request. When no response arrives within this window, the request is
     * aborted and the session enters the recovery phase. Defaults to 15000.
     */
    stallTimeoutMs?: number;
    /**
     * Retry configuration for the inner (Category 1) retry loop. Pass `null`
     * to disable inner retries.
     */
    retry?: Partial<RetryOptions> | null;
}
/**
 * Internal context used to construct a {@link ResumableUploadSession}. This
 * is populated by GAPIC-generated client methods.
 */
export interface ResumableUploadContext {
    /** Authenticated client used for all HTTP requests. */
    auth: GoogleAuth | AuthClient;
    /** The hostname of the API service endpoint. */
    servicePath: string;
    /** The port of the API service endpoint. */
    servicePort: number | string;
    /** The protocol (usually `https`). */
    protocol: string;
    /** The protobuf method descriptor for the resumable upload RPC. */
    rpc: protobuf.Method;
    /** The initial metadata request for the `start` command. */
    request: {};
    /** The upload prefix to use for the `start` command endpoint. */
    uploadPrefix?: string;
    numericEnums?: boolean;
    minifyJson?: boolean;
    /** Default per-request timeout in milliseconds from CallSettings. */
    defaultTimeout?: number;
    /** Default retry options from CallSettings. */
    defaultRetry?: Partial<RetryOptions> | null;
    /** Default headers from CallSettings.otherArgs.headers for the start request. */
    defaultStartHeaders?: {
        [name: string]: string;
    };
}
/**
 * A no-op RPC stub used by GAPIC-generated resumable upload methods.
 * Resumable uploads perform their own HTTP requests through the
 * {@link ResumableUploadSession} object, so the stub passed to
 * `createApiCall` is never invoked.
 */
export declare const resumableUploadStub: GRPCCall;
/**
 * Descriptor that identifies a method as a resumable upload method and
 * provides the caller that constructs the {@link ResumableUploadSession}
 * object.
 */
export declare class ResumableUploadDescriptor implements Descriptor {
    uploadPrefix: string;
    constructor(uploadPrefix?: string);
    getApiCaller(): APICaller;
}
/**
 * API caller for resumable upload methods. The GAPIC method call resolves
 * with a {@link ResumableUploadSession} object; the actual upload state
 * machine is driven by {@link ResumableUploadSession.start}.
 */
export declare class ResumableUploadApiCaller implements APICaller {
    private descriptor;
    constructor(descriptor: ResumableUploadDescriptor);
    init(callback?: APICallback): OngoingCallPromise | OngoingCall;
    wrap(func: GRPCCall): GRPCCall;
    call(apiCall: SimpleCallbackFunction, argument: {}, settings: CallSettings, canceller: OngoingCallPromise): void;
    fail(canceller: OngoingCallPromise, err: GoogleError): void;
    result(canceller: OngoingCallPromise): import("./call").CancellablePromise<import("./apitypes").ResultTuple>;
}
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
export declare class ResumableUploadSession {
    private context;
    private params;
    private state_;
    private uploadUrl_;
    private committedBytes_;
    private startTimeMs;
    private globalDeadlineMs;
    private effectiveChunkSize_;
    private negotiatedGranularity_;
    private activeAbortController;
    private activeStream_;
    private activeIterator_;
    private deadlineTimer;
    private stallTimer;
    private canceled_;
    private started_;
    private done_;
    private finishedPromise_;
    private resolveFinished_;
    private rejectFinished_;
    constructor(context: ResumableUploadContext);
    /** The session URL, available once the upload session has been started. */
    get uploadUrl(): string | null;
    /** The current state of the upload session. */
    get state(): ResumableUploadState;
    /** The actual chunk size used for the session (granularity rounded). */
    get chunkSize(): number | null;
    /** The number of bytes the server has committed so far. */
    get committedBytes(): number;
    /**
     * Cancels the upload session, aborts any in-flight HTTP request, releases
     * the active upload source stream, and rejects the promise returned by
     * {@link ResumableUploadSession.finished}.
     */
    cancel(): void;
    /**
     * Starts the upload session and begins transmitting the source.
     *
     * The returned promise resolves once the upload session has been
     * established (either via the `start` command or via recovery from a
     * `resumeUrl`) and the transmission loop is running. Await
     * {@link ResumableUploadSession.finished} for the final response.
     */
    start(params: ResumableUploadStartParams): Promise<void>;
    /**
     * Returns a promise that resolves with the final RPC response when the
     * upload completes, or rejects if the upload fails or is cancelled.
     */
    finished(): Promise<{}>;
    /** Total payload size in bytes, preferring the explicit upload size. */
    private uploadSizeForDeadline;
    private computeGlobalDeadlineMs;
    private computeEffectiveChunkSize;
    private sendStart;
    /**
     * Builds the protocol/host/port prefix for upload endpoints, parsing a
     * `host:port` form from `servicePath` when present (matching the fallback
     * transport behavior).
     */
    private getEndpointBase;
    private queryOffset;
    private runTransmission;
    /**
     * Arms a watchdog timer that enforces the global deadline across the whole
     * session, including time spent waiting for data from the upload stream
     * (which the point-in-time {@link assertDeadline} checks cannot cover).
     */
    private armDeadlineTimer;
    private clearDeadlineTimer;
    private clearStallTimer;
    /**
     * Opens the current upload stream from the source at the given byte
     * offset, releasing any previously active stream first.
     */
    private openSourceAt;
    /**
     * Best-effort release of the active upload stream, so a transmission
     * loop blocked waiting for stream data does not stay subscribed forever.
     */
    private releaseActiveStream;
    private deadlineError;
    /**
     * Reads the next chunk of the requested size from the stream, aggregating
     * stream data events until the chunk is full or the stream ends.
     */
    private readNextChunk;
    /**
     * Discards `bytes` bytes from the active stream, returning any leftover
     * bytes from the chunk that crossed the boundary so they can be prepended
     * to the transmission buffer.
     */
    private skipBytes;
    /**
     * Transmits a chunk, applying the outer recovery loop when the server
     * reports a state mismatch (Category 2 error).
     */
    private transmitChunk;
    /**
     * Sends the `finalize` command, recovering from state mismatches by
     * re-querying the committed offset.
     */
    private transmitFinalize;
    private decodeFinalResponse;
    /**
     * Sends a single protocol command, retrying transient (Category 1) errors
     * with exponential backoff.
     */
    private sendCommandWithRetry;
    private fetchCommand;
    /**
     * Classifies the HTTP response status. Transient errors are thrown as
     * {@link TransientError}, state mismatches as {@link Category2Error}, and
     * everything else as {@link GoogleError} / {@link Category3Error}.
     */
    private throwOnNonTransientStatus;
    private throwFatalHttpResponse;
    private normalizeHeaders;
    private getPerRequestTimeoutMs;
    private getRetrySettings;
    private reportProgress;
    private assertActive;
    private assertDeadline;
}
