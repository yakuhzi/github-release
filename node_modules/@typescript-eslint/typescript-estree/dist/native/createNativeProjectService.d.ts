import type { NativeProjectService } from './types';
export declare function toCompilerPath(filePath: string): string;
export declare function createNativeProjectService(cwd?: string): NativeProjectService;
export declare function clearNativeProjectService(): void;
export declare function getNativeProjectService(cwd?: string): NativeProjectService;
