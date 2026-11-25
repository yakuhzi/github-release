"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFlagTranslations = createFlagTranslations;
exports.translateFlags = translateFlags;
function createFlagTranslations(nativeFlags, classicFlags) {
    return Object.entries(nativeFlags).flatMap(([name, native]) => {
        const classic = classicFlags[name];
        return typeof native === 'number' &&
            native > 0 &&
            (native & (native - 1)) === 0 &&
            typeof classic === 'number'
            ? [[native, classic]]
            : [];
    });
}
function translateFlags(translations, flags) {
    let translated = 0;
    for (const [nativeFlag, classicFlag] of translations) {
        if (flags & nativeFlag) {
            translated |= classicFlag;
        }
    }
    return translated;
}
//# sourceMappingURL=translateFlags.js.map