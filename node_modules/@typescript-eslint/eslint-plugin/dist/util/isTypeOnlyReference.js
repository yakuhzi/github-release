"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMergedTypeValueVariable = isMergedTypeValueVariable;
exports.isTypeOnlyReference = isTypeOnlyReference;
const scope_manager_1 = require("@typescript-eslint/scope-manager");
const referenceContainsTypePredicate_1 = require("./referenceContainsTypePredicate");
const referenceContainsTypeQuery_1 = require("./referenceContainsTypeQuery");
function isMergedTypeValueVariable(variable) {
    return ('isTypeVariable' in variable &&
        'isValueVariable' in variable &&
        variable.isTypeVariable &&
        variable.isValueVariable);
}
function isTypeOnlyReference(variable, ref) {
    if ((0, referenceContainsTypeQuery_1.referenceContainsTypeQuery)(ref.identifier) ||
        (0, referenceContainsTypePredicate_1.referenceContainsTypePredicate)(ref.identifier)) {
        return true;
    }
    return (variable.defs.some(def => def.type === scope_manager_1.DefinitionType.Variable) &&
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare -- no-unused-vars is one of our rare rules that's used across JS code that is not parsed by our parser. As such `isValueReference` may be undefined and using `!isValueReference` causes false-positives for those users.
        ref.isValueReference === false);
}
//# sourceMappingURL=isTypeOnlyReference.js.map