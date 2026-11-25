"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwOnUnsupportedMembers = throwOnUnsupportedMembers;
function throwOnUnsupportedMembers(label, unsupported, implementation) {
    for (const property of unsupported) {
        Object.defineProperty(implementation, property, {
            get() {
                throw new Error(`${label}#${property} is not available on the tsgo API.`);
            },
        });
    }
    return implementation;
}
//# sourceMappingURL=throwOnUnsupportedMembers.js.map