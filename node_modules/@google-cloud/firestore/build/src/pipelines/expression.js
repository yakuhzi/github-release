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
exports.Ordering = exports.VariableExpression = exports.BooleanField = exports.BooleanConstant = exports.BooleanFunctionExpression = exports.BooleanExpression = exports.SnippetExpression = exports.FunctionExpression = exports.MapValue = exports.Constant = exports.Field = exports.AliasedExpression = exports.AliasedAggregate = exports.AggregateFunction = exports.Expression = void 0;
exports.field = field;
exports.constant = constant;
exports._constant = _constant;
exports.countIf = countIf;
exports.arrayGet = arrayGet;
exports.isError = isError;
exports.ifError = ifError;
exports.isAbsent = isAbsent;
exports.mapRemove = mapRemove;
exports.mapMerge = mapMerge;
exports.documentId = documentId;
exports.parent = parent;
exports.substring = substring;
exports.add = add;
exports.subtract = subtract;
exports.multiply = multiply;
exports.divide = divide;
exports.mod = mod;
exports.map = map;
exports._mapValue = _mapValue;
exports.array = array;
exports.equal = equal;
exports.notEqual = notEqual;
exports.lessThan = lessThan;
exports.lessThanOrEqual = lessThanOrEqual;
exports.greaterThan = greaterThan;
exports.greaterThanOrEqual = greaterThanOrEqual;
exports.arrayConcat = arrayConcat;
exports.arrayContains = arrayContains;
exports.arrayContainsAny = arrayContainsAny;
exports.arrayContainsAll = arrayContainsAll;
exports.arrayLength = arrayLength;
exports.equalAny = equalAny;
exports.notEqualAny = notEqualAny;
exports.xor = xor;
exports.conditional = conditional;
exports.not = not;
exports.logicalMaximum = logicalMaximum;
exports.logicalMinimum = logicalMinimum;
exports.exists = exists;
exports.reverse = reverse;
exports.arrayFilter = arrayFilter;
exports.arrayTransform = arrayTransform;
exports.arrayTransformWithIndex = arrayTransformWithIndex;
exports.arraySlice = arraySlice;
exports.arrayReverse = arrayReverse;
exports.byteLength = byteLength;
exports.exp = exp;
exports.ceil = ceil;
exports.floor = floor;
exports.countDistinct = countDistinct;
exports.charLength = charLength;
exports.like = like;
exports.regexContains = regexContains;
exports.regexFind = regexFind;
exports.regexFindAll = regexFindAll;
exports.regexMatch = regexMatch;
exports.stringContains = stringContains;
exports.startsWith = startsWith;
exports.endsWith = endsWith;
exports.toLower = toLower;
exports.toUpper = toUpper;
exports.trim = trim;
exports.ltrim = ltrim;
exports.rtrim = rtrim;
exports.stringConcat = stringConcat;
exports.stringIndexOf = stringIndexOf;
exports.stringRepeat = stringRepeat;
exports.stringReplaceAll = stringReplaceAll;
exports.stringReplaceOne = stringReplaceOne;
exports.mapGet = mapGet;
exports.mapSet = mapSet;
exports.mapKeys = mapKeys;
exports.mapValues = mapValues;
exports.mapEntries = mapEntries;
exports.countAll = countAll;
exports.count = count;
exports.sum = sum;
exports.average = average;
exports.minimum = minimum;
exports.maximum = maximum;
exports.first = first;
exports.last = last;
exports.arrayAgg = arrayAgg;
exports.arrayAggDistinct = arrayAggDistinct;
exports.cosineDistance = cosineDistance;
exports.dotProduct = dotProduct;
exports.euclideanDistance = euclideanDistance;
exports.vectorLength = vectorLength;
exports.unixMicrosToTimestamp = unixMicrosToTimestamp;
exports.timestampToUnixMicros = timestampToUnixMicros;
exports.unixMillisToTimestamp = unixMillisToTimestamp;
exports.timestampToUnixMillis = timestampToUnixMillis;
exports.unixSecondsToTimestamp = unixSecondsToTimestamp;
exports.timestampToUnixSeconds = timestampToUnixSeconds;
exports.timestampAdd = timestampAdd;
exports.timestampSubtract = timestampSubtract;
exports.currentTimestamp = currentTimestamp;
exports.and = and;
exports.or = or;
exports.nor = nor;
exports.switchOn = switchOn;
exports.pow = pow;
exports.rand = rand;
exports.round = round;
exports.trunc = trunc;
exports.collectionId = collectionId;
exports.length = length;
exports.ln = ln;
exports.sqrt = sqrt;
exports.stringReverse = stringReverse;
exports.concat = concat;
exports.abs = abs;
exports.ifAbsent = ifAbsent;
exports.ifNull = ifNull;
exports.coalesce = coalesce;
exports.join = join;
exports.log10 = log10;
exports.arraySum = arraySum;
exports.split = split;
exports.timestampTruncate = timestampTruncate;
exports.timestampDiff = timestampDiff;
exports.timestampExtract = timestampExtract;
exports.type = type;
exports.arrayFirst = arrayFirst;
exports.arrayFirstN = arrayFirstN;
exports.arrayLast = arrayLast;
exports.arrayLastN = arrayLastN;
exports.arrayMaximum = arrayMaximum;
exports.arrayMaximumN = arrayMaximumN;
exports.arrayMinimum = arrayMinimum;
exports.arrayMinimumN = arrayMinimumN;
exports.arrayIndexOf = arrayIndexOf;
exports.arrayLastIndexOf = arrayLastIndexOf;
exports.arrayIndexOfAll = arrayIndexOfAll;
exports.isType = isType;
exports.getField = getField;
exports.variable = variable;
exports.currentDocument = currentDocument;
exports.pipelineValue = pipelineValue;
exports.documentMatches = documentMatches;
exports.score = score;
exports.geoDistance = geoDistance;
exports.ascending = ascending;
exports.descending = descending;
const path_1 = require("../path");
const pipeline_util_1 = require("./pipeline-util");
const serializer_1 = require("../serializer");
const util_1 = require("../util");
const options_util_1 = require("./options-util");
/**
 * Represents an expression that can be evaluated to a value within the execution of a `Pipeline`.
 *
 * Expressions are the building blocks for creating complex queries and transformations in
 * Firestore pipelines. They can represent:
 *
 * - **Field references:** Access values from document fields.
 * - **Literals:** Represent constant values (strings, numbers, booleans).
 * - **Function calls:** Apply functions to one or more expressions.
 *
 * The `Expression` class provides a fluent API for building expressions. You can chain together
 * method calls to create complex expressions.
 */
class Expression {
    /**
     * @internal
     * @private
     * Indicates if this expression was created from a literal value passed
     * by the caller.
     */
    _createdFromLiteral = false;
    _protoValueType = 'ProtoValue';
    /**
     * Creates an expression that adds this expression to another expression.
     *
     * @example
     * ```typescript
     * // Add the value of the 'quantity' field and the 'reserve' field.
     * field("quantity").add(field("reserve"));
     * ```
     *
     * @param second The expression or literal to add to this expression.
     * @param others Optional additional expressions or literals to add to this expression.
     * @returns A new `Expression` representing the addition operation.
     */
    add(second, ...others) {
        const values = [second, ...others];
        return new FunctionExpression('add', [
            this,
            ...values.map(value => (0, pipeline_util_1.valueToDefaultExpr)(value)),
        ]);
    }
    /**
     * Wraps the expression in a [BooleanExpression].
     *
     * @returns A `BooleanExpression` representing the same expression.
     */
    asBoolean() {
        if (this instanceof BooleanExpression) {
            return this;
        }
        else if (this instanceof Constant) {
            return new BooleanConstant(this);
        }
        else if (this instanceof Field) {
            return new BooleanField(this);
        }
        else if (this instanceof FunctionExpression) {
            return new BooleanFunctionExpression(this);
        }
        else {
            throw new Error(`Conversion of type ${typeof this} to BooleanExpression not supported.`);
        }
    }
    subtract(subtrahend) {
        return new FunctionExpression('subtract', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(subtrahend),
        ]);
    }
    /**
     * Creates an expression that multiplies this expression by another expression.
     *
     * @example
     * ```typescript
     * // Multiply the 'quantity' field by the 'price' field
     * field("quantity").multiply(field("price"));
     * ```
     *
     * @param second The second expression or literal to multiply by.
     * @param others Optional additional expressions or literals to multiply by.
     * @returns A new `Expression` representing the multiplication operation.
     */
    multiply(second, ...others) {
        return new FunctionExpression('multiply', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(second),
            ...others.map(value => (0, pipeline_util_1.valueToDefaultExpr)(value)),
        ]);
    }
    divide(divisor) {
        return new FunctionExpression('divide', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(divisor),
        ]);
    }
    mod(other) {
        return new FunctionExpression('mod', [this, (0, pipeline_util_1.valueToDefaultExpr)(other)]);
    }
    equal(other) {
        return new FunctionExpression('equal', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(other),
        ]).asBoolean();
    }
    notEqual(other) {
        return new FunctionExpression('not_equal', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(other),
        ]).asBoolean();
    }
    lessThan(other) {
        return new FunctionExpression('less_than', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(other),
        ]).asBoolean();
    }
    lessThanOrEqual(other) {
        return new FunctionExpression('less_than_or_equal', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(other),
        ]).asBoolean();
    }
    greaterThan(other) {
        return new FunctionExpression('greater_than', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(other),
        ]).asBoolean();
    }
    greaterThanOrEqual(other) {
        return new FunctionExpression('greater_than_or_equal', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(other),
        ]).asBoolean();
    }
    /**
     * Creates an expression that concatenates an array expression with one or more other arrays.
     *
     * @example
     * ```typescript
     * // Combine the 'items' array with another array field.
     * field("items").arrayConcat(field("otherItems"));
     * ```
     * @param secondArray Second array expression or array literal to concatenate.
     * @param otherArrays Optional additional array expressions or array literals to concatenate.
     * @returns A new `Expr` representing the concatenated array.
     */
    arrayConcat(secondArray, ...otherArrays) {
        const elements = [secondArray, ...otherArrays];
        const exprValues = elements.map(value => (0, pipeline_util_1.valueToDefaultExpr)(value));
        return new FunctionExpression('array_concat', [this, ...exprValues]);
    }
    arrayContains(element) {
        return new FunctionExpression('array_contains', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(element),
        ]).asBoolean();
    }
    arrayContainsAll(values) {
        const normalizedExpr = Array.isArray(values)
            ? new ListOfExprs(values.map(pipeline_util_1.valueToDefaultExpr))
            : (0, util_1.cast)(values);
        return new FunctionExpression('array_contains_all', [
            this,
            normalizedExpr,
        ]).asBoolean();
    }
    arrayContainsAny(values) {
        const normalizedExpr = Array.isArray(values)
            ? new ListOfExprs(values.map(pipeline_util_1.valueToDefaultExpr))
            : (0, util_1.cast)(values);
        return new FunctionExpression('array_contains_any', [
            this,
            normalizedExpr,
        ]).asBoolean();
    }
    /**
     * Creates an expression that filters an array using a provided alias and predicate expression.
     *
     * @example
     * ```typescript
     * // Filter "scores" to include only values greater than 50
     * field("scores").arrayFilter("score", greaterThan(variable("score"), 50));
     * ```
     *
     * @param alias The variable name to use for each element.
     * @param filter The predicate boolean expression to evaluate for each element.
     * @returns A new `Expression` representing the filtered array.
     */
    arrayFilter(alias, filter) {
        return new FunctionExpression('array_filter', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(alias),
            filter,
        ]);
    }
    /**
     * Creates an expression that applies a provided transformation to each element in an array.
     *
     * @example
     * ```typescript
     * // Transform the 'scores' array by multiplying each score by 10
     * field("scores").arrayTransform("score", multiply(variable("score"), 10));
     * ```
     *
     * @param elementAlias The variable name to use for each element.
     * @param transform The lambda expression used to transform the elements.
     * @returns A new `Expression` representing the arrayTransform operation.
     */
    arrayTransform(elementAlias, transform) {
        return new FunctionExpression('array_transform', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(elementAlias),
            transform,
        ]);
    }
    /**
     * Creates an expression that applies a provided transformation to each element in an array, providing the element's index to the transformation expression.
     *
     * @example
     * ```typescript
     * // Transform the 'scores' array by adding the index to each score
     * field("scores").arrayTransformWithIndex("score", "i", add(variable("score"), variable("i")));
     * ```
     *
     * @param elementAlias The variable name to use for each element.
     * @param indexAlias The variable name to use for the current index.
     * @param transform The lambda expression used to transform the elements.
     * @returns A new `Expression` representing the arrayTransformWithIndex operation.
     */
    arrayTransformWithIndex(elementAlias, indexAlias, transform) {
        return new FunctionExpression('array_transform', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(elementAlias),
            (0, pipeline_util_1.valueToDefaultExpr)(indexAlias),
            transform,
        ]);
    }
    /**
     * Creates an expression that returns a slice of an array from `offset` with `length` elements.
     *
     * @example
     * ```typescript
     * // Get 5 elements from the 'items' array starting from index 2
     * field("items").arraySlice(2, 5);
     *
     * // Get n number of elements from the 'items' array starting from index 2
     * field("items").arraySlice(2, field("count"));
     * ```
     *
     * @param offset The starting offset.
     * @param length The optional length of the slice.
     * @returns A new `Expression` representing the sliced array.
     */
    arraySlice(offset, length) {
        const args = [this, (0, pipeline_util_1.valueToDefaultExpr)(offset)];
        if (length !== undefined) {
            args.push((0, pipeline_util_1.valueToDefaultExpr)(length));
        }
        return new FunctionExpression('array_slice', args);
    }
    /**
     * Creates an expression that reverses an array.
     *
     * @example
     * ```typescript
     * // Reverse the value of the 'myArray' field.
     * field("myArray").arrayReverse();
     * ```
     *
     * @returns A new `Expression` representing the reversed array.
     */
    arrayReverse() {
        return new FunctionExpression('array_reverse', [this]);
    }
    /**
     * Creates an expression that calculates the length of an array.
     *
     * @example
     * ```typescript
     * // Get the number of items in the 'cart' array
     * field("cart").arrayLength();
     * ```
     *
     * @returns A new `Expression` representing the length of the array.
     */
    arrayLength() {
        return new FunctionExpression('array_length', [this]);
    }
    /**
     * Returns the first element of the array.
     *
     * @example
     * ```typescript
     * // Get the first element of the 'myArray' field.
     * field("myArray").arrayFirst();
     * ```
     *
     * @returns A new `Expression` representing the first element.
     */
    arrayFirst() {
        return new FunctionExpression('array_first', [this]);
    }
    arrayFirstN(n) {
        return new FunctionExpression('array_first_n', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(n),
        ]);
    }
    /**
     * Returns the last element of the array.
     *
     * @example
     * ```typescript
     * // Get the last element of the 'myArray' field.
     * field("myArray").arrayLast();
     * ```
     *
     * @returns A new `Expression` representing the last element.
     */
    arrayLast() {
        return new FunctionExpression('array_last', [this]);
    }
    arrayLastN(n) {
        return new FunctionExpression('array_last_n', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(n),
        ]);
    }
    /**
     * Returns the maximum value in the array.
     *
     * @example
     * ```typescript
     * // Get the maximum value of the 'myArray' field.
     * field("myArray").arrayMaximum();
     * ```
     *
     * @returns A new `Expression` representing the maximum value.
     */
    arrayMaximum() {
        return new FunctionExpression('maximum', [this]);
    }
    arrayMaximumN(n) {
        return new FunctionExpression('maximum_n', [this, (0, pipeline_util_1.valueToDefaultExpr)(n)]);
    }
    /**
     * Returns the minimum value in the array.
     *
     * @example
     * ```typescript
     * // Get the minimum value of the 'myArray' field.
     * field("myArray").arrayMinimum();
     * ```
     *
     * @returns A new `Expression` representing the minimum value.
     */
    arrayMinimum() {
        return new FunctionExpression('minimum', [this]);
    }
    arrayMinimumN(n) {
        return new FunctionExpression('minimum_n', [this, (0, pipeline_util_1.valueToDefaultExpr)(n)]);
    }
    arrayIndexOf(search) {
        return new FunctionExpression('array_index_of', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(search),
            (0, pipeline_util_1.valueToDefaultExpr)('first'),
        ]);
    }
    arrayLastIndexOf(search) {
        return new FunctionExpression('array_index_of', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(search),
            (0, pipeline_util_1.valueToDefaultExpr)('last'),
        ]);
    }
    arrayIndexOfAll(search) {
        return new FunctionExpression('array_index_of_all', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(search),
        ]);
    }
    equalAny(others) {
        const exprOthers = Array.isArray(others)
            ? new ListOfExprs(others.map(pipeline_util_1.valueToDefaultExpr))
            : (0, util_1.cast)(others);
        return new FunctionExpression('equal_any', [this, exprOthers]).asBoolean();
    }
    notEqualAny(others) {
        const exprOthers = Array.isArray(others)
            ? new ListOfExprs(others.map(pipeline_util_1.valueToDefaultExpr))
            : (0, util_1.cast)(others);
        return new FunctionExpression('not_equal_any', [
            this,
            exprOthers,
        ]).asBoolean();
    }
    /**
     * Creates an expression that checks if a field exists in the document.
     *
     * @example
     * ```typescript
     * // Check if the document has a field named "phoneNumber"
     * field("phoneNumber").exists();
     * ```
     *
     * @returns A new `Expression` representing the 'exists' check.
     */
    exists() {
        return new FunctionExpression('exists', [this]).asBoolean();
    }
    /**
     * Creates an expression that calculates the character length of a string in UTF-8.
     *
     * @example
     * ```typescript
     * // Get the character length of the 'name' field in its UTF-8 form.
     * field("name").charLength();
     * ```
     *
     * @returns A new `Expression` representing the length of the string.
     */
    charLength() {
        return new FunctionExpression('char_length', [this]);
    }
    like(stringOrExpr) {
        return new FunctionExpression('like', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(stringOrExpr),
        ]).asBoolean();
    }
    regexContains(stringOrExpr) {
        return new FunctionExpression('regex_contains', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(stringOrExpr),
        ]).asBoolean();
    }
    regexFind(stringOrExpr) {
        return new FunctionExpression('regex_find', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(stringOrExpr),
        ]);
    }
    regexFindAll(stringOrExpr) {
        return new FunctionExpression('regex_find_all', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(stringOrExpr),
        ]);
    }
    regexMatch(stringOrExpr) {
        return new FunctionExpression('regex_match', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(stringOrExpr),
        ]).asBoolean();
    }
    stringContains(stringOrExpr) {
        return new FunctionExpression('string_contains', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(stringOrExpr),
        ]).asBoolean();
    }
    startsWith(stringOrExpr) {
        return new FunctionExpression('starts_with', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(stringOrExpr),
        ]).asBoolean();
    }
    endsWith(stringOrExpr) {
        return new FunctionExpression('ends_with', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(stringOrExpr),
        ]).asBoolean();
    }
    /**
     * Creates an expression that converts a string to lowercase.
     *
     * @example
     * ```typescript
     * // Convert the 'name' field to lowercase
     * field("name").toLower();
     * ```
     *
     * @returns A new `Expression` representing the lowercase string.
     */
    toLower() {
        return new FunctionExpression('to_lower', [this]);
    }
    /**
     * Creates an expression that converts a string to uppercase.
     *
     * @example
     * ```typescript
     * // Convert the 'title' field to uppercase
     * field("title").toUpper();
     * ```
     *
     * @returns A new `Expression` representing the uppercase string.
     */
    toUpper() {
        return new FunctionExpression('to_upper', [this]);
    }
    /**
     * Creates an expression that removes leading and trailing characters from a string or byte array.
     *
     * @example
     * ```typescript
     * // Trim whitespace from the 'userInput' field
     * field("userInput").trim();
     *
     * // Trim quotes from the 'userInput' field
     * field("userInput").trim('"');
     * ```
     * @param valueToTrim Optional This parameter is treated as a set of characters or bytes that will be
     * trimmed from the input. If not specified, then whitespace will be trimmed.
     * @returns A new `Expr` representing the trimmed string or byte array.
     */
    trim(valueToTrim) {
        const args = [this];
        if (valueToTrim) {
            args.push((0, pipeline_util_1.valueToDefaultExpr)(valueToTrim));
        }
        return new FunctionExpression('trim', args);
    }
    /**
     * Trims whitespace or a specified set of characters/bytes from the beginning of a string or byte array.
     *
     * @example
     * ```typescript
     * // Trim whitespace from the beginning of the 'userInput' field
     * field("userInput").ltrim();
     *
     * // Trim quotes from the beginning of the 'userInput' field
     * field("userInput").ltrim('"');
     * ```
     *
     * @param valueToTrim Optional. A string or byte array containing the characters/bytes to trim.
     * If not specified, whitespace will be trimmed.
     * @returns A new `Expression` representing the trimmed string.
     */
    ltrim(valueToTrim) {
        const args = [this];
        if (valueToTrim) {
            args.push((0, pipeline_util_1.valueToDefaultExpr)(valueToTrim));
        }
        return new FunctionExpression('ltrim', args);
    }
    /**
     * Trims whitespace or a specified set of characters/bytes from the end of a string or byte array.
     *
     * @example
     * ```typescript
     * // Trim whitespace from the end of the 'userInput' field
     * field("userInput").rtrim();
     *
     * // Trim quotes from the end of the 'userInput' field
     * field("userInput").rtrim('"');
     * ```
     *
     * @param valueToTrim Optional. A string or byte array containing the characters/bytes to trim.
     * If not specified, whitespace will be trimmed.
     * @returns A new `Expression` representing the trimmed string or byte array.
     */
    rtrim(valueToTrim) {
        const args = [this];
        if (valueToTrim) {
            args.push((0, pipeline_util_1.valueToDefaultExpr)(valueToTrim));
        }
        return new FunctionExpression('rtrim', args);
    }
    /**
     * Creates an expression that concatenates string expressions together.
     *
     * @example
     * ```typescript
     * // Combine the 'firstName', " ", and 'lastName' fields into a single string
     * field("firstName").stringConcat(constant(" "), field("lastName"));
     * ```
     *
     * @param secondString The additional expression or string literal to concatenate.
     * @param otherStrings Optional additional expressions or string literals to concatenate.
     * @returns A new `Expression` representing the concatenated string.
     */
    stringConcat(secondString, ...otherStrings) {
        const elements = [secondString, ...otherStrings];
        const exprs = elements.map(pipeline_util_1.valueToDefaultExpr);
        return new FunctionExpression('string_concat', [this, ...exprs]);
    }
    /**
     * Creates an expression that finds the index of the first occurrence of a substring or byte sequence.
     *
     * @example
     * ```typescript
     * // Find the index of "foo" in the 'text' field
     * field("text").stringIndexOf("foo");
     * ```
     *
     * @param search The substring or byte sequence to search for.
     * @returns A new `Expression` representing the index of the first occurrence.
     */
    stringIndexOf(search) {
        return new FunctionExpression('string_index_of', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(search),
        ]);
    }
    /**
     * Creates an expression that repeats a string or byte array a specified number of times.
     *
     * @example
     * ```typescript
     * // Repeat the 'label' field 3 times
     * field("label").stringRepeat(3);
     * ```
     *
     * @param repetitions The number of times to repeat the string or byte array.
     * @returns A new `Expression` representing the repeated string or byte array.
     */
    stringRepeat(repetitions) {
        return new FunctionExpression('string_repeat', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(repetitions),
        ]);
    }
    /**
     * Creates an expression that replaces all occurrences of a substring or byte sequence with a replacement.
     *
     * @example
     * ```typescript
     * // Replace all occurrences of "foo" with "bar" in the 'text' field
     * field("text").stringReplaceAll("foo", "bar");
     * ```
     *
     * @param find The substring or byte sequence to search for.
     * @param replacement The replacement string or byte sequence.
     * @returns A new `Expression` representing the string or byte array with replacements.
     */
    stringReplaceAll(find, replacement) {
        return new FunctionExpression('string_replace_all', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(find),
            (0, pipeline_util_1.valueToDefaultExpr)(replacement),
        ]);
    }
    /**
     * Creates an expression that replaces the first occurrence of a substring or byte sequence with a replacement.
     *
     * @example
     * ```typescript
     * // Replace the first occurrence of "foo" with "bar" in the 'text' field
     * field("text").stringReplaceOne("foo", "bar");
     * ```
     *
     * @param find The substring or byte sequence to search for.
     * @param replacement The replacement string or byte sequence.
     * @returns A new `Expression` representing the string or byte array with the replacement.
     */
    stringReplaceOne(find, replacement) {
        return new FunctionExpression('string_replace_one', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(find),
            (0, pipeline_util_1.valueToDefaultExpr)(replacement),
        ]);
    }
    /**
     * Creates an expression that concatenates expression results together.
     *
     * @example
     * ```typescript
     * // Combine the 'firstName', ' ', and 'lastName' fields into a single value.
     * field("firstName").concat(constant(" "), field("lastName"));
     * ```
     *
     * @param second The additional expression or literal to concatenate.
     * @param others Optional additional expressions or literals to concatenate.
     * @returns A new `Expr` representing the concatenated value.
     */
    concat(second, ...others) {
        const elements = [second, ...others];
        const exprs = elements.map(pipeline_util_1.valueToDefaultExpr);
        return new FunctionExpression('concat', [this, ...exprs]);
    }
    /**
     * Creates an expression that reverses this string or bytes expression.
     *
     * @example
     * ```typescript
     * // Reverse the value of the 'myString' field.
     * field("myString").reverse();
     * ```
     *
     * @returns A new `Expression` representing the reversed string or bytes.
     */
    reverse() {
        return new FunctionExpression('reverse', [this]);
    }
    /**
     * Creates an expression that calculates the length of this string expression in bytes.
     *
     * @example
     * ```typescript
     * // Calculate the length of the 'myString' field in bytes.
     * field("myString").byteLength();
     * ```
     *
     * @returns A new `Expression` representing the length of the string in bytes.
     */
    byteLength() {
        return new FunctionExpression('byte_length', [this]);
    }
    /**
     * Creates an expression that computes the ceiling of a numeric value.
     *
     * @example
     * ```typescript
     * // Compute the ceiling of the 'price' field.
     * field("price").ceil();
     * ```
     *
     * @returns A new `Expression` representing the ceiling of the numeric value.
     */
    ceil() {
        return new FunctionExpression('ceil', [this]);
    }
    /**
     * Creates an expression that computes the floor of a numeric value.
     *
     * @example
     * ```typescript
     * // Compute the floor of the 'price' field.
     * field("price").floor();
     * ```
     *
     * @returns A new `Expression` representing the floor of the numeric value.
     */
    floor() {
        return new FunctionExpression('floor', [this]);
    }
    /**
     * Creates an expression that computes the absolute value of a numeric value.
     *
     * @example
     * ```typescript
     * // Compute the absolute value of the 'price' field.
     * field("price").abs();
     * ```
     *
     * @returns A new `Expr` representing the absolute value of the numeric value.
     */
    abs() {
        return new FunctionExpression('abs', [this]);
    }
    /**
     * Creates an expression that computes e to the power of this expression.
     *
     * @example
     * ```typescript
     * // Compute e to the power of the 'value' field.
     * field("value").exp();
     * ```
     *
     * @returns A new `Expression` representing the exp of the numeric value.
     */
    exp() {
        return new FunctionExpression('exp', [this]);
    }
    /**
     * Accesses a value from a map (object) field using the provided key.
     *
     * @example
     * ```typescript
     * // Get the 'city' value from the 'address' map field
     * field("address").mapGet("city");
     * ```
     *
     * @param subfield The key to access in the map.
     * @returns A new `Expression` representing the value associated with the given key in the map.
     */
    mapGet(subfield) {
        return new FunctionExpression('map_get', [this, constant(subfield)]);
    }
    /**
     * Creates an expression that returns a new map with the specified entries added or updated.
     *
     * @remarks
     * Note that `mapSet` only performs shallow updates to the map. Setting a value to `null`
     * will retain the key with a `null` value. To remove a key entirely, use `mapRemove`.
     *
     * @example
     * ```typescript
     * // Set the 'city' to "San Francisco" in the 'address' map
     * field("address").mapSet("city", "San Francisco");
     * ```
     *
     * @param key The key to set. Must be a string or a constant string expression.
     * @param value The value to set.
     * @param moreKeyValues Additional key-value pairs to set.
     * @returns A new `Expression` representing the map with the entries set.
     */
    mapSet(key, value, ...moreKeyValues) {
        const args = [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(key),
            (0, pipeline_util_1.valueToDefaultExpr)(value),
            ...moreKeyValues.map(pipeline_util_1.valueToDefaultExpr),
        ];
        return new FunctionExpression('map_set', args);
    }
    /**
     * Creates an expression that returns the keys of a map.
     *
     * @remarks
     * While the backend generally preserves insertion order, relying on the
     * order of the output array is not guaranteed and should be avoided.
     *
     * @example
     * ```typescript
     * // Get the keys of the 'address' map
     * field("address").mapKeys();
     * ```
     *
     * @returns A new `Expression` representing the keys of the map.
     */
    mapKeys() {
        return new FunctionExpression('map_keys', [this]);
    }
    /**
     * Creates an expression that returns the values of a map.
     *
     * @remarks
     * While the backend generally preserves insertion order, relying on the
     * order of the output array is not guaranteed and should be avoided.
     *
     * @example
     * ```typescript
     * // Get the values of the 'address' map
     * field("address").mapValues();
     * ```
     *
     * @returns A new `Expression` representing the values of the map.
     */
    mapValues() {
        return new FunctionExpression('map_values', [this]);
    }
    /**
     * Creates an expression that returns the entries of a map as an array of maps,
     * where each map contains a `"k"` property for the key and a `"v"` property for the value.
     * For example: `[{ k: "key1", v: "value1" }, ...]`.
     *
     * @remarks
     * While the backend generally preserves insertion order, relying on the
     * order of the output array is not guaranteed and should be avoided.
     *
     * @example
     * ```typescript
     * // Get the entries of the 'address' map
     * field("address").mapEntries();
     * ```
     *
     * @returns A new `Expression` representing the entries of the map.
     */
    mapEntries() {
        return new FunctionExpression('map_entries', [this]);
    }
    /**
     * Creates an aggregation that counts the number of stage inputs with valid evaluations of the
     * expression or field.
     *
     * @example
     * ```typescript
     * // Count the total number of products
     * field("productId").count().as("totalProducts");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'count' aggregation.
     */
    count() {
        return new AggregateFunction('count', [this]);
    }
    /**
     * Creates an aggregation that calculates the sum of a numeric field across multiple stage inputs.
     *
     * @example
     * ```typescript
     * // Calculate the total revenue from a set of orders
     * field("orderAmount").sum().as("totalRevenue");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'sum' aggregation.
     */
    sum() {
        return new AggregateFunction('sum', [this]);
    }
    /**
     * Creates an aggregation that calculates the average (mean) of a numeric field across multiple
     * stage inputs.
     *
     * @example
     * ```typescript
     * // Calculate the average age of users
     * field("age").average().as("averageAge");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'average' aggregation.
     */
    average() {
        return new AggregateFunction('average', [this]);
    }
    /**
     * Creates an aggregation that finds the minimum value of a field across multiple stage inputs.
     *
     * @example
     * ```typescript
     * // Find the lowest price of all products
     * field("price").minimum().as("lowestPrice");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'min' aggregation.
     */
    minimum() {
        return new AggregateFunction('minimum', [this]);
    }
    /**
     * Creates an aggregation that finds the maximum value of a field across multiple stage inputs.
     *
     * @example
     * ```typescript
     * // Find the highest score in a leaderboard
     * field("score").maximum().as("highestScore");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'max' aggregation.
     */
    maximum() {
        return new AggregateFunction('maximum', [this]);
    }
    /**
     * Creates an aggregation that finds the first value of an expression across multiple stage inputs.
     *
     * @example
     * ```typescript
     * // Find the first value of the 'rating' field
     * field("rating").first().as("firstRating");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'first' aggregation.
     */
    first() {
        return new AggregateFunction('first', [this]);
    }
    /**
     * Creates an aggregation that finds the last value of an expression across multiple stage inputs.
     *
     * @example
     * ```typescript
     * // Find the last value of the 'rating' field
     * field("rating").last().as("lastRating");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'last' aggregation.
     */
    last() {
        return new AggregateFunction('last', [this]);
    }
    /**
     * Creates an aggregation that collects all values of an expression across multiple stage inputs
     * into an array.
     *
     * @remarks
     * If the expression resolves to an absent value, it is converted to `null`.
     * The order of elements in the output array is not stable and shouldn't be relied upon.
     *
     * @example
     * ```typescript
     * // Collect all tags from books into an array
     * field("tags").arrayAgg().as("allTags");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'array_agg' aggregation.
     */
    arrayAgg() {
        return new AggregateFunction('array_agg', [this]);
    }
    /**
     * Creates an aggregation that collects all distinct values of an expression across multiple stage
     * inputs into an array.
     *
     * @remarks
     * If the expression resolves to an absent value, it is converted to `null`.
     * The order of elements in the output array is not stable and shouldn't be relied upon.
     *
     * @example
     * ```typescript
     * // Collect all distinct tags from books into an array
     * field("tags").arrayAggDistinct().as("allDistinctTags");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'array_agg_distinct' aggregation.
     */
    arrayAggDistinct() {
        return new AggregateFunction('array_agg_distinct', [this]);
    }
    /**
     * Creates an aggregation that counts the number of distinct values of the expression or field.
     *
     * @example
     * ```typescript
     * // Count the distinct number of products
     * field("productId").countDistinct().as("distinctProducts");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'count_distinct' aggregation.
     */
    countDistinct() {
        return new AggregateFunction('count_distinct', [this]);
    }
    /**
     * Creates an expression that returns the larger value between this expression and another expression, based on Firestore's value type ordering.
     *
     * @example
     * ```typescript
     * // Returns the larger value between the 'timestamp' field and the current timestamp.
     * field("timestamp").logicalMaximum(Function.currentTimestamp());
     * ```
     *
     * @param second The second expression or literal to compare with.
     * @param others Optional additional expressions or literals to compare with.
     * @returns A new `Expression` representing the logical max operation.
     */
    logicalMaximum(second, ...others) {
        const values = [second, ...others];
        return new FunctionExpression('maximum', [
            this,
            ...values.map(pipeline_util_1.valueToDefaultExpr),
        ]);
    }
    /**
     * Creates an expression that returns the smaller value between this expression and another expression, based on Firestore's value type ordering.
     *
     * @example
     * ```typescript
     * // Returns the smaller value between the 'timestamp' field and the current timestamp.
     * field("timestamp").logicalMinimum(Function.currentTimestamp());
     * ```
     *
     * @param second The second expression or literal to compare with.
     * @param others Optional additional expressions or literals to compare with.
     * @returns A new `Expression` representing the logical min operation.
     */
    logicalMinimum(second, ...others) {
        const values = [second, ...others];
        return new FunctionExpression('minimum', [
            this,
            ...values.map(pipeline_util_1.valueToDefaultExpr),
        ]);
    }
    /**
     * Creates an expression that calculates the length (number of dimensions) of this Firestore Vector expression.
     *
     * @example
     * ```typescript
     * // Get the vector length (dimension) of the field 'embedding'.
     * field("embedding").vectorLength();
     * ```
     *
     * @returns A new `Expression` representing the length of the vector.
     */
    vectorLength() {
        return new FunctionExpression('vector_length', [this]);
    }
    cosineDistance(other) {
        return new FunctionExpression('cosine_distance', [
            this,
            (0, pipeline_util_1.vectorToExpr)(other),
        ]);
    }
    dotProduct(other) {
        return new FunctionExpression('dot_product', [this, (0, pipeline_util_1.vectorToExpr)(other)]);
    }
    euclideanDistance(other) {
        return new FunctionExpression('euclidean_distance', [
            this,
            (0, pipeline_util_1.vectorToExpr)(other),
        ]);
    }
    /**
     * Creates an expression that interprets this expression as the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
     * and returns a timestamp.
     *
     * @example
     * ```typescript
     * // Interpret the 'microseconds' field as microseconds since epoch.
     * field("microseconds").unixMicrosToTimestamp();
     * ```
     *
     * @returns A new `Expression` representing the timestamp.
     */
    unixMicrosToTimestamp() {
        return new FunctionExpression('unix_micros_to_timestamp', [this]);
    }
    /**
     * Creates an expression that converts this timestamp expression to the number of microseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
     *
     * @example
     * ```typescript
     * // Convert the 'timestamp' field to microseconds since epoch.
     * field("timestamp").timestampToUnixMicros();
     * ```
     *
     * @returns A new `Expression` representing the number of microseconds since epoch.
     */
    timestampToUnixMicros() {
        return new FunctionExpression('timestamp_to_unix_micros', [this]);
    }
    /**
     * Creates an expression that interprets this expression as the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC)
     * and returns a timestamp.
     *
     * @example
     * ```typescript
     * // Interpret the 'milliseconds' field as milliseconds since epoch.
     * field("milliseconds").unixMillisToTimestamp();
     * ```
     *
     * @returns A new `Expression` representing the timestamp.
     */
    unixMillisToTimestamp() {
        return new FunctionExpression('unix_millis_to_timestamp', [this]);
    }
    /**
     * Creates an expression that converts this timestamp expression to the number of milliseconds since the Unix epoch (1970-01-01 00:00:00 UTC).
     *
     * @example
     * ```typescript
     * // Convert the 'timestamp' field to milliseconds since epoch.
     * field("timestamp").timestampToUnixMillis();
     * ```
     *
     * @returns A new `Expression` representing the number of milliseconds since epoch.
     */
    timestampToUnixMillis() {
        return new FunctionExpression('timestamp_to_unix_millis', [this]);
    }
    /**
     * Creates an expression that interprets this expression as the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC)
     * and returns a timestamp.
     *
     * @example
     * ```typescript
     * // Interpret the 'seconds' field as seconds since epoch.
     * field("seconds").unixSecondsToTimestamp();
     * ```
     *
     * @returns A new `Expression` representing the timestamp.
     */
    unixSecondsToTimestamp() {
        return new FunctionExpression('unix_seconds_to_timestamp', [this]);
    }
    /**
     * Creates an expression that converts this timestamp expression to the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC).
     *
     * @example
     * ```typescript
     * // Convert the 'timestamp' field to seconds since epoch.
     * field("timestamp").timestampToUnixSeconds();
     * ```
     *
     * @returns A new `Expression` representing the number of seconds since epoch.
     */
    timestampToUnixSeconds() {
        return new FunctionExpression('timestamp_to_unix_seconds', [this]);
    }
    timestampAdd(unit, amount) {
        return new FunctionExpression('timestamp_add', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(unit),
            (0, pipeline_util_1.valueToDefaultExpr)(amount),
        ]);
    }
    timestampSubtract(unit, amount) {
        return new FunctionExpression('timestamp_subtract', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(unit),
            (0, pipeline_util_1.valueToDefaultExpr)(amount),
        ]);
    }
    timestampDiff(start, unit) {
        return new FunctionExpression('timestamp_diff', [
            this,
            (0, pipeline_util_1.fieldOrExpression)(start),
            (0, pipeline_util_1.valueToDefaultExpr)(unit),
        ]);
    }
    timestampExtract(part, timezone) {
        const args = [this, (0, pipeline_util_1.valueToDefaultExpr)(part)];
        if (timezone) {
            args.push((0, pipeline_util_1.valueToDefaultExpr)(timezone));
        }
        return new FunctionExpression('timestamp_extract', args);
    }
    /**
     * Creates an expression that returns the document ID from a path.
     *
     * @example
     * ```typescript
     * // Get the document ID from a path.
     * field("__path__").documentId();
     * ```
     *
     * @returns A new `Expression` representing the documentId operation.
     */
    documentId() {
        return new FunctionExpression('document_id', [this]);
    }
    /**
     *
     * Creates an expression that returns the parent document of a document reference.
     *
     * @example
     * ```typescript
     * // Get the parent document of a document reference.
     * field("__path__").parent();
     * ```
     *
     * @returns A new `Expression` representing the parent operation.
     */
    parent() {
        return new FunctionExpression('parent', [this]);
    }
    substring(position, length) {
        const positionExpr = (0, pipeline_util_1.valueToDefaultExpr)(position);
        if (length === undefined) {
            return new FunctionExpression('substring', [this, positionExpr]);
        }
        else {
            return new FunctionExpression('substring', [
                this,
                positionExpr,
                (0, pipeline_util_1.valueToDefaultExpr)(length),
            ]);
        }
    }
    arrayGet(index) {
        return new FunctionExpression('array_get', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(index),
        ]);
    }
    /**
     * Creates an expression that checks if a given expression produces an error.
     *
     * @example
     * ```typescript
     * // Check if the result of a calculation is an error
     * field("title").arrayContains(1).isError();
     * ```
     *
     * @returns A new `BooleanExpression` representing the 'isError' check.
     */
    isError() {
        return new FunctionExpression('is_error', [this]).asBoolean();
    }
    ifError(catchValue) {
        return new FunctionExpression('if_error', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(catchValue),
        ]);
    }
    /**
     * Creates an expression that returns `true` if the result of this expression
     * is absent. Otherwise, returns `false` even if the value is `null`.
     *
     * ```typescript
     * // Check if the field `value` is absent.
     * field("value").isAbsent();
     * ```
     *
     * @returns A new `BooleanExpression` representing the 'isAbsent' check.
     */
    isAbsent() {
        return new FunctionExpression('is_absent', [this]).asBoolean();
    }
    mapRemove(stringExpr) {
        return new FunctionExpression('map_remove', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(stringExpr),
        ]);
    }
    /**
     * Creates an expression that merges multiple map values.
     *
     * ```
     * // Merges the map in the settings field with, a map literal, and a map in
     * // that is conditionally returned by another expression
     * field('settings').mapMerge({ enabled: true }, conditional(field('isAdmin'), { admin: true}, {})
     * ```
     *
     * @param secondMap A required second map to merge. Represented as a literal or
     * an expression that returns a map.
     * @param otherMaps Optional additional maps to merge. Each map is represented
     * as a literal or an expression that returns a map.
     *
     * @returns A new `FirestoreFunction` representing the 'mapMerge' operation.
     */
    mapMerge(secondMap, ...otherMaps) {
        const secondMapExpr = (0, pipeline_util_1.valueToDefaultExpr)(secondMap);
        const otherMapExprs = otherMaps.map(pipeline_util_1.valueToDefaultExpr);
        return new FunctionExpression('map_merge', [
            this,
            secondMapExpr,
            ...otherMapExprs,
        ]);
    }
    pow(exponent) {
        return new FunctionExpression('pow', [this, (0, pipeline_util_1.valueToDefaultExpr)(exponent)]);
    }
    trunc(decimalPlaces) {
        if (decimalPlaces === undefined) {
            return new FunctionExpression('trunc', [this]);
        }
        return new FunctionExpression('trunc', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(decimalPlaces),
        ]);
    }
    round(decimalPlaces) {
        if (decimalPlaces === undefined) {
            return new FunctionExpression('round', [this]);
        }
        else {
            return new FunctionExpression('round', [
                this,
                (0, pipeline_util_1.valueToDefaultExpr)(decimalPlaces),
            ]);
        }
    }
    /**
     * Creates an expression that returns the collection ID from a path.
     *
     * ```typescript
     * // Get the collection ID from a path.
     * field("__path__").collectionId();
     * ```
     *
     * @returns A new `Expression` representing the collectionId operation.
     */
    collectionId() {
        return new FunctionExpression('collection_id', [this]);
    }
    /**
     * Creates an expression that calculates the length of a string, array, map, vector, or bytes.
     *
     * ```typescript
     * // Get the length of the 'name' field.
     * field("name").length();
     *
     * // Get the number of items in the 'cart' array.
     * field("cart").length();
     * ```
     *
     * @returns A new `Expression` representing the length of the string, array, map, vector, or bytes.
     */
    length() {
        return new FunctionExpression('length', [this]);
    }
    /**
     * Creates an expression that computes the natural logarithm of a numeric value.
     *
     * ```typescript
     * // Compute the natural logarithm of the 'value' field.
     * field("value").ln();
     * ```
     *
     * @returns A new `Expression` representing the natural logarithm of the numeric value.
     */
    ln() {
        return new FunctionExpression('ln', [this]);
    }
    /**
     * Creates an expression that computes the square root of a numeric value.
     *
     * ```typescript
     * // Compute the square root of the 'value' field.
     * field("value").sqrt();
     * ```
     *
     * @returns A new `Expression` representing the square root of the numeric value.
     */
    sqrt() {
        return new FunctionExpression('sqrt', [this]);
    }
    /**
     * Creates an expression that reverses a string.
     *
     * ```typescript
     * // Reverse the value of the 'myString' field.
     * field("myString").stringReverse();
     * ```
     *
     * @returns A new `Expression` representing the reversed string.
     */
    stringReverse() {
        return new FunctionExpression('string_reverse', [this]);
    }
    ifAbsent(elseValueOrExpression) {
        return new FunctionExpression('if_absent', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(elseValueOrExpression),
        ]);
    }
    ifNull(elseValueOrExpression) {
        return new FunctionExpression('if_null', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(elseValueOrExpression),
        ]);
    }
    /**
     * Creates an expression that returns the first non-null, non-absent argument, without evaluating
     * the rest of the arguments. When all arguments are null or absent, returns the last argument.
     *
     * @example
     * ```typescript
     * // Returns the value of the first non-null, non-absent field among 'preferredName', 'fullName',
     * // or the last argument if all previous fields are null.
     * field("preferredName").coalesce(field("fullName"), "Anonymous");
     * ```
     *
     * @param replacement - The value to use if this expression evaluates to null.
     * @param others - Optional additional values to check if previous values are null.
     * @returns A new [Expression] representing the coalesce operation.
     */
    coalesce(replacement, ...others) {
        const values = [replacement, ...others];
        return new FunctionExpression('coalesce', [
            this,
            ...values.map(pipeline_util_1.valueToDefaultExpr),
        ]);
    }
    join(delimeterValueOrExpression) {
        return new FunctionExpression('join', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(delimeterValueOrExpression),
        ]);
    }
    /**
     * Creates an expression that computes the base-10 logarithm of a numeric value.
     *
     * ```typescript
     * // Compute the base-10 logarithm of the 'value' field.
     * field("value").log10();
     * ```
     *
     * @returns A new `Expr` representing the base-10 logarithm of the numeric value.
     */
    log10() {
        return new FunctionExpression('log10', [this]);
    }
    /**
     * Creates an expression that computes the sum of the elements in an array.
     *
     * ```typescript
     * // Compute the sum of the elements in the 'scores' field.
     * field("scores").arraySum();
     * ```
     *
     * @returns A new `Expr` representing the sum of the elements in the array.
     */
    arraySum() {
        return new FunctionExpression('sum', [this]);
    }
    split(delimiter) {
        return new FunctionExpression('split', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(delimiter),
        ]);
    }
    timestampTruncate(granularity, timezone) {
        const args = [this, (0, pipeline_util_1.valueToDefaultExpr)(granularity)];
        if (timezone) {
            args.push((0, pipeline_util_1.valueToDefaultExpr)(timezone));
        }
        return new FunctionExpression('timestamp_trunc', args);
    }
    /**
     * Creates an expression that returns the data type of this expression's result, as a string.
     *
     * @example
     * ```typescript
     * // Get the data type of the value in field 'title'
     * field('title').type()
     * ```
     *
     * @returns A new {Expression} representing the data type.
     */
    type() {
        return new FunctionExpression('type', [this]);
    }
    /**
     * Creates an expression that checks if the result of this expression is of the given type.
     *
     * @remarks Null or undefined fields evaluate to skip/error. Use `ifAbsent()` / `isAbsent()` to evaluate missing data.
     * Supported values for `type` are:
     * `'null'`, `'array'`, `'boolean'`, `'bytes'`, `'timestamp'`, `'geo_point'`, `'number'`,
     * `'int32'`, `'int64'`, `'float64'`, `'decimal128'`, `'map'`, `'reference'`, `'string'`,
     * `'vector'`, `'max_key'`, `'min_key'`, `'object_id'`, `'regex'`, `'request_timestamp'`.
     *
     * @example
     * ```typescript
     * // Check if the 'price' field is specifically an integer (not just 'number')
     * field('price').isType('int64');
     * ```
     *
     * @param type The type to check for.
     * @returns A new `BooleanExpression` that evaluates to true if the expression's result is of the given type, false otherwise.
     */
    isType(type) {
        return new FunctionExpression('is_type', [
            this,
            constant(type),
        ]).asBoolean();
    }
    /**
     * Creates an expression that returns the value of a field from the document that results from the evaluation of this expression.
     *
     * @example
     * ```typescript
     * // Get the value of the "city" field in the "address" document.
     * field("address").getField("city")
     * ```
     *
     * @param key The field to access in the document.
     * @returns A new `Expression` representing the value of the field in the document.
     */
    getField(key) {
        return new FunctionExpression('get_field', [this, (0, pipeline_util_1.valueToDefaultExpr)(key)]);
    }
    // /**
    //  * Evaluates if the result of this `expression` is between
    //  * the `lowerBound` (inclusive) and `upperBound` (inclusive).
    //  *
    //  * @example
    //  * ```typescript
    //  * // Evaluate if the 'tireWidth' is between 2.2 and 2.4
    //  * field('tireWidth').between(constant(2.2), constant(2.4))
    //  *
    //  * // This is functionally equivalent to
    //  * and(field('tireWidth').greaterThanOrEqual(contant(2.2)), field('tireWidth').lessThanOrEqual(constant(2.4)))
    //  * ```
    //  *
    //  * @param lowerBound - Lower bound (inclusive) of the range.
    //  * @param upperBound - Upper bound (inclusive) of the range.
    //  * @returns A `BooleanExpression` representing the specified between comparison.
    //  */
    // between(lowerBound: Expression, upperBound: Expression): BooleanExpression;
    //
    // /**
    //  * Evaluates if the result of this `expression` is between
    //  * the `lowerBound` (inclusive) and `upperBound` (inclusive).
    //  *
    //  * @example
    //  * ```typescript
    //  * // Evaluate if the 'tireWidth' is between 2.2 and 2.4
    //  * field('tireWidth').between(2.2, 2.4)
    //  *
    //  * // This is functionally equivalent to
    //  * and(field('tireWidth').greaterThanOrEqual(2.2), field('tireWidth').lessThanOrEqual(2.4))
    //  * ```
    //  *
    //  * @param lowerBound - Lower bound (inclusive) of the range.
    //  * @param upperBound - Upper bound (inclusive) of the range.
    //  * @returns An `BooleanExpression` representing the specified between comparison.
    //  */
    // between(lowerBound: unknown, upperBound: unknown): BooleanExpression;
    //
    // between(lowerBound: unknown, upperBound: unknown): BooleanExpression {
    //   return new FunctionExpression('between', [
    //     this,
    //     valueToDefaultExpr(lowerBound),
    //     valueToDefaultExpr(upperBound),
    //   ]).asBoolean();
    // }
    //
    // /**
    //  * Evaluates to an HTML-formatted text snippet that renders terms matching
    //  * the search query in `<b>bold</b>`.
    //  *
    //  * @remarks This Expression can only be used within a `search` stage.
    //  *
    //  * @param rquery Define the search query using the search domain-specific language (DSL).
    //  * @returns An `Expression` representing the snippet function.
    //  */
    // snippet(rquery: string): Expression;
    //
    // /**
    //  * Evaluates to an HTML-formatted text snippet that renders terms matching
    //  * the search query in `<b>bold</b>`.
    //  *
    //  * @remarks This Expression can only be used within a `search` stage.
    //  *
    //  * @param options Define how snippeting behaves.
    //  * @returns An `Expression` representing the snippet function.
    //  */
    // snippet(options: firestore.Pipelines.SnippetOptions): Expression;
    //
    // snippet(
    //   queryOrOptions: string | firestore.Pipelines.SnippetOptions,
    // ): Expression {
    //   const options: firestore.Pipelines.SnippetOptions = isString(queryOrOptions)
    //     ? {rquery: queryOrOptions}
    //     : queryOrOptions;
    //   const rquery = options.rquery;
    //   const internalOptions = {
    //     maxSnippetWidth: options.maxSnippetWidth,
    //     maxSnippets: options.maxSnippets,
    //     separator: options.separator,
    //   };
    //   return new SnippetExpression([this, constant(rquery)], internalOptions);
    // }
    // TODO(new-expression): Add new expression method definitions above this line
    /**
     * Creates an `Ordering` that sorts documents in ascending order based on this expression.
     *
     * ```typescript
     * // Sort documents by the 'name' field in ascending order
     * pipeline().collection("users")
     *   .sort(field("name").ascending());
     * ```
     *
     * @returns A new `Ordering` for ascending sorting.
     */
    ascending() {
        return ascending(this);
    }
    /**
     * Creates an `Ordering` that sorts documents in descending order based on this expression.
     *
     * ```typescript
     * // Sort documents by the 'createdAt' field in descending order
     * firestore.pipeline().collection("users")
     *   .sort(field("createdAt").descending());
     * ```
     *
     * @returns A new `Ordering` for descending sorting.
     */
    descending() {
        return descending(this);
    }
    /**
     * Assigns an alias to this expression.
     *
     * Aliases are useful for renaming fields in the output of a stage or for giving meaningful
     * names to calculated values.
     *
     * ```typescript
     * // Calculate the total price and assign it the alias "totalPrice" and add it to the output.
     * firestore.pipeline().collection("items")
     *   .addFields(field("price").multiply(field("quantity")).as("totalPrice"));
     * ```
     *
     * @param name The alias to assign to this expression.
     * @returns A new `AliasedExpression` that wraps this
     *     expression and associates it with the provided alias.
     */
    as(name) {
        return new AliasedExpression(this, name);
    }
}
exports.Expression = Expression;
/**
 * A class that represents an aggregate function.
 */
class AggregateFunction {
    name;
    params;
    expressionType = 'AggregateFunction';
    /**
     * @internal
     * @private
     * Indicates if this expression was created from a literal value passed
     * by the caller.
     */
    _createdFromLiteral = false;
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        this.params.forEach(expr => {
            return expr._validateUserData(ignoreUndefinedProperties);
        });
    }
    constructor(name, params) {
        this.name = name;
        this.params = params;
    }
    /**
     * Assigns an alias to this AggregateFunction. The alias specifies the name that
     * the aggregated value will have in the output document.
     *
     * ```typescript
     * // Calculate the average price of all items and assign it the alias "averagePrice".
     * firestore.pipeline().collection("items")
     *   .aggregate(field("price").average().as("averagePrice"));
     * ```
     *
     * @param name The alias to assign to this AggregateFunction.
     * @returns A new `AliasedAggregate` that wraps this
     *     AggregateFunction and associates it with the provided alias.
     */
    as(name) {
        return new AliasedAggregate(this, name);
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return {
            functionValue: {
                name: this.name,
                args: this.params.map(p => p._toProto(serializer)),
            },
        };
    }
    _protoValueType = 'ProtoValue';
}
exports.AggregateFunction = AggregateFunction;
/**
 * An AggregateFunction with alias.
 */
class AliasedAggregate {
    _aggregate;
    _alias;
    constructor(_aggregate, _alias) {
        this._aggregate = _aggregate;
        this._alias = _alias;
    }
    /**
     * @internal
     * @private
     * Indicates if this expression was created from a literal value passed
     * by the caller.
     */
    _createdFromLiteral = false;
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        this._aggregate._validateUserData(ignoreUndefinedProperties);
    }
}
exports.AliasedAggregate = AliasedAggregate;
/**
 * Represents an expression that has been assigned an alias using the `.as()` method.
 *
 * This class wraps an existing `Expression` and associates it with a user-defined alias,
 * allowing the expression's result to be referred to by name in the output
 * of a Firestore pipeline query.
 */
class AliasedExpression {
    _expr;
    _alias;
    expressionType = 'AliasedExpression';
    selectable = true;
    /**
     * @internal
     * @private
     * Indicates if this expression was created from a literal value passed
     * by the caller.
     */
    _createdFromLiteral = false;
    constructor(_expr, _alias) {
        this._expr = _expr;
        this._alias = _alias;
    }
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        this._expr._validateUserData(ignoreUndefinedProperties);
    }
}
exports.AliasedExpression = AliasedExpression;
/**
 * @internal
 */
class ListOfExprs extends Expression {
    exprs;
    expressionType = 'ListOfExprs';
    constructor(exprs) {
        super();
        this.exprs = exprs;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return {
            arrayValue: {
                values: this.exprs.map(p => p._toProto(serializer)),
            },
        };
    }
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        this.exprs.forEach(expr => {
            return expr._validateUserData(ignoreUndefinedProperties);
        });
    }
}
/**
 * Represents a reference to a field in a Firestore document, or outputs of a `Pipeline` stage.
 *
 * <p>Field references are used to access document field values in expressions and to specify fields
 * for sorting, filtering, and projecting data in Firestore pipelines.
 *
 * <p>You can create a `Field` instance using the static `field` method:
 *
 * ```typescript
 * // Create a Field instance for the 'name' field
 * const nameField = field("name");
 *
 * // Create a Field instance for a nested field 'address.city'
 * const cityField = field("address.city");
 * ```
 */
class Field extends Expression {
    fieldPath;
    expressionType = 'Field';
    selectable = true;
    // /**
    //  * Perform a full-text search on this field.
    //  *
    //  * @remarks This Expression can only be used within a `search` stage.
    //  *
    //  * @param rquery Define the search query using the search domain-specific language (DSL).
    //  * @returns A `BooleanExpression` representing the matches function.
    //  */
    // matches(rquery: string | Expression): BooleanExpression {
    //   return new FunctionExpression('matches', [
    //     this,
    //     valueToDefaultExpr(rquery),
    //   ]).asBoolean();
    // }
    /**
     * @beta
     *
     * Evaluates to the distance in meters between the location specified
     * by this field and the query location.
     *
     * @remarks This Expression can only be used within a `search` stage.
     *
     * @example
     * ```typescript
     * const geoDistanceToUser = field('location').geoDistance(new GeoPoint(39.7541, -105.0002));
     *
     * db.pipeline().collection('restaurants').search({
     *   query: geoDistanceToUser.lessThanOrEqual(2000),
     *   sort: geoDistanceToUser.ascending()
     * })
     * ```
     *
     * @param location - Compute distance to this GeoPoint.
     * @returns An `Expression` representing the geoDistance function.
     */
    geoDistance(location) {
        return new FunctionExpression('geo_distance', [
            this,
            (0, pipeline_util_1.valueToDefaultExpr)(location),
        ]);
    }
    /**
     * @internal
     * @private
     * @hideconstructor
     * @param fieldPath
     */
    constructor(fieldPath) {
        super();
        this.fieldPath = fieldPath;
    }
    get fieldName() {
        return this.fieldPath.formattedName;
    }
    get _alias() {
        return this.fieldName;
    }
    get _expr() {
        return this;
    }
    /**
     * @private
     * @internal
     */
    _toProto(_) {
        return {
            fieldReferenceValue: this.fieldPath.formattedName,
        };
    }
    /**
     * @private
     * @internal
     */
    _validateUserData(_) { }
}
exports.Field = Field;
/**
 * Creates a `Field` instance representing the field at the given path.
 *
 * The path can be a simple field name (e.g., "name") or a dot-separated path to a nested field
 * (e.g., "address.city").
 *
 * ```typescript
 * // Create a Field instance for the 'title' field
 * const titleField = field("title");
 *
 * // Create a Field instance for a nested field 'author.firstName'
 * const authorFirstNameField = field("author.firstName");
 * ```
 *
 * @param field The path to the field.
 * @returns A new `Field` instance representing the specified field.
 */
function field(field) {
    if (typeof field === 'string') {
        if ('__name__' === field) {
            return new Field(path_1.FieldPath.documentId());
        }
        return new Field(path_1.FieldPath.fromArgument(field));
    }
    else {
        return new Field(field);
    }
}
/**
 * @internal
 * Represents a constant value that can be used in a Firestore pipeline expression.
 *
 * You can create a `Constant` instance using the static `field` method:
 *
 * ```typescript
 * // Create a Constant instance for the number 10
 * const ten = constant(10);
 *
 * // Create a Constant instance for the string "hello"
 * const hello = constant("hello");
 * ```
 */
class Constant extends Expression {
    value;
    expressionType = 'Constant';
    protoValue;
    /**
     * @private
     * @internal
     * @hideconstructor
     * @param value The value of the constant.
     */
    constructor(value) {
        super();
        this.value = value;
    }
    /**
     * @private
     * @internal
     */
    static _fromProto(value) {
        const result = new Constant(value);
        result.protoValue = value;
        return result;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        if ((0, pipeline_util_1.isFirestoreValue)(this.value)) {
            return this.value;
        }
        return serializer.encodeValue(this.value);
    }
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        (0, serializer_1.validateUserInput)('value', this.value, 'constant value', {
            allowUndefined: ignoreUndefinedProperties,
            allowDeletes: 'none',
            allowTransforms: false,
        });
    }
}
exports.Constant = Constant;
function constant(value) {
    return _constant(value);
}
function _constant(value) {
    const c = new Constant(value);
    if (typeof value === 'boolean') {
        return new BooleanConstant(c);
    }
    else {
        return c;
    }
}
/**
 * Internal only
 * @internal
 * @private
 */
class MapValue extends Expression {
    plainObject;
    constructor(plainObject) {
        super();
        this.plainObject = plainObject;
    }
    expressionType = 'Constant';
    _toProto(serializer) {
        return serializer.encodeValue(this.plainObject);
    }
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        this.plainObject.forEach(expr => {
            return expr._validateUserData(ignoreUndefinedProperties);
        });
    }
}
exports.MapValue = MapValue;
/**
 * This class defines the base class for Firestore `Pipeline` functions, which can be evaluated within pipeline
 * execution.
 *
 * Typically, you would not use this class or its children directly. Use either the functions like `and`, `equal`,
 * or the methods on `Expression` ({@link Expression#equal}, {@link Expression#lessThan}, etc.) to construct new Function instances.
 */
class FunctionExpression extends Expression {
    _methodName;
    params;
    expressionType = 'Function';
    constructor(_methodName, params) {
        super();
        this._methodName = _methodName;
        this.params = params;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return {
            functionValue: {
                name: this._methodName,
                args: this.params.map(p => (0, util_1.cast)(p)._toProto(serializer)),
            },
        };
    }
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        this.params.forEach(expr => {
            return expr._validateUserData(ignoreUndefinedProperties);
        });
    }
}
exports.FunctionExpression = FunctionExpression;
/**
 * SnippetExpression extends from FunctionExpression because it
 * supports options and requires the options util.
 */
class SnippetExpression extends FunctionExpression {
    _options;
    /**
     * @private
     * @internal
     */
    get _optionsUtil() {
        return new options_util_1.OptionsUtil({
            maxSnippetWidth: {
                serverName: 'max_snippet_width',
            },
            maxSnippets: {
                serverName: 'max_snippets',
            },
            separator: {
                serverName: 'separator',
            },
        });
    }
    /**
     * @hideconstructor
     */
    constructor(params, _options) {
        super('snippet', params);
        this._options = _options;
    }
    _toProto(serializer) {
        const proto = super._toProto(serializer);
        proto.functionValue.options = this._optionsUtil.getOptionsProto(serializer, this._options ?? {}, {});
        return proto;
    }
}
exports.SnippetExpression = SnippetExpression;
/**
 * This class defines the base class for Firestore `Pipeline` functions, which can be evaluated within pipeline
 * execution.
 *
 * Typically, you would not use this class or its children directly. Use either the functions like `and`, `equal`,
 * or the methods on `Expression` ({@link Expression#equal}, {@link Expression#lessThan}, etc.) to construct new Function instances.
 */
class MapFunctionExpr extends FunctionExpression {
    map;
    expressionType = 'Function';
    constructor(map) {
        super('map', []);
        this.map = map;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        const args = [];
        for (const key in this.map) {
            if (Object.prototype.hasOwnProperty.call(this.map, key)) {
                if (this.map[key]) {
                    args.push(constant(key)._toProto(serializer));
                    args.push(this.map[key]._toProto(serializer));
                }
            }
        }
        return {
            functionValue: {
                name: this._methodName,
                args: args,
            },
        };
    }
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        (0, serializer_1.validateUserInput)('value', this.map, 'map value', {
            allowUndefined: ignoreUndefinedProperties,
            allowTransforms: false,
            allowDeletes: 'none',
        });
    }
}
/**
 * This class defines the base class for Firestore `Pipeline` functions, which can be evaluated within pipeline
 * execution.
 *
 * Typically, you would not use this class or its children directly. Use either the functions like `and`, `equal`,
 * or the methods on `Expression` ({@link Expression#equal}, {@link Expression#lessThan}, etc.) to construct new Function instances.
 */
class ArrayFunctionExpr extends FunctionExpression {
    values;
    expressionType = 'Function';
    constructor(values) {
        super('array', []);
        this.values = values;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return {
            functionValue: {
                name: this._methodName,
                args: this.values
                    .filter(v => !!v)
                    .map(value => value._toProto(serializer)),
            },
        };
    }
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        (0, serializer_1.validateUserInput)('value', this.values, 'array value', {
            allowUndefined: ignoreUndefinedProperties,
            allowTransforms: false,
            allowDeletes: 'none',
        });
    }
}
/**
 * An expression that evaluates to a boolean value.
 *
 * This expression type is useful for filter conditions.
 *
 */
class BooleanExpression extends Expression {
    /**
     * Creates an aggregation that finds the count of input documents satisfying
     * this boolean expression.
     *
     * ```typescript
     * // Find the count of documents with a score greater than 90
     * field("score").greaterThan(90).countIf().as("highestScore");
     * ```
     *
     * @returns A new `AggregateFunction` representing the 'countIf' aggregation.
     */
    countIf() {
        return new AggregateFunction('count_if', [this]);
    }
    /**
     * Creates an expression that negates this boolean expression.
     *
     * ```typescript
     * // Find documents where the 'tags' field does not contain 'completed'
     * field("tags").arrayContains("completed").not();
     * ```
     *
     * @returns A new `Expression` representing the negated filter condition.
     */
    not() {
        return new FunctionExpression('not', [this]).asBoolean();
    }
    /**
     * Creates a conditional expression that evaluates to the 'then' expression
     * if `this` expression evaluates to `true`,
     * or evaluates to the 'else' expression if `this` expressions evaluates `false`.
     *
     * ```typescript
     * // If 'age' is greater than 18, return "Adult"; otherwise, return "Minor".
     * field("age").greaterThanOrEqual(18).conditional(constant("Adult"), constant("Minor"));
     * ```
     *
     * @param thenExpr The expression to evaluate if the condition is true.
     * @param elseExpr The expression to evaluate if the condition is false.
     * @returns A new `Expr` representing the conditional expression.
     */
    conditional(thenExpr, elseExpr) {
        return new FunctionExpression('conditional', [this, thenExpr, elseExpr]);
    }
    ifError(catchValue) {
        const normalizedCatchValue = (0, pipeline_util_1.valueToDefaultExpr)(catchValue);
        const expr = new FunctionExpression('if_error', [
            this,
            normalizedCatchValue,
        ]);
        return normalizedCatchValue instanceof BooleanExpression
            ? expr.asBoolean()
            : expr;
    }
    _toProto(serializer) {
        return this._expr._toProto(serializer);
    }
    _validateUserData(ignoreUndefinedProperties) {
        this._expr._validateUserData(ignoreUndefinedProperties);
    }
}
exports.BooleanExpression = BooleanExpression;
class BooleanFunctionExpression extends BooleanExpression {
    _expr;
    expressionType = 'Function';
    constructor(_expr) {
        super();
        this._expr = _expr;
    }
}
exports.BooleanFunctionExpression = BooleanFunctionExpression;
class BooleanConstant extends BooleanExpression {
    _expr;
    expressionType = 'Constant';
    constructor(_expr) {
        super();
        this._expr = _expr;
    }
}
exports.BooleanConstant = BooleanConstant;
class BooleanField extends BooleanExpression {
    _expr;
    expressionType = 'Field';
    constructor(_expr) {
        super();
        this._expr = _expr;
    }
}
exports.BooleanField = BooleanField;
/**
 * Creates an aggregation that counts the number of stage inputs where the provided
 * boolean expression evaluates to true.
 *
 * ```typescript
 * // Count the number of documents where 'is_active' field equals true
 * countIf(field("is_active").equal(true)).as("numActiveDocuments");
 * ```
 *
 * @param booleanExpr The boolean expression to evaluate on each input.
 * @returns A new `AggregateFunction` representing the 'countIf' aggregation.
 */
function countIf(booleanExpr) {
    return new AggregateFunction('count_if', [(0, util_1.cast)(booleanExpr)]);
}
function arrayGet(array, index) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayGet((0, pipeline_util_1.valueToDefaultExpr)(index));
}
/**
 * Creates an expression that checks if a given expression produces an error.
 *
 * ```typescript
 * // Check if the result of a calculation is an error
 * isError(field("title").arrayContains(1));
 * ```
 *
 * @param value The expression to check.
 * @returns A new `Expression` representing the 'isError' check.
 */
function isError(value) {
    const expr = (0, util_1.cast)(value);
    return expr.isError();
}
function ifError(tryExpr, catchValue) {
    if (tryExpr instanceof BooleanExpression &&
        catchValue instanceof BooleanExpression) {
        return tryExpr.ifError(catchValue).asBoolean();
    }
    else {
        return tryExpr.ifError((0, pipeline_util_1.valueToDefaultExpr)(catchValue));
    }
}
function isAbsent(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).isAbsent();
}
function mapRemove(mapExpr, stringExpr) {
    return (0, pipeline_util_1.fieldOrExpression)(mapExpr).mapRemove((0, pipeline_util_1.valueToDefaultExpr)(stringExpr));
}
function mapMerge(firstMap, secondMap, ...otherMaps) {
    const secondMapExpr = (0, pipeline_util_1.valueToDefaultExpr)(secondMap);
    const otherMapExprs = otherMaps.map(pipeline_util_1.valueToDefaultExpr);
    return (0, pipeline_util_1.fieldOrExpression)(firstMap).mapMerge(secondMapExpr, ...otherMapExprs);
}
function documentId(documentPath) {
    const documentPathExpr = (0, pipeline_util_1.valueToDefaultExpr)(documentPath);
    return documentPathExpr.documentId();
}
function parent(documentPath) {
    const documentPathExpr = (0, pipeline_util_1.valueToDefaultExpr)(documentPath);
    return documentPathExpr.parent();
}
function substring(field, position, length) {
    const fieldExpr = (0, pipeline_util_1.fieldOrExpression)(field);
    const positionExpr = (0, pipeline_util_1.valueToDefaultExpr)(position);
    const lengthExpr = length === undefined ? undefined : (0, pipeline_util_1.valueToDefaultExpr)(length);
    return fieldExpr.substring(positionExpr, lengthExpr);
}
function add(first, second) {
    return (0, pipeline_util_1.fieldOrExpression)(first).add((0, pipeline_util_1.valueToDefaultExpr)(second));
}
function subtract(left, right) {
    const normalizedLeft = (0, pipeline_util_1.fieldOrExpression)(left);
    const normalizedRight = (0, pipeline_util_1.valueToDefaultExpr)(right);
    return normalizedLeft.subtract(normalizedRight);
}
function multiply(first, second) {
    return (0, pipeline_util_1.fieldOrExpression)(first).multiply((0, pipeline_util_1.valueToDefaultExpr)(second));
}
function divide(dividend, divisor) {
    const normalizedLeft = (0, pipeline_util_1.fieldOrExpression)(dividend);
    const normalizedRight = (0, pipeline_util_1.valueToDefaultExpr)(divisor);
    return normalizedLeft.divide(normalizedRight);
}
function mod(left, right) {
    const normalizedLeft = (0, pipeline_util_1.fieldOrExpression)(left);
    const normalizedRight = (0, pipeline_util_1.valueToDefaultExpr)(right);
    return normalizedLeft.mod(normalizedRight);
}
/**
 * Creates an expression that creates a Firestore map value from an input object.
 *
 * ```typescript
 * // Create a map from the input object and reference the 'baz' field value from the input document.
 * map({foo: 'bar', baz: field('baz')}).as('data');
 * ```
 *
 * @param elements The input map to evaluate in the expression.
 * @returns A new `Expression` representing the map function.
 */
function map(elements) {
    const result = {};
    for (const key in elements) {
        if (Object.prototype.hasOwnProperty.call(elements, key)) {
            result[key] =
                elements[key] !== undefined
                    ? (0, pipeline_util_1.valueToDefaultExpr)(elements[key])
                    : undefined;
        }
    }
    return new MapFunctionExpr(result);
}
/**
 * Internal use only
 * Converts a plainObject to a mapValue in the proto representation,
 * rather than a functionValue+map that is the result of the map(...) function.
 * This behaves different from constant(plainObject) because it
 * traverses the input object, converts values in the object to expressions,
 * and calls _readUserData on each of these expressions.
 * @private
 * @internal
 * @param plainObject
 */
function _mapValue(plainObject) {
    const result = new Map();
    for (const key in plainObject) {
        if (Object.prototype.hasOwnProperty.call(plainObject, key)) {
            const value = plainObject[key];
            result.set(key, (0, pipeline_util_1.valueToDefaultExpr)(value));
        }
    }
    return new MapValue(result);
}
/**
 * Creates an expression that creates a Firestore array value from an input array.
 *
 * ```typescript
 * // Create an array value from the input array and reference the 'baz' field value from the input document.
 * array(['bar', field('baz')]).as('foo');
 * ```
 *
 * @param elements The input array to evaluate in the expression.
 * @returns A new `Expression` representing the array function.
 */
function array(elements) {
    return new ArrayFunctionExpr(elements.map(element => {
        return element !== undefined ? (0, pipeline_util_1.valueToDefaultExpr)(element) : undefined;
    }));
}
function equal(left, right) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const rightExpr = (0, pipeline_util_1.valueToDefaultExpr)(right);
    return leftExpr.equal(rightExpr);
}
function notEqual(left, right) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const rightExpr = (0, pipeline_util_1.valueToDefaultExpr)(right);
    return leftExpr.notEqual(rightExpr);
}
function lessThan(left, right) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const rightExpr = (0, pipeline_util_1.valueToDefaultExpr)(right);
    return leftExpr.lessThan(rightExpr);
}
function lessThanOrEqual(left, right) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const rightExpr = (0, pipeline_util_1.valueToDefaultExpr)(right);
    return leftExpr.lessThanOrEqual(rightExpr);
}
function greaterThan(left, right) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const rightExpr = (0, pipeline_util_1.valueToDefaultExpr)(right);
    return leftExpr.greaterThan(rightExpr);
}
function greaterThanOrEqual(left, right) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const rightExpr = (0, pipeline_util_1.valueToDefaultExpr)(right);
    return leftExpr.greaterThanOrEqual(rightExpr);
}
function arrayConcat(firstArray, secondArray, ...otherArrays) {
    const exprValues = otherArrays.map(element => (0, pipeline_util_1.valueToDefaultExpr)(element));
    return (0, pipeline_util_1.fieldOrExpression)(firstArray).arrayConcat((0, pipeline_util_1.fieldOrExpression)(secondArray), ...exprValues);
}
function arrayContains(array, element) {
    const arrayExpr = (0, pipeline_util_1.fieldOrExpression)(array);
    const elementExpr = (0, pipeline_util_1.valueToDefaultExpr)(element);
    return arrayExpr.arrayContains(elementExpr);
}
function arrayContainsAny(array, values) {
    if (Array.isArray(values)) {
        return (0, pipeline_util_1.fieldOrExpression)(array).arrayContainsAny(values);
    }
    else {
        return (0, pipeline_util_1.fieldOrExpression)(array).arrayContainsAny(values);
    }
}
function arrayContainsAll(array, values) {
    if (Array.isArray(values)) {
        return (0, pipeline_util_1.fieldOrExpression)(array).arrayContainsAll(values);
    }
    else {
        return (0, pipeline_util_1.fieldOrExpression)(array).arrayContainsAll(values);
    }
}
function arrayLength(array) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayLength();
}
function equalAny(element, values) {
    if (Array.isArray(values)) {
        return (0, pipeline_util_1.fieldOrExpression)(element).equalAny(values);
    }
    else {
        return (0, pipeline_util_1.fieldOrExpression)(element).equalAny(values);
    }
}
function notEqualAny(element, values) {
    if (Array.isArray(values)) {
        return (0, pipeline_util_1.fieldOrExpression)(element).notEqualAny(values);
    }
    else {
        return (0, pipeline_util_1.fieldOrExpression)(element).notEqualAny(values);
    }
}
/**
 * Creates an expression that performs a logical 'XOR' (exclusive OR) operation on multiple BooleanExprs.
 *
 * ```typescript
 * // Check if only one of the conditions is true: 'age' greater than 18, 'city' is "London",
 * // or 'status' is "active".
 * const condition = xor(
 *     greaterThan("age", 18),
 *     equal("city", "London"),
 *     equal("status", "active"));
 * ```
 *
 * @param first The first condition.
 * @param second The second condition.
 * @param additionalConditions Additional conditions to 'XOR' together.
 * @returns A new `Expression` representing the logical 'XOR' operation.
 */
function xor(first, second, ...additionalConditions) {
    return new FunctionExpression('xor', [
        first,
        second,
        ...additionalConditions,
    ]).asBoolean();
}
/**
 * Creates a conditional expression that evaluates to a 'then' expression if a condition is true
 * and an 'else' expression if the condition is false.
 *
 * ```typescript
 * // If 'age' is greater than 18, return "Adult"; otherwise, return "Minor".
 * conditional(
 *     greaterThan("age", 18), constant("Adult"), constant("Minor"));
 * ```
 *
 * @param condition The condition to evaluate.
 * @param thenExpr The expression to evaluate if the condition is true.
 * @param elseExpr The expression to evaluate if the condition is false.
 * @returns A new `Expression` representing the conditional expression.
 */
function conditional(condition, thenExpr, elseExpr) {
    return new FunctionExpression('conditional', [
        condition,
        (0, util_1.cast)(thenExpr),
        (0, util_1.cast)(elseExpr),
    ]);
}
/**
 * Creates an expression that negates a filter condition.
 *
 * ```typescript
 * // Find documents where the 'completed' field is NOT true
 * not(equal("completed", true));
 * ```
 *
 * @param booleanExpr The filter condition to negate.
 * @returns A new `Expression` representing the negated filter condition.
 */
function not(booleanExpr) {
    return booleanExpr.not();
}
function logicalMaximum(first, second, ...others) {
    return (0, pipeline_util_1.fieldOrExpression)(first).logicalMaximum((0, pipeline_util_1.valueToDefaultExpr)(second), ...others.map(value => (0, pipeline_util_1.valueToDefaultExpr)(value)));
}
function logicalMinimum(first, second, ...others) {
    return (0, pipeline_util_1.fieldOrExpression)(first).logicalMinimum((0, pipeline_util_1.valueToDefaultExpr)(second), ...others.map(value => (0, pipeline_util_1.valueToDefaultExpr)(value)));
}
function exists(valueOrField) {
    return (0, pipeline_util_1.fieldOrExpression)(valueOrField).exists();
}
function reverse(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).reverse();
}
function arrayFilter(array, alias, filter) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayFilter(alias, filter);
}
function arrayTransform(array, elementAlias, transform) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayTransform(elementAlias, transform);
}
function arrayTransformWithIndex(array, elementAlias, indexAlias, transform) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayTransformWithIndex(elementAlias, indexAlias, transform);
}
function arraySlice(array, offset, length) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arraySlice(offset, length);
}
function arrayReverse(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).arrayReverse();
}
function byteLength(expr) {
    const normalizedExpr = (0, pipeline_util_1.fieldOrExpression)(expr);
    return normalizedExpr.byteLength();
}
function exp(expressionOrFieldName) {
    return (0, pipeline_util_1.fieldOrExpression)(expressionOrFieldName).exp();
}
function ceil(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).ceil();
}
function floor(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).floor();
}
/**
 * Creates an aggregation that counts the number of distinct values of a field.
 *
 * @param expr The expression or field to count distinct values of.
 * @returns A new `AggregateFunction` representing the 'count_distinct' aggregation.
 */
function countDistinct(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).countDistinct();
}
function charLength(value) {
    const valueExpr = (0, pipeline_util_1.fieldOrExpression)(value);
    return valueExpr.charLength();
}
function like(left, pattern) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const patternExpr = (0, pipeline_util_1.valueToDefaultExpr)(pattern);
    return leftExpr.like(patternExpr);
}
function regexContains(left, pattern) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const patternExpr = (0, pipeline_util_1.valueToDefaultExpr)(pattern);
    return leftExpr.regexContains(patternExpr);
}
function regexFind(left, pattern) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const patternExpr = (0, pipeline_util_1.valueToDefaultExpr)(pattern);
    return leftExpr.regexFind(patternExpr);
}
function regexFindAll(left, pattern) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const patternExpr = (0, pipeline_util_1.valueToDefaultExpr)(pattern);
    return leftExpr.regexFindAll(patternExpr);
}
function regexMatch(left, pattern) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const patternExpr = (0, pipeline_util_1.valueToDefaultExpr)(pattern);
    return leftExpr.regexMatch(patternExpr);
}
function stringContains(left, substring) {
    const leftExpr = (0, pipeline_util_1.fieldOrExpression)(left);
    const substringExpr = (0, pipeline_util_1.valueToDefaultExpr)(substring);
    return leftExpr.stringContains(substringExpr);
}
function startsWith(expr, prefix) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).startsWith((0, pipeline_util_1.valueToDefaultExpr)(prefix));
}
function endsWith(expr, suffix) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).endsWith((0, pipeline_util_1.valueToDefaultExpr)(suffix));
}
function toLower(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).toLower();
}
function toUpper(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).toUpper();
}
function trim(expr, valueToTrim) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).trim(valueToTrim);
}
function ltrim(expr, valueToTrim) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).ltrim(valueToTrim);
}
function rtrim(expr, valueToTrim) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).rtrim(valueToTrim);
}
function stringConcat(first, second, ...elements) {
    return (0, pipeline_util_1.fieldOrExpression)(first).stringConcat((0, pipeline_util_1.valueToDefaultExpr)(second), ...elements.map(pipeline_util_1.valueToDefaultExpr));
}
function stringIndexOf(expr, search) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).stringIndexOf(search);
}
function stringRepeat(expr, repetitions) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).stringRepeat(repetitions);
}
function stringReplaceAll(expr, find, replacement) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).stringReplaceAll(find, replacement);
}
function stringReplaceOne(expr, find, replacement) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).stringReplaceOne(find, replacement);
}
function mapGet(fieldOrExpr, subField) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldOrExpr).mapGet(subField);
}
function mapSet(fieldOrExpr, key, value, ...moreKeyValues) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldOrExpr).mapSet(key, value, ...moreKeyValues);
}
function mapKeys(fieldOrExpr) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldOrExpr).mapKeys();
}
function mapValues(fieldOrExpr) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldOrExpr).mapValues();
}
function mapEntries(fieldOrExpr) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldOrExpr).mapEntries();
}
/**
 * Creates an aggregation that counts the total number of stage inputs.
 *
 * ```typescript
 * // Count the total number of input documents
 * countAll().as("totalDocument");
 * ```
 *
 * @returns A new `AggregateFunction` representing the 'countAll' aggregation.
 */
function countAll() {
    return new AggregateFunction('count', []);
}
function count(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).count();
}
function sum(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).sum();
}
function average(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).average();
}
function minimum(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).minimum();
}
function maximum(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).maximum();
}
function first(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).first();
}
function last(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).last();
}
function arrayAgg(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).arrayAgg();
}
function arrayAggDistinct(value) {
    return (0, pipeline_util_1.fieldOrExpression)(value).arrayAggDistinct();
}
function cosineDistance(expr, other) {
    const expr1 = (0, pipeline_util_1.fieldOrExpression)(expr);
    const expr2 = (0, pipeline_util_1.vectorToExpr)(other);
    return expr1.cosineDistance(expr2);
}
function dotProduct(expr, other) {
    const expr1 = (0, pipeline_util_1.fieldOrExpression)(expr);
    const expr2 = (0, pipeline_util_1.vectorToExpr)(other);
    return expr1.dotProduct(expr2);
}
function euclideanDistance(expr, other) {
    const expr1 = (0, pipeline_util_1.fieldOrExpression)(expr);
    const expr2 = (0, pipeline_util_1.vectorToExpr)(other);
    return expr1.euclideanDistance(expr2);
}
function vectorLength(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).vectorLength();
}
function unixMicrosToTimestamp(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).unixMicrosToTimestamp();
}
function timestampToUnixMicros(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).timestampToUnixMicros();
}
function unixMillisToTimestamp(expr) {
    const normalizedExpr = (0, pipeline_util_1.fieldOrExpression)(expr);
    return normalizedExpr.unixMillisToTimestamp();
}
function timestampToUnixMillis(expr) {
    const normalizedExpr = (0, pipeline_util_1.fieldOrExpression)(expr);
    return normalizedExpr.timestampToUnixMillis();
}
function unixSecondsToTimestamp(expr) {
    const normalizedExpr = (0, pipeline_util_1.fieldOrExpression)(expr);
    return normalizedExpr.unixSecondsToTimestamp();
}
function timestampToUnixSeconds(expr) {
    const normalizedExpr = (0, pipeline_util_1.fieldOrExpression)(expr);
    return normalizedExpr.timestampToUnixSeconds();
}
function timestampAdd(timestamp, unit, amount) {
    const normalizedTimestamp = (0, pipeline_util_1.fieldOrExpression)(timestamp);
    const normalizedUnit = (0, pipeline_util_1.valueToDefaultExpr)(unit);
    const normalizedAmount = (0, pipeline_util_1.valueToDefaultExpr)(amount);
    return normalizedTimestamp.timestampAdd(normalizedUnit, normalizedAmount);
}
function timestampSubtract(timestamp, unit, amount) {
    const normalizedTimestamp = (0, pipeline_util_1.fieldOrExpression)(timestamp);
    const normalizedUnit = (0, pipeline_util_1.valueToDefaultExpr)(unit);
    const normalizedAmount = (0, pipeline_util_1.valueToDefaultExpr)(amount);
    return normalizedTimestamp.timestampSubtract(normalizedUnit, normalizedAmount);
}
/**
 *
 * Creates an expression that evaluates to the current server timestamp.
 *
 * ```typescript
 * // Get the current server timestamp
 * currentTimestamp()
 * ```
 *
 * @returns A new Expression representing the current server timestamp.
 */
function currentTimestamp() {
    return new FunctionExpression('current_timestamp', []);
}
/**
 * Creates an expression that performs a logical 'AND' operation on multiple filter conditions.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18 AND the 'city' field is "London" AND
 * // the 'status' field is "active"
 * const condition = and(greaterThan("age", 18), equal("city", "London"), equal("status", "active"));
 * ```
 *
 * @param first The first filter condition.
 * @param second The second filter condition.
 * @param more Additional filter conditions to 'AND' together.
 * @returns A new `Expression` representing the logical 'AND' operation.
 */
function and(first, second, ...more) {
    return new FunctionExpression('and', [first, second, ...more]).asBoolean();
}
/**
 * Creates an expression that performs a logical 'OR' operation on multiple filter conditions.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18 OR the 'city' field is "London" OR
 * // the 'status' field is "active"
 * const condition = or(greaterThan("age", 18), equal("city", "London"), equal("status", "active"));
 * ```
 *
 * @param first The first filter condition.
 * @param second The second filter condition.
 * @param more Additional filter conditions to 'OR' together.
 * @returns A new `Expression` representing the logical 'OR' operation.
 */
function or(first, second, ...more) {
    return new FunctionExpression('or', [first, second, ...more]).asBoolean();
}
/**
 * Creates an expression that performs a logical 'NOR' operation on multiple filter conditions.
 *
 * @example
 * ```typescript
 * // Check if neither the 'age' field is greater than 18 nor the 'city' field is "London"
 * const condition = nor(
 *   greaterThan("age", 18),
 *   equal("city", "London")
 * );
 * ```
 *
 * @param first - The first filter condition.
 * @param second - The second filter condition.
 * @param more - Additional filter conditions to 'NOR' together.
 * @returns A new `Expression` representing the logical 'NOR' operation.
 */
function nor(first, second, ...more) {
    return new FunctionExpression('nor', [first, second, ...more]).asBoolean();
}
/**
 * Creates an expression that evaluates to the result corresponding to the first true condition.
 *
 * @remarks
 * This function behaves like a `switch` statement. It accepts an alternating sequence of conditions
 * and their corresponding results.
 * If an odd number of arguments is provided, the final argument serves as a default fallback result.
 * If no default is provided and no condition evaluates to true, it throws an error.
 *
 * @example
 * ```typescript
 * // Return "Active" if field "status" is 1, "Pending" if field "status" is 2,
 * // and default to "Unknown" if none of the conditions are true.
 * switchOn(
 *   equal(field("status"), 1), constant("Active"),
 *   equal(field("status"), 2), constant("Pending"),
 *   constant("Unknown")
 * )
 * ```
 *
 * @param condition - The first condition to check.
 * @param result - The result if the first condition is true.
 * @param others - Additional conditions and results, and optionally a default value.
 * @returns A new `Expression` representing the switch operation.
 */
function switchOn(condition, result, ...others) {
    return new FunctionExpression('switch_on', [
        (0, pipeline_util_1.valueToDefaultExpr)(condition),
        (0, pipeline_util_1.valueToDefaultExpr)(result),
        ...others.map(pipeline_util_1.valueToDefaultExpr),
    ]);
}
function pow(base, exponent) {
    return (0, pipeline_util_1.fieldOrExpression)(base).pow(exponent);
}
/**
 * Creates an expression that generates a random number between 0.0 and 1.0 but not including 1.0.
 *
 * @example
 * ```typescript
 * // Generate a random number between 0.0 and 1.0.
 * rand();
 * ```
 *
 * @returns A new `Expression` representing the rand operation.
 */
function rand() {
    return new FunctionExpression('rand', []);
}
function round(expr, decimalPlaces) {
    if (decimalPlaces === undefined) {
        return (0, pipeline_util_1.fieldOrExpression)(expr).round();
    }
    else {
        return (0, pipeline_util_1.fieldOrExpression)(expr).round((0, pipeline_util_1.valueToDefaultExpr)(decimalPlaces));
    }
}
function trunc(expr, decimalPlaces) {
    if (decimalPlaces === undefined) {
        return (0, pipeline_util_1.fieldOrExpression)(expr).trunc();
    }
    else {
        return (0, pipeline_util_1.fieldOrExpression)(expr).trunc((0, pipeline_util_1.valueToDefaultExpr)(decimalPlaces));
    }
}
function collectionId(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).collectionId();
}
function length(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).length();
}
function ln(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).ln();
}
function sqrt(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).sqrt();
}
function stringReverse(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).stringReverse();
}
function concat(fieldNameOrExpression, second, ...others) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).concat((0, pipeline_util_1.valueToDefaultExpr)(second), ...others.map(pipeline_util_1.valueToDefaultExpr));
}
function abs(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).abs();
}
function ifAbsent(fieldNameOrExpression, elseValue) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).ifAbsent((0, pipeline_util_1.valueToDefaultExpr)(elseValue));
}
function ifNull(fieldNameOrExpression, elseValue) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).ifNull((0, pipeline_util_1.valueToDefaultExpr)(elseValue));
}
function coalesce(fieldNameOrExpression, replacement, ...others) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).coalesce(replacement, ...others);
}
function join(fieldNameOrExpression, delimiterValueOrExpression) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).join((0, pipeline_util_1.valueToDefaultExpr)(delimiterValueOrExpression));
}
function log10(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).log10();
}
function arraySum(expr) {
    return (0, pipeline_util_1.fieldOrExpression)(expr).arraySum();
}
function split(fieldNameOrExpression, delimiter) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).split((0, pipeline_util_1.valueToDefaultExpr)(delimiter));
}
function timestampTruncate(fieldNameOrExpression, granularity, timezone) {
    const internalGranularity = (0, pipeline_util_1.isString)(granularity)
        ? (0, pipeline_util_1.valueToDefaultExpr)(granularity)
        : granularity;
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).timestampTruncate(internalGranularity, timezone);
}
function timestampDiff(endFieldNameOrExpression, startFieldNameOrExpression, unit) {
    const normalizedEnd = (0, pipeline_util_1.fieldOrExpression)(endFieldNameOrExpression);
    const normalizedStart = (0, pipeline_util_1.fieldOrExpression)(startFieldNameOrExpression);
    const normalizedUnit = (0, pipeline_util_1.valueToDefaultExpr)(unit);
    return normalizedEnd.timestampDiff(normalizedStart, normalizedUnit);
}
function timestampExtract(fieldNameOrExpression, part, timezone) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).timestampExtract((0, pipeline_util_1.valueToDefaultExpr)(part), timezone);
}
function type(fieldNameOrExpression) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).type();
}
function arrayFirst(array) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayFirst();
}
function arrayFirstN(array, n) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayFirstN((0, pipeline_util_1.valueToDefaultExpr)(n));
}
function arrayLast(array) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayLast();
}
function arrayLastN(array, n) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayLastN((0, pipeline_util_1.valueToDefaultExpr)(n));
}
function arrayMaximum(array) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayMaximum();
}
function arrayMaximumN(array, n) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayMaximumN((0, pipeline_util_1.valueToDefaultExpr)(n));
}
function arrayMinimum(array) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayMinimum();
}
function arrayMinimumN(array, n) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayMinimumN((0, pipeline_util_1.valueToDefaultExpr)(n));
}
function arrayIndexOf(array, search) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayIndexOf((0, pipeline_util_1.valueToDefaultExpr)(search));
}
function arrayLastIndexOf(array, search) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayLastIndexOf((0, pipeline_util_1.valueToDefaultExpr)(search));
}
function arrayIndexOfAll(array, search) {
    return (0, pipeline_util_1.fieldOrExpression)(array).arrayIndexOfAll((0, pipeline_util_1.valueToDefaultExpr)(search));
}
function isType(fieldNameOrExpression, type) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpression).isType(type);
}
function getField(fieldOrExpr, keyOrExpr) {
    return (0, pipeline_util_1.fieldOrExpression)(fieldOrExpr).getField(keyOrExpr);
}
/**
 * @internal
 * Expression representing a variable reference. This evaluates to the value of a variable
 * defined in a pipeline.
 */
class VariableExpression extends Expression {
    name;
    expressionType = 'Variable';
    /**
     * @hideconstructor
     */
    constructor(name) {
        super();
        this.name = name;
    }
    /**
     * @internal
     */
    _toProto(_serializer) {
        return {
            variableReferenceValue: this.name,
        };
    }
    /**
     * @internal
     */
    _validateUserData(_ignoreUndefinedProperties) { }
}
exports.VariableExpression = VariableExpression;
/**
 * Creates an expression that retrieves the value of a variable bound via `define()`.
 *
 * @example
 * ```typescript
 * db.pipeline().collection("products")
 *   .define(
 *     field("price").multiply(0.9).as("discountedPrice"),
 *     field("stock").add(10).as("newStock")
 *   )
 *   .where(variable("discountedPrice").lessThan(100))
 *   .select(field("name"), variable("newStock"));
 * ```
 *
 * @param name - The name of the variable to retrieve.
 * @returns An `Expression` representing the variable's value.
 */
function variable(name) {
    return new VariableExpression(name);
}
/**
 * Creates an expression that represents the current document being processed.
 *
 * @example
 * ```typescript
 * // Define the current document as a variable "doc"
 * firestore.pipeline().collection("books")
 *     .define(currentDocument().as("doc"))
 *     // Access a field from the defined document variable
 *     .select(variable("doc").getField("title"));
 * ```
 *
 * @returns An `Expression` representing the current document.
 */
function currentDocument() {
    return new FunctionExpression('current_document', []);
}
/**
 * @internal
 */
class PipelineValueExpression extends Expression {
    pipeline;
    expressionType = 'PipelineValue';
    /**
     * @hideconstructor
     */
    constructor(pipeline) {
        super();
        this.pipeline = pipeline;
    }
    /**
     * @internal
     */
    _toProto(serializer) {
        return {
            // Casting to bypass type checking becuase _validateUserData does not exist in the public types
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pipelineValue: this.pipeline._toProto(serializer),
        };
    }
    /**
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        // Casting to bypass type checking becuase _validateUserData does not exist in the public types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.pipeline._validateUserData(ignoreUndefinedProperties);
    }
}
/**
 * @internal
 */
function pipelineValue(pipeline) {
    return new PipelineValueExpression(pipeline);
}
// /**
//  * @beta
//  * Perform a full-text search on the specified field.
//  *
//  * @remarks This Expression can only be used within a `search` stage.
//  *
//  * @param searchField Search the specified field.
//  * @param rquery Define the search query using the search domain-specific language (DSL).
//  * @returns A `BooleanExpression` representing the matches function.
//  */
// export function matches(
//   searchField: string | Field,
//   rquery: string | Expression,
// ): BooleanExpression {
//   return toField(searchField).matches(rquery);
// }
/**
 * @beta
 *
 * Perform a full-text search on the document.
 *
 * @remarks This Expression can only be used within a `search` stage.
 *
 * @param rquery Define the search query using the search domain-specific language (DSL).
 * @returns A `BooleanExpression` representing the documentMatches function.
 */
function documentMatches(rquery) {
    return new FunctionExpression('document_matches', [
        (0, pipeline_util_1.valueToDefaultExpr)(rquery),
    ]).asBoolean();
}
/**
 * @beta
 *
 * Evaluates to the search score that reflects the topicality of the document
 * to all the text predicates (for example: `documentMatches`)
 * in the search `query` provided to the `search` stage. If the `query` provided to the search stage
 * is not set or does not contain any text predicates, then this score will always be `0`.
 *
 * @remarks This Expression can only be used within a `search` stage.
 *
 * @returns An `Expression` representing the score function.
 */
function score() {
    return new FunctionExpression('score', []);
}
// /**
//  * Evaluates to an HTML-formatted text snippet that highlights terms matching
//  * the search query in `<b>bold</b>`.
//  *
//  * @remarks This Expression can only be used within a `search` stage.
//  *
//  * @param searchField Search the specified field for matching terms.
//  * @param rquery Define the search query using the search domain-specific language (DSL).
//  * @returns An `Expression` representing the snippet function.
//  */
// export function snippet(
//   searchField: string | Field,
//   rquery: string,
// ): Expression;
//
// /**
//  * Evaluates to an HTML-formatted text snippet that highlights terms matching
//  * the search query in `<b>bold</b>`.
//  *
//  * @remarks This Expression can only be used within a `search` stage.
//  *
//  * @param searchField Search the specified field for matching terms.
//  * @param options Define the search query using the search domain-specific language (DSL).
//  * @returns An `Expression` representing the snippet function.
//  */
// export function snippet(
//   searchField: string | Field,
//   options: firestore.Pipelines.SnippetOptions,
// ): Expression;
// export function snippet(
//   field: string | Field,
//   queryOrOptions: string | firestore.Pipelines.SnippetOptions,
// ): Expression {
//   return toField(field).snippet(
//     isString(queryOrOptions) ? {rquery: queryOrOptions} : queryOrOptions,
//   );
// }
/**
 * @beta
 *
 * Evaluates to the distance in meters between the location in the specified
 * field and the query location.
 *
 * @remarks This Expression can only be used within a `search` stage.
 *
 * @param fieldName - Specifies the field in the document which contains
 * the first GeoPoint for distance computation.
 * @param location - Compute distance to this GeoPoint.
 * @returns An `Expression` representing the geoDistance function.
 */
function geoDistance(fieldName, location) {
    return (0, pipeline_util_1.toField)(fieldName).geoDistance(location);
}
function ascending(field) {
    return new Ordering((0, pipeline_util_1.fieldOrExpression)(field), 'ascending');
}
function descending(field) {
    return new Ordering((0, pipeline_util_1.fieldOrExpression)(field), 'descending');
}
/**
 * Represents an ordering criterion for sorting documents in a Firestore pipeline.
 *
 * You create `Ordering` instances using the `ascending` and `descending` helper functions.
 */
class Ordering {
    expr;
    direction;
    constructor(expr, direction) {
        this.expr = expr;
        this.direction = direction;
    }
    /**
     * @internal
     * @private
     * Indicates if this expression was created from a literal value passed
     * by the caller.
     */
    _createdFromLiteral = false;
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        const expr = this.expr;
        return {
            mapValue: {
                fields: {
                    direction: serializer.encodeValue(this.direction),
                    expression: expr._toProto(serializer),
                },
            },
        };
    }
    _protoValueType = 'ProtoValue';
    /**
     * @private
     * @internal
     */
    _validateUserData(ignoreUndefinedProperties) {
        this.expr._validateUserData(ignoreUndefinedProperties);
    }
}
exports.Ordering = Ordering;
//# sourceMappingURL=expression.js.map