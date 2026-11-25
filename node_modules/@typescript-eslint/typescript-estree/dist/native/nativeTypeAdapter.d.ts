import type { Checker as NativeChecker, IndexInfo as NativeIndexInfo, Project as NativeProject, Signature as NativeSignature, Symbol as NativeSymbol, Type as NativeType, TypePredicate as NativeTypePredicate } from '@typescript/native/sync';
import * as ts from 'typescript';
import type { NativeNodeAdapter } from './nativeNodeAdapter';
export interface NativeTypeAdapter {
    toSignature: (signature: NativeSignature) => ts.Signature;
    toSymbol: (symbol: NativeSymbol) => ts.Symbol;
    toType: (type: NativeType) => ts.Type;
    unwrapSignature: (signature: ts.Signature) => NativeSignature;
    unwrapSymbol: (symbol: ts.Symbol) => NativeSymbol;
    unwrapType: (type: ts.Type) => NativeType;
    wrapIndexInfo: (info: NativeIndexInfo) => ts.IndexInfo;
    wrapSignature: {
        (signature: NativeSignature): ts.Signature;
        (signature: NativeSignature | undefined): ts.Signature | undefined;
    };
    wrapSymbol: {
        (symbol: NativeSymbol): ts.Symbol;
        (symbol: NativeSymbol | undefined): ts.Symbol | undefined;
    };
    wrapType: {
        (type: NativeType): ts.Type;
        (type: NativeType | undefined): ts.Type | undefined;
    };
    wrapTypePredicate: (predicate: NativeTypePredicate | undefined) => ts.TypePredicate | undefined;
}
interface NativeTypeAdapterContext {
    checker: NativeChecker;
    nodeAdapter: NativeNodeAdapter;
    project: NativeProject;
}
export declare function createNativeTypeAdapter({ checker, nodeAdapter, project, }: NativeTypeAdapterContext): NativeTypeAdapter;
export {};
