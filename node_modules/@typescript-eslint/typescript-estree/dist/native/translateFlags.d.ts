type FlagTranslations = readonly (readonly [number, number])[];
export declare function createFlagTranslations(nativeFlags: Readonly<Record<string, number | string>>, classicFlags: Readonly<Record<string, number | string>>): FlagTranslations;
export declare function translateFlags(translations: FlagTranslations, flags: number): number;
export {};
