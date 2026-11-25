import { EventEmitter } from 'events';
import { LogFields, LogSeverity, AdhocDebugLogCallable, AdhocDebugLogFunction, DebugLogBackend } from './types';
/**
 * Our logger instance. This actually contains the meat of dealing
 * with log lines, including EventEmitter. This contains the function
 * that will be passed back to users of the package.
 */
export declare class AdhocDebugLogger extends EventEmitter {
    namespace: string;
    upstream: AdhocDebugLogCallable;
    func: AdhocDebugLogFunction;
    /**
     * @param upstream The backend will pass a function that will be
     * called whenever our logger function is invoked.
     */
    constructor(namespace: string, upstream: AdhocDebugLogCallable);
    invoke(fields: LogFields, ...args: unknown[]): void;
    invokeSeverity(severity: LogSeverity, ...args: unknown[]): void;
}
/**
 * This can be used in place of a real logger while waiting for Promises or disabling logging.
 */
export declare const placeholder: AdhocDebugLogFunction;
/**
 * @returns A backend based on Node util.debuglog; this is the default.
 */
export declare function getNodeBackend(): DebugLogBackend;
type DebugPackage = any;
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
export declare function getDebugBackend(debugPkg: DebugPackage): DebugLogBackend;
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
export declare function getStructuredBackend(upstream?: DebugLogBackend): DebugLogBackend;
/**
 * The environment variables that we standardized on, for all ad-hoc logging.
 */
export declare const env: {
    /**
     * Filter wildcards specific to the Node syntax, and similar to the built-in
     * utils.debuglog() environment variable. If missing, disables logging.
     */
    nodeEnables: string;
};
/**
 * Set the backend to use for our log output.
 * - A backend object
 * - null to disable logging
 * - undefined for "nothing yet", defaults to the Node backend
 *
 * @param backend Results from one of the get*Backend() functions.
 */
export declare function setBackend(backend: DebugLogBackend | null | undefined): void;
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
export declare function log(namespace: string, parent?: AdhocDebugLogFunction): AdhocDebugLogFunction;
export {};
