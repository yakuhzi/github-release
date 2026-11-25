"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReferenceToGlobalFunction = isReferenceToGlobalFunction;
function isReferenceToGlobalFunction(calleeName, node, sourceCode) {
    // The reference is not always in the scope of the node. For example, a
    // `switch` discriminant belongs to the switch scope but is referenced from
    // the scope that contains the `switch`.
    let ref;
    let scope = sourceCode.getScope(node);
    while (scope && !ref) {
        ref = scope.references.find(ref => ref.identifier.name === calleeName &&
            ref.identifier.range[0] >= node.range[0] &&
            ref.identifier.range[1] <= node.range[1]);
        scope = scope.upper;
    }
    // ensure it's the "global" version
    return !ref?.resolved?.defs.length;
}
//# sourceMappingURL=scopeUtils.js.map