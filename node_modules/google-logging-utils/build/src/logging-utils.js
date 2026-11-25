"use strict";
// Copyright 2021-2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
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
exports.env = exports.DebugLogBackendBase = exports.placeholder = exports.AdhocDebugLogger = void 0;
exports.getNodeBackend = getNodeBackend;
exports.getDebugBackend = getDebugBackend;
exports.getStructuredBackend = getStructuredBackend;
exports.setBackend = setBackend;
exports.log = log;
const events_1 = require("events");
const process = __importStar(require("process"));
const util = __importStar(require("util"));
const colours_1 = require("./colours");
const types_1 = require("./types");
// Some functions (as noted) are based on the Node standard library, from
// the following file:
//
// https://github.com/nodejs/node/blob/main/lib/internal/util/debuglog.js
// NOTE: The previous 'export declare interface AdhocDebugLogger' was correctly removed.
/**
 * Our logger instance. This actually contains the meat of dealing
 * with log lines, including EventEmitter. This contains the function
 * that will be passed back to users of the package.
 */
class AdhocDebugLogger extends events_1.EventEmitter {
    // Our namespace (system/subsystem/etc)
    namespace;
    // The function we'll call with new log lines.
    // Should be built in Node util stuff, or the "debug" package, or whatever.
    upstream;
    // Self-referential function wrapper that calls invoke() on us.
    func;
    /**
     * @param upstream The backend will pass a function that will be
     * called whenever our logger function is invoked.
     */
    constructor(namespace, upstream) {
        super();
        this.namespace = namespace;
        this.upstream = upstream;
        this.func = Object.assign(this.invoke.bind(this), {
            // Also add an instance pointer back to us.
            instance: this,
            // And pull over the EventEmitter functionality.
            on: (event, listener) => this.on(event, listener),
        });
        // Convenience methods for log levels.
        this.func.debug = (...args) => this.invokeSeverity(types_1.LogSeverity.DEBUG, ...args);
        this.func.info = (...args) => this.invokeSeverity(types_1.LogSeverity.INFO, ...args);
        this.func.warn = (...args) => this.invokeSeverity(types_1.LogSeverity.WARNING, ...args);
        this.func.error = (...args) => this.invokeSeverity(types_1.LogSeverity.ERROR, ...args);
        this.func.sublog = (namespace) => log(namespace, this.func);
    }
    invoke(fields, ...args) {
        // Push out any upstream logger first.
        if (this.upstream) {
            try {
                this.upstream(fields, ...args);
            }
            catch (e) {
                // Swallow exceptions to avoid interfering with other logging.
            }
        }
        // Emit sink events.
        try {
            this.emit('log', fields, args);
        }
        catch (e) {
            // Swallow exceptions to avoid interfering with other logging.
        }
    }
    invokeSeverity(severity, ...args) {
        this.invoke({ severity }, ...args);
    }
}
exports.AdhocDebugLogger = AdhocDebugLogger;
/**
 * This can be used in place of a real logger while waiting for Promises or disabling logging.
 */
exports.placeholder = new AdhocDebugLogger('', () => { }).func;
// 🌟 REMOVED: AdhocDebugLogCallable, AdhocDebugLogFunction, DebugLogBackend declarations
/**
 * The base class for debug logging backends. It's possible to use this, but the
 * same non-guarantees above still apply (unstable interface, etc).
 *
 * @private
 * @internal
 */
class DebugLogBackendBase {
    cached = new Map();
    filters = [];
    filtersSet = false;
    constructor() {
        // Look for the Node config variable for what systems to enable. We'll store
        // these for the log method below, which will call setFilters() once.
        let nodeFlag = process.env[exports.env.nodeEnables] ?? '*';
        if (nodeFlag === 'all' || nodeFlag === 'true') {
            nodeFlag = '*';
        }
        this.filters = nodeFlag.split(',');
    }
    log(namespace, fields, ...args) {
        try {
            if (!this.filtersSet) {
                this.setFilters();
                this.filtersSet = true;
            }
            let logger = this.cached.get(namespace);
            if (!logger) {
                logger = this.makeLogger(namespace);
                this.cached.set(namespace, logger);
            }
            logger(fields, ...args);
        }
        catch (e) {
            // Silently ignore all errors; we don't want them to interfere with
            // the user's running app.
            // e;
            console.error(e);
        }
    }
}
exports.DebugLogBackendBase = DebugLogBackendBase;
// The basic backend. This one definitely works, but it's less feature-filled.
//
// Rather than using util.debuglog, this implements the same basic logic directly.
// The reason for this decision is that debuglog checks the value of the
// NODE_DEBUG environment variable before any user code runs; we therefore
// can't pipe our own enables into it (and util.debuglog will never print unless
// the user duplicates it into NODE_DEBUG, which isn't reasonable).
//
class NodeBackend extends DebugLogBackendBase {
    // Default to allowing all systems, since we gate earlier based on whether the
    // variable is empty.
    enabledRegexp = /.*/g;
    isEnabled(namespace) {
        return this.enabledRegexp.test(namespace);
    }
    makeLogger(namespace) {
        if (!this.enabledRegexp.test(namespace)) {
            return () => { };
        }
        return (fields, ...args) => {
            // TODO: `fields` needs to be turned into a string here, one way or another.
            const nscolour = `${colours_1.Colours.green}${namespace}${colours_1.Colours.reset}`;
            const pid = `${colours_1.Colours.yellow}${process.pid}${colours_1.Colours.reset}`;
            let level;
            switch (fields.severity) {
                case types_1.LogSeverity.ERROR:
                    level = `${colours_1.Colours.red}${fields.severity}${colours_1.Colours.reset}`;
                    break;
                case types_1.LogSeverity.INFO:
                    level = `${colours_1.Colours.magenta}${fields.severity}${colours_1.Colours.reset}`;
                    break;
                case types_1.LogSeverity.WARNING:
                    level = `${colours_1.Colours.yellow}${fields.severity}${colours_1.Colours.reset}`;
                    break;
                default:
                    level = fields.severity ?? types_1.LogSeverity.DEFAULT;
                    break;
            }
            const msg = util.formatWithOptions({ colors: colours_1.Colours.enabled }, ...args);
            const filteredFields = Object.assign({}, fields);
            delete filteredFields.severity;
            const fieldsJson = Object.getOwnPropertyNames(filteredFields).length
                ? JSON.stringify(filteredFields)
                : '';
            const fieldsColour = fieldsJson
                ? `${colours_1.Colours.grey}${fieldsJson}${colours_1.Colours.reset}`
                : '';
            console.error('%s [%s|%s] %s%s', pid, nscolour, level, msg, fieldsJson ? ` ${fieldsColour}` : '');
        };
    }
    // Regexp patterns below are from here:
    // https://github.com/nodejs/node/blob/c0aebed4b3395bd65d54b18d1fd00f071002ac20/lib/internal/util/debuglog.js#L36
    setFilters() {
        const totalFilters = this.filters.join(',');
        const regexp = totalFilters
            .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/,/g, '$|^');
        this.enabledRegexp = new RegExp(`^${regexp}$`, 'i');
    }
}
/**
 * @returns A backend based on Node util.debuglog; this is the default.
 */
function getNodeBackend() {
    return new NodeBackend();
}
class DebugBackend extends DebugLogBackendBase {
    debugPkg;
    constructor(pkg) {
        super();
        this.debugPkg = pkg;
    }
    makeLogger(namespace) {
        const debugLogger = this.debugPkg(namespace);
        return (fields, ...args) => {
            // TODO: `fields` needs to be turned into a string here.
            debugLogger(args[0], ...args.slice(1));
        };
    }
    setFilters() {
        const existingFilters = process.env['NODE_DEBUG'] ?? '';
        process.env['NODE_DEBUG'] = `${existingFilters}${existingFilters ? ',' : ''}${this.filters.join(',')}`;
    }
}
/**
 * Creates a "debug" package backend. The user must call require('debug') and pass
 * the resulting object to this function.
 *
 * ```
 *  setBackend(getDebugBackend(require('debug')))
 * ```
 *
 * https://www.npmjs.com/package/debug
 *
 * Note: Google does not explicitly endorse or recommend this package; it's just
 * being provided as an option.
 *
 * @returns A backend based on the npm "debug" package.
 */
function getDebugBackend(debugPkg) {
    return new DebugBackend(debugPkg);
}
/**
 * This pretty much works like the Node logger, but it outputs structured
 * logging JSON matching Google Cloud's ingestion specs. Rather than handling
 * its own output, it wraps another backend. The passed backend must be a subclass
 * of `DebugLogBackendBase` (any of the backends exposed by this package will work).
 */
class StructuredBackend extends DebugLogBackendBase {
    upstream;
    constructor(upstream) {
        super();
        this.upstream = upstream ?? undefined;
    }
    makeLogger(namespace) {
        const debugLogger = this.upstream?.makeLogger(namespace);
        return (fields, ...args) => {
            const severity = fields.severity ?? types_1.LogSeverity.INFO;
            const json = Object.assign({
                severity,
                message: util.format(...args),
            }, fields);
            const jsonString = JSON.stringify(json);
            if (debugLogger) {
                debugLogger(fields, jsonString);
            }
            else {
                console.log('%s', jsonString);
            }
        };
    }
    setFilters() {
        this.upstream?.setFilters();
    }
}
/**
 * Creates a "structured logging" backend. This pretty much works like the
 * Node logger, but it outputs structured logging JSON matching Google
 * Cloud's ingestion specs instead of plain text.
 *
 * ```
 *  setBackend(getStructuredBackend())
 * ```
 *
 * @param upstream If you want to use something besides the Node backend to
 *   write the actual log lines into, pass that here.
 * @returns A backend based on Google Cloud structured logging.
 */
function getStructuredBackend(upstream) {
    return new StructuredBackend(upstream);
}
/**
 * The environment variables that we standardized on, for all ad-hoc logging.
 */
exports.env = {
    /**
     * Filter wildcards specific to the Node syntax, and similar to the built-in
     * utils.debuglog() environment variable. If missing, disables logging.
     */
    nodeEnables: 'GOOGLE_SDK_NODE_LOGGING',
};
// Keep a copy of all namespaced loggers so users can reliably .on() them.
// Note that these cached functions will need to deal with changes in the backend.
const loggerCache = new Map();
// Our current global backend. This might be:
let cachedBackend = undefined;
/**
 * Set the backend to use for our log output.
 * - A backend object
 * - null to disable logging
 * - undefined for "nothing yet", defaults to the Node backend
 *
 * @param backend Results from one of the get*Backend() functions.
 */
function setBackend(backend) {
    cachedBackend = backend;
    loggerCache.clear();
}
/**
 * Creates a logging function. Multiple calls to this with the same namespace
 * will produce the same logger, with the same event emitter hooks.
 *
 * Namespaces can be a simple string ("system" name), or a qualified string
 * (system:subsystem), which can be used for filtering, or for "system:*".
 *
 * @param namespace The namespace, a descriptive text string.
 * @returns A function you can call that works similar to console.log().
 */
function log(namespace, parent) {
    // If the enable environment variable isn't set, do nothing. The user
    // can still choose to set a backend of their choice using the manual
    // `setBackend()`.
    if (!cachedBackend) {
        const enablesFlag = process.env[exports.env.nodeEnables];
        if (!enablesFlag) {
            return exports.placeholder;
        }
    }
    // This might happen mostly if the typings are dropped in a user's code,
    // or if they're calling from JavaScript.
    if (!namespace) {
        return exports.placeholder;
    }
    // Handle sub-loggers.
    if (parent) {
        namespace = `${parent.instance.namespace}:${namespace}`;
    }
    // Reuse loggers so things like event sinks are persistent.
    const existing = loggerCache.get(namespace);
    if (existing) {
        return existing.func;
    }
    // Do we have a backend yet?
    if (cachedBackend === null) {
        // Explicitly disabled.
        return exports.placeholder;
    }
    else if (cachedBackend === undefined) {
        // One hasn't been made yet, so default to Node.
        cachedBackend = getNodeBackend();
    }
    // The logger is further wrapped so we can handle the backend changing out.
    const logger = (() => {
        let previousBackend = undefined;
        const newLogger = new AdhocDebugLogger(namespace, (fields, ...args) => {
            if (previousBackend !== cachedBackend) {
                // Did the user pass a custom backend?
                if (cachedBackend === null) {
                    // Explicitly disabled.
                    return;
                }
                else if (cachedBackend === undefined) {
                    // One hasn't been made yet, so default to Node.
                    cachedBackend = getNodeBackend();
                }
                previousBackend = cachedBackend;
            }
            cachedBackend?.log(namespace, fields, ...args);
        });
        return newLogger;
    })();
    loggerCache.set(namespace, logger);
    return logger.func;
}
//# sourceMappingURL=logging-utils.js.map