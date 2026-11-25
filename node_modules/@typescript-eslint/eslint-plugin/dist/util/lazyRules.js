"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lazyRules = lazyRules;
function lazyRules(loaders) {
    const rules = {};
    for (const [name, load] of Object.entries(loaders)) {
        let rule;
        Object.defineProperty(rules, name, {
            enumerable: true,
            get: () => {
                rule ??= load().default;
                return rule;
            },
        });
    }
    return rules;
}
//# sourceMappingURL=lazyRules.js.map