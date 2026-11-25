"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNativeBackend = registerNativeBackend;
exports.getNativeParser = getNativeParser;
exports.getNativeBackendLoadError = getNativeBackendLoadError;
exports.clearNativeBackendCaches = clearNativeBackendCaches;
// Bundlers follow literal require() paths, which would pull in the optional @typescript/native.
const tsgoBackendPath = './native';
let backend;
let loadError;
let loaded = false;
function registerNativeBackend(registered) {
    backend = registered;
    loadError = undefined;
    loaded = true;
}
function getNativeParser() {
    if (!loaded) {
        loaded = true;
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require(tsgoBackendPath);
        }
        catch (error) {
            backend = undefined;
            loadError = error;
        }
    }
    return backend?.parse;
}
function getNativeBackendLoadError() {
    return loadError;
}
function clearNativeBackendCaches() {
    backend?.clearProjectService();
}
//# sourceMappingURL=nativeParserRegistry.js.map