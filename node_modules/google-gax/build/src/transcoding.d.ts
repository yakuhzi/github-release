/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { JSONObject, JSONValue } from 'proto3-json-serializer';
import { Field } from 'protobufjs';
import { google } from '../protos/http';
export interface TranscodedRequest {
    httpMethod: 'get' | 'post' | 'put' | 'patch' | 'delete';
    url: string;
    queryString: string;
    data: string | {};
}
/**
 * Returns the matched `(google.api.http)` URL path template for a transcoded request, if available.
 */
export declare function getMatchedUrlTemplate(transcoded: TranscodedRequest): string | undefined;
declare const httpOptionName = "(google.api.http)";
type allowedOptions = '(google.api.method_signature)';
export type ParsedOptionsType = Array<{
    [httpOptionName]?: google.api.IHttpRule;
} & {
    [option in allowedOptions]?: {} | string | number;
}>;
export declare function getField(request: JSONObject, field: string, allowObjects?: boolean): JSONValue | undefined;
export declare function deepCopyWithoutMatchedFields(request: JSONObject, fieldsToSkip: Set<string>, fullNamePrefix?: string): JSONObject;
export declare function deleteField(request: JSONObject, field: string): void;
export declare function buildQueryStringComponents(request: JSONObject, prefix?: string): string[];
/**
 * Percent-encodes a string according to RFC 3986, preserving only unreserved
 * characters (alpha-numeric, '-', '_', '.', and '~'). All other characters,
 * including slashes ('/'), are percent-encoded.
 *
 * This is necessary because encodeURIComponent natively encodes URL-unsafe
 * characters like ?, #, $, &, +, etc., but preserves !, ', (, ), and *.
 * To ensure strict compliance, we manually encode those preserved characters.
 *
 * @param {string} str - The input string to encode.
 * @returns {string} The percent-encoded string.
 */
export declare function encodeWithSlashes(str: string): string;
/**
 * Percent-encodes a string according to RFC 3986, preserving unreserved
 * characters (alpha-numeric, '-', '_', '.', and '~') and slashes ('/'). All other
 * characters are percent-encoded.
 *
 * @param {string} str - The input string to encode.
 * @returns {string} The percent-encoded string with slashes preserved.
 */
export declare function encodeWithoutSlashes(str: string): string;
export declare function applyPattern(pattern: string, fieldValue: string, propertyName?: string): string | undefined;
interface MatchResult {
    matchedFields: string[];
    url: string;
}
export declare function match(request: JSONObject, pattern: string): MatchResult | undefined;
export declare function flattenObject(request: JSONObject): JSONObject;
export declare function isProto3OptionalField(field: Field): any;
export declare function transcode(request: JSONObject, parsedOptions: ParsedOptionsType): TranscodedRequest | undefined;
export declare function overrideHttpRules(httpRules: Array<google.api.IHttpRule>, protoJson: protobuf.Root): void;
export {};
