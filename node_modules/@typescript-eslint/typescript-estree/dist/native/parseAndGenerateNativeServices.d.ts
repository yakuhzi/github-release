import type { ParseAndGenerateServicesResult } from '../parser';
import type { TSESTreeOptions } from '../parser-options';
import type { ParseSettings } from '../parseSettings';
export declare function parseAndGenerateNativeServices<T extends TSESTreeOptions = TSESTreeOptions>(parseSettings: ParseSettings): ParseAndGenerateServicesResult<T>;
