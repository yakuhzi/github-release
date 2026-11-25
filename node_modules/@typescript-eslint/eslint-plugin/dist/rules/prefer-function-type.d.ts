import type { TSESLint } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
export declare const phrases: {
    readonly [AST_NODE_TYPES.TSInterfaceDeclaration]: 'Interface';
    readonly [AST_NODE_TYPES.TSTypeLiteral]: 'Type literal';
};
declare const _default: TSESLint.RuleModule<"functionTypeOverCallableType" | "unexpectedThisOnFunctionOnlyInterface", [], import("../../rules").ESLintPluginDocs, TSESLint.RuleListener> & {
    name: string;
};
export default _default;
