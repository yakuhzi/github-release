import type { ParseAndGenerateServicesResult } from './parser';
import type { TSESTreeOptions } from './parser-options';
import type { ParseSettings } from './parseSettings';
export type ParseAndGenerateNativeServices = <T extends TSESTreeOptions>(parseSettings: ParseSettings) => ParseAndGenerateServicesResult<T>;
export interface NativeBackend {
    clearProjectService: () => void;
    parse: ParseAndGenerateNativeServices;
}
export declare function registerNativeBackend(registered: NativeBackend): void;
export declare function getNativeParser(): ParseAndGenerateNativeServices | undefined;
export declare function getNativeBackendLoadError(): unknown;
export declare function clearNativeBackendCaches(): void;
