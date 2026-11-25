import type { Node as NativeNode, SourceFile as NativeSourceFile } from '@typescript/native/ast';
import type { Diagnostic as NativeDiagnostic } from '@typescript/native/sync';
import { SyntaxKind as NativeSyntaxKind } from '@typescript/native/ast';
import * as ts from 'typescript';
export interface NativeNodeAdapter {
    releaseChildren(sourceFile: NativeSourceFile): void;
    unwrapNode(node: ts.Node): NativeNode;
    wrapNode(node: NativeNode): ts.Node;
}
interface NativeNodeAdapterOptions {
    getSyntacticDiagnostics: (fileName: string) => readonly NativeDiagnostic[];
}
export declare function toClassicDiagnostic(diagnostic: NativeDiagnostic, getFile: (fileName: string | undefined) => ts.SourceFile | undefined): ts.Diagnostic;
export declare function toNativeKind(kind: ts.SyntaxKind): NativeSyntaxKind;
export declare function hasClassicKind({ kind }: NativeNode): boolean;
export declare function createNativeNodeAdapter({ getSyntacticDiagnostics, }: NativeNodeAdapterOptions): NativeNodeAdapter;
export {};
