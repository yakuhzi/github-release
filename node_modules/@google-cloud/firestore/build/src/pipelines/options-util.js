"use strict";
// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptionsUtil = void 0;
const serializer_1 = require("../serializer");
const path_1 = require("../path");
const util_1 = require("../util");
/**
 * A utility class for formatting known and raw options into the
 * proto structure utilized by Pipelines.
 *
 * @example
 * ```
 * myUtil = new OptionsUtil({
 *     someFoo: {
 *       serverName: 'some_foo',
 *     },
 *     aBar: {
 *       serverName: 'a_bar',
 *       nestedOptions: {
 *         baz: {
 *           serverName: 'baz',
 *         }
 *       },
 *     },
 *   });
 *
 * optionsProto = myUtil.getOptionsProto(
 *    serializer,
 *    {
 *      someFoo: 1
 *    },
 *    {
 *      aBar.another_unknown_option: "yep"
 *    });
 *
 * // Resulting optionsProto:
 * // {
 * //    'some_foo': { integerValue: 1 },
 * //    'a_bar': { mapValue: { fields: { 'another_unknown_option': {stringValue: 'yep' }}}}
 * // }
 * ```
 */
class OptionsUtil {
    optionDefinitions;
    constructor(optionDefinitions) {
        this.optionDefinitions = optionDefinitions;
    }
    /**
     * Serialize known options to ObjectValue
     * @param options - Serialize these options.
     * @param serializer - Use this serializer to serialize primitives to proto.
     * @private
     */
    _getKnownOptions(options, serializer) {
        const knownOptions = serializer_1.ObjectValue.empty();
        // SERIALIZE KNOWN OPTIONS
        for (const knownOptionKey in this.optionDefinitions) {
            const optionDefinition = this.optionDefinitions[knownOptionKey];
            if (knownOptionKey in options) {
                const optionValue = options[knownOptionKey];
                let protoValue = undefined;
                if (optionDefinition.nestedOptions && (0, util_1.isPlainObject)(optionValue)) {
                    const nestedUtil = new OptionsUtil(optionDefinition.nestedOptions);
                    protoValue = {
                        mapValue: {
                            fields: nestedUtil.getOptionsProto(serializer, optionValue),
                        },
                    };
                }
                else if (optionValue) {
                    protoValue = serializer.encodeValue(optionValue) ?? undefined;
                }
                if (protoValue) {
                    knownOptions.set(new path_1.ObjectValueFieldPath(optionDefinition.serverName), protoValue);
                }
            }
        }
        return knownOptions;
    }
    /**
     * Serialize known and raw options to a proto object.
     *  - Renames knownOptions from the SDK name (camel case) to server name (snake case)
     *  - Serializes values provided for each option to a proto value, using the provided serializer.
     *  - Overlays optionsOverrides (which represent raw options) onto the result proto.
     *  - Supports nested objects (`{optionA: { optionB: true }}`) and dot notation (`{optionA.optionB: true}`).
     * @param serializer
     * @param knownOptions
     * @param optionsOverride
     */
    getOptionsProto(serializer, knownOptions, optionsOverride) {
        const result = this._getKnownOptions(knownOptions, serializer);
        // APPLY OPTIONS OVERRIDES
        if (optionsOverride) {
            const optionsMap = new Map((0, util_1.mapToArray)(optionsOverride, (value, key) => [
                path_1.ObjectValueFieldPath.fromDotNotation(key),
                value !== undefined ? serializer.encodeValue(value) : null,
            ]));
            result.setAll(optionsMap);
        }
        // Return IMapValue from `result`
        return result.value.mapValue.fields ?? {};
    }
}
exports.OptionsUtil = OptionsUtil;
//# sourceMappingURL=options-util.js.map