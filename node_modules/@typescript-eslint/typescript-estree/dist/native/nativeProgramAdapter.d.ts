import type { Project as NativeProject } from '@typescript/native/sync';
import type * as ts from 'typescript';
import type { NativeNodeAdapter } from './nativeNodeAdapter';
interface NativeProgramAdapterContext {
    checker: ts.TypeChecker;
    nodeAdapter: NativeNodeAdapter;
    project: NativeProject;
}
export declare function createNativeProgram({ checker, nodeAdapter, project, }: NativeProgramAdapterContext): ts.Program;
export {};
