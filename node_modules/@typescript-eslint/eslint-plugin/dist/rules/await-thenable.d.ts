import type { TSESLint } from '@typescript-eslint/utils';
export type MessageId = 'await' | 'awaitUsingOfNonAsyncDisposable' | 'convertToOrdinaryFor' | 'forAwaitOfNonAsyncIterable' | 'invalidPromiseAggregatorInput' | 'removeAwait';
export type Options = [
    {
        allowMixedPromiseArrays?: boolean;
    }
];
declare const _default: TSESLint.RuleModule<MessageId, Options, import("../../rules").ESLintPluginDocs, TSESLint.RuleListener> & {
    name: string;
};
export default _default;
