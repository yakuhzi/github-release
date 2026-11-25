"use strict";
/**
 * @license
 * Copyright 2018 Google LLC
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
exports.RequestError = void 0;
exports.teenyRequest = teenyRequest;
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const stream_1 = require("stream");
const zlib = __importStar(require("zlib"));
const agents_1 = require("./agents");
const TeenyStatistics_1 = require("./TeenyStatistics");
const crypto_1 = require("crypto");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const streamEvents = require('stream-events');
const MAX_REDIRECTS = 20;
const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
function bunFetch(url, init = {}, redirectCount = 0) {
    const urlStr = String(url);
    const parsedUrl = new URL(urlStr);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;
    const headers = {};
    if (init.headers) {
        if (typeof globalThis.Headers !== 'undefined' &&
            init.headers instanceof globalThis.Headers) {
            for (const [k, v] of init.headers.entries()) {
                headers[k] = v;
            }
        }
        else if (Array.isArray(init.headers)) {
            for (const [k, v] of init.headers) {
                headers[k] = v;
            }
        }
        else if (typeof init.headers
            .entries === 'function') {
            for (const [k, v] of init.headers.entries()) {
                headers[k] = v;
            }
        }
        else {
            for (const [k, v] of Object.entries(init.headers)) {
                if (v !== undefined) {
                    headers[k] = String(v);
                }
            }
        }
    }
    if (init.compress !== false) {
        const hasAcceptEncoding = Object.keys(headers).some(k => k.toLowerCase() === 'accept-encoding');
        if (!hasAcceptEncoding) {
            headers['Accept-Encoding'] = 'gzip,deflate';
        }
    }
    const reqOptions = {
        protocol: parsedUrl.protocol,
        proto: isHttps ? 'https' : 'http',
        method: init.method || 'GET',
        hostname: parsedUrl.hostname.replace(/^\[|\]$/g, ''),
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: (parsedUrl.pathname || '/') + parsedUrl.search,
        headers,
        agent: init.agent,
    };
    return new Promise((resolve, reject) => {
        let timedOut = false;
        let activeIncoming;
        let activeResponseStream;
        let timeoutId;
        const clearReqTimeout = () => {
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
                timeoutId = undefined;
            }
        };
        const onTimeout = () => {
            if (timedOut) {
                return;
            }
            timedOut = true;
            clearReqTimeout();
            const timeoutErr = Object.assign(new Error(`network timeout at: ${urlStr}`), {
                name: 'AbortError',
                type: 'request-timeout',
                code: 'ETIMEDOUT',
            });
            activeIncoming?.destroy(timeoutErr);
            activeResponseStream?.destroy(timeoutErr);
            req.destroy();
            reject(timeoutErr);
        };
        const resetReqTimeout = () => {
            if (init.timeout) {
                clearReqTimeout();
                timeoutId = setTimeout(onTimeout, init.timeout);
            }
        };
        const req = transport.request(reqOptions, incoming => {
            const status = incoming.statusCode || 200;
            const location = incoming.headers.location;
            if (init.redirect !== 'manual' &&
                REDIRECT_STATUS_CODES.has(status) &&
                location) {
                clearReqTimeout();
                incoming.resume();
                if (init.redirect === 'error') {
                    reject(Object.assign(new Error(`uri requested responds with a redirect: ${urlStr}`), { type: 'no-redirect' }));
                    return;
                }
                const maxFollow = typeof init.follow === 'number' ? init.follow : MAX_REDIRECTS;
                if (redirectCount >= maxFollow) {
                    reject(Object.assign(new Error(`maximum redirect reached at: ${urlStr}`), {
                        type: 'max-redirect',
                    }));
                    return;
                }
                const redirectUrl = new URL(String(location), parsedUrl);
                const currentMethod = (init.method || 'GET').toUpperCase();
                const switchToGet = status === 303 ||
                    ((status === 301 || status === 302) && currentMethod === 'POST');
                const nextHeaders = { ...headers };
                for (const k of Object.keys(nextHeaders)) {
                    const lower = k.toLowerCase();
                    if (lower === 'host' ||
                        (switchToGet &&
                            (lower === 'content-length' ||
                                lower === 'content-type' ||
                                lower === 'transfer-encoding')) ||
                        (redirectUrl.origin !== parsedUrl.origin &&
                            (lower === 'authorization' ||
                                lower === 'proxy-authorization' ||
                                lower === 'cookie'))) {
                        delete nextHeaders[k];
                    }
                }
                const nextInit = {
                    ...init,
                    method: switchToGet ? 'GET' : init.method,
                    body: switchToGet ? undefined : init.body,
                    headers: nextHeaders,
                };
                bunFetch(redirectUrl.toString(), nextInit, redirectCount + 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            resetReqTimeout();
            incoming.on('data', resetReqTimeout);
            incoming.on('end', clearReqTimeout);
            incoming.on('close', clearReqTimeout);
            const responseStream = new stream_1.PassThrough();
            activeIncoming = incoming;
            activeResponseStream = responseStream;
            const encoding = (incoming.headers['content-encoding'] || '').toLowerCase();
            if (init.compress !== false &&
                status !== 204 &&
                status !== 304 &&
                (reqOptions.method || 'GET').toUpperCase() !== 'HEAD' &&
                (encoding === 'gzip' ||
                    encoding === 'x-gzip' ||
                    encoding === 'deflate' ||
                    encoding === 'br')) {
                const decompressor = encoding === 'br'
                    ? zlib.createBrotliDecompress()
                    : zlib.createUnzip();
                incoming.on('error', err => decompressor.destroy(err));
                decompressor.on('error', err => responseStream.destroy(err));
                incoming.pipe(decompressor).pipe(responseStream);
            }
            else {
                incoming.on('error', err => responseStream.destroy(err));
                incoming.pipe(responseStream);
            }
            const fetchHeaders = new globalThis.Headers();
            for (const [k, v] of Object.entries(incoming.headers)) {
                if (Array.isArray(v)) {
                    v.forEach(val => fetchHeaders.append(k, val));
                }
                else if (v !== undefined) {
                    fetchHeaders.set(k, v);
                }
            }
            const readText = async () => {
                const chunks = [];
                for await (const chunk of responseStream) {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                }
                return Buffer.concat(chunks).toString('utf8');
            };
            const res = {
                url: urlStr,
                status,
                statusText: incoming.statusMessage || '',
                headers: fetchHeaders,
                body: responseStream,
                text: readText,
                json: async () => {
                    const text = await readText();
                    try {
                        return JSON.parse(text);
                    }
                    catch (err) {
                        throw new Error(`invalid json response body at ${urlStr} reason: ${err.message}`);
                    }
                },
            };
            resolve(res);
        });
        if (init.timeout) {
            req.setTimeout(init.timeout, onTimeout);
            resetReqTimeout();
        }
        req.on('error', err => {
            clearReqTimeout();
            activeIncoming?.destroy(err);
            activeResponseStream?.destroy(err);
            reject(err);
        });
        if (init.body) {
            if (typeof init.body === 'object' &&
                typeof init.body.pipe === 'function') {
                init.body.on('error', err => {
                    clearReqTimeout();
                    activeResponseStream?.destroy(err);
                    req.destroy();
                    reject(err);
                });
                init.body.pipe(req);
            }
            else if (typeof init.body === 'string' ||
                Buffer.isBuffer(init.body) ||
                init.body instanceof Uint8Array) {
                req.write(init.body);
                req.end();
            }
            else {
                req.end();
            }
        }
        else {
            req.end();
        }
    });
}
const fetch = (...args) => 'Bun' in globalThis
    ? bunFetch(args[0], args[1])
    : import('node-fetch').then(({ default: fetch }) => fetch(...args));
class RequestError extends Error {
    code;
}
exports.RequestError = RequestError;
/**
 * Convert options from Request to Fetch format
 * @private
 * @param reqOpts Request options
 */
function requestToFetchOptions(reqOpts) {
    const options = {
        method: reqOpts.method || 'GET',
        ...(reqOpts.timeout && { timeout: reqOpts.timeout }),
        ...(typeof reqOpts.gzip === 'boolean' && { compress: reqOpts.gzip }),
    };
    if (typeof reqOpts.json === 'object') {
        // Add Content-type: application/json header
        reqOpts.headers = reqOpts.headers || {};
        if (reqOpts.headers instanceof globalThis.Headers) {
            reqOpts.headers.set('Content-Type', 'application/json');
        }
        else {
            reqOpts.headers['Content-Type'] = 'application/json';
        }
        // Set body to JSON representation of value
        options.body = JSON.stringify(reqOpts.json);
    }
    else {
        if (Buffer.isBuffer(reqOpts.body)) {
            options.body = reqOpts.body;
        }
        else if (typeof reqOpts.body !== 'string') {
            options.body = JSON.stringify(reqOpts.body);
        }
        else {
            options.body = reqOpts.body;
        }
    }
    if (reqOpts.headers instanceof globalThis.Headers) {
        options.headers = {};
        for (const pair of reqOpts.headers.entries()) {
            options.headers[pair[0]] = pair[1];
        }
    }
    else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options.headers = reqOpts.headers;
    }
    let uri = (reqOpts.uri ||
        reqOpts.url);
    if (!uri) {
        throw new Error('Missing uri or url in reqOpts.');
    }
    if (reqOpts.useQuerystring === true || typeof reqOpts.qs === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const qs = require('querystring');
        const params = qs.stringify(reqOpts.qs);
        uri = uri + '?' + params;
    }
    options.agent = (0, agents_1.getAgent)(uri, reqOpts);
    return { uri, options };
}
/**
 * Convert a response from `fetch` to `request` format.
 * @private
 * @param opts The `request` options used to create the request.
 * @param res The Fetch response
 * @returns A `request` response object
 */
function fetchToRequestResponse(opts, res) {
    const request = {};
    request.agent = opts.agent || false;
    request.headers = (opts.headers || {});
    request.href = res.url;
    // headers need to be converted from a map to an obj
    const resHeaders = {};
    res.headers.forEach((value, key) => (resHeaders[key] = value));
    const response = Object.assign(res.body, {
        statusCode: res.status,
        statusMessage: res.statusText,
        request,
        body: res.body,
        headers: resHeaders,
        toJSON: () => ({ headers: resHeaders }),
    });
    return response;
}
/**
 * Create POST body from two parts as multipart/related content-type
 * @private
 * @param boundary
 * @param multipart
 */
function createMultipartStream(boundary, multipart) {
    const finale = `--${boundary}--`;
    const stream = new stream_1.PassThrough();
    for (const part of multipart) {
        const preamble = `--${boundary}\r\nContent-Type: ${part['Content-Type']}\r\n\r\n`;
        stream.write(preamble);
        if (typeof part.body === 'string') {
            stream.write(part.body);
            stream.write('\r\n');
        }
        else {
            part.body.pipe(stream, { end: false });
            part.body.on('end', () => {
                stream.write('\r\n');
                stream.write(finale);
                stream.end();
            });
        }
    }
    return stream;
}
function teenyRequest(reqOpts, callback) {
    const { uri, options } = requestToFetchOptions(reqOpts);
    const multipart = reqOpts.multipart;
    if (reqOpts.multipart && multipart.length === 2) {
        if (!callback) {
            // TODO: add support for multipart uploads through streaming
            throw new Error('Multipart without callback is not implemented.');
        }
        const boundary = (0, crypto_1.randomUUID)();
        options.headers['Content-Type'] =
            `multipart/related; boundary=${boundary}`;
        options.body = createMultipartStream(boundary, multipart);
        // Multipart upload
        teenyRequest.stats.requestStarting();
        fetch(uri, options).then(res => {
            teenyRequest.stats.requestFinished();
            const header = res.headers.get('content-type');
            const response = fetchToRequestResponse(options, res);
            const body = response.body;
            if (/^application\/json(?:\s*;|$)/i.test(header || '')) {
                res.json().then(json => {
                    response.body = json;
                    callback(null, response, json);
                }, (err) => {
                    callback(err, response, body);
                });
                return;
            }
            res.text().then(text => {
                response.body = text;
                callback(null, response, text);
            }, err => {
                callback(err, response, body);
            });
        }, err => {
            teenyRequest.stats.requestFinished();
            callback(err, null, null);
        });
        return;
    }
    if (callback === undefined) {
        // Stream mode
        const requestStream = streamEvents(new stream_1.PassThrough());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let responseStream;
        requestStream.once('reading', () => {
            if (responseStream) {
                (0, stream_1.pipeline)(responseStream, requestStream, () => { });
            }
            else {
                requestStream.once('response', () => {
                    (0, stream_1.pipeline)(responseStream, requestStream, () => { });
                });
            }
        });
        options.compress = false;
        teenyRequest.stats.requestStarting();
        fetch(uri, options).then(res => {
            teenyRequest.stats.requestFinished();
            responseStream = res.body;
            responseStream.on('error', (err) => {
                requestStream.emit('error', err);
            });
            const response = fetchToRequestResponse(options, res);
            requestStream.emit('response', response);
        }, err => {
            teenyRequest.stats.requestFinished();
            requestStream.emit('error', err);
        });
        // fetch doesn't supply the raw HTTP stream, instead it
        // returns a PassThrough piped from the HTTP response
        // stream.
        return requestStream;
    }
    // GET or POST with callback
    teenyRequest.stats.requestStarting();
    fetch(uri, options).then(res => {
        teenyRequest.stats.requestFinished();
        const header = res.headers.get('content-type');
        const response = fetchToRequestResponse(options, res);
        const body = response.body;
        if (/^application\/json(?:\s*;|$)/i.test(header || '')) {
            if (response.statusCode === 204) {
                // Probably a DELETE
                callback(null, response, body);
                return;
            }
            res.json().then(json => {
                response.body = json;
                callback(null, response, json);
            }, err => {
                callback(err, response, body);
            });
            return;
        }
        res.text().then(text => {
            const response = fetchToRequestResponse(options, res);
            response.body = text;
            callback(null, response, text);
        }, err => {
            callback(err, response, body);
        });
    }, err => {
        teenyRequest.stats.requestFinished();
        callback(err, null, null);
    });
    return;
}
/* eslint-enable promise/always-return, promise/catch-or-return, promise/no-callback-in-promise */
teenyRequest.defaults = (defaults) => {
    return (reqOpts, callback) => {
        const opts = { ...defaults, ...reqOpts };
        if (callback === undefined) {
            return teenyRequest(opts);
        }
        teenyRequest(opts, callback);
    };
};
/**
 * Single instance of an interface for keeping track of things.
 */
teenyRequest.stats = new TeenyStatistics_1.TeenyStatistics();
teenyRequest.resetStats = () => {
    teenyRequest.stats = new TeenyStatistics_1.TeenyStatistics(teenyRequest.stats.getOptions());
};
//# sourceMappingURL=index.js.map