import type { API, Checker as NativeChecker } from '@typescript/native/sync';
import * as ts from 'typescript';
import type { NativeNodeAdapter } from './nativeNodeAdapter';
import type { NativeTypeAdapter } from './nativeTypeAdapter';
interface NativeCheckerAdapterContext {
    api: API;
    checker: NativeChecker;
    nodeAdapter: NativeNodeAdapter;
    typeAdapter: NativeTypeAdapter;
}
export declare function createNativeChecker({ api, checker, nodeAdapter, typeAdapter, }: NativeCheckerAdapterContext): {
    checker: ts.TypeChecker;
    prefetch: (nodes: {
        calls: readonly ts.Node[];
        contextual: readonly ts.Node[];
        typed: readonly ts.Node[];
    }) => void;
};
export {};
