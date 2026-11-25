import type { ESLintPluginRuleModule } from '../../rules';
type Loader = () => {
    default: ESLintPluginRuleModule;
};
export declare function lazyRules<T extends Record<string, Loader>>(loaders: T): Record<keyof T, ESLintPluginRuleModule>;
export {};
