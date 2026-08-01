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
exports.ExecutionUtil = void 0;
exports.isFirestoreValue = isFirestoreValue;
exports.whereConditionsFromCursor = whereConditionsFromCursor;
exports.reverseOrderings = reverseOrderings;
exports.toPipelineBooleanExpr = toPipelineBooleanExpr;
exports.isString = isString;
exports.isNumber = isNumber;
exports.isSelectable = isSelectable;
exports.isOrdering = isOrdering;
exports.isAliasedAggregate = isAliasedAggregate;
exports.isExpr = isExpr;
exports.isBooleanExpr = isBooleanExpr;
exports.isAliasedExpr = isAliasedExpr;
exports.isField = isField;
exports.isPipeline = isPipeline;
exports.isCollectionReference = isCollectionReference;
exports.valueToDefaultExpr = valueToDefaultExpr;
exports.vectorToExpr = vectorToExpr;
exports.fieldOrExpression = fieldOrExpression;
exports.toField = toField;
exports.fieldOrSelectable = fieldOrSelectable;
exports.selectablesToMap = selectablesToMap;
exports.selectablesToObject = selectablesToObject;
exports.aliasedAggregateToMap = aliasedAggregateToMap;
exports.validateUserDataHelper = validateUserDataHelper;
const stream_1 = require("stream");
require("./expression");
const index_1 = require("../index");
const logger_1 = require("../logger");
const path_1 = require("../path");
const composite_filter_internal_1 = require("../reference/composite-filter-internal");
const constants_1 = require("../reference/constants");
const field_filter_internal_1 = require("../reference/field-filter-internal");
const serializer_1 = require("../serializer");
const util_1 = require("../util");
const expression_1 = require("./expression");
const pipelines_1 = require("./pipelines");
/**
 * Returns a builder for DocumentSnapshot and QueryDocumentSnapshot instances.
 * Invoke `.build()' to assemble the final snapshot.
 *
 * @private
 * @internal
 */
class ExecutionUtil {
    _firestore;
    _serializer;
    constructor(
    /** @private */
    _firestore, 
    /** @private */
    _serializer) {
        this._firestore = _firestore;
        this._serializer = _serializer;
    }
    _getResponse(structuredPipeline, transactionOrReadTime) {
        // Capture the error stack to preserve stack tracing across async calls.
        const stack = Error().stack;
        return new Promise((resolve, reject) => {
            const result = [];
            const output = {};
            const stream = this._stream(structuredPipeline, transactionOrReadTime);
            stream.on('error', err => {
                reject((0, util_1.wrapError)(err, stack));
            });
            stream.on('data', (data) => {
                for (const element of data) {
                    if (element.transaction) {
                        output.transaction = element.transaction;
                    }
                    if (element.executionTime) {
                        output.executionTime = element.executionTime;
                    }
                    if (element.explainStats) {
                        output.explainStats = element.explainStats;
                    }
                    if (element.result) {
                        result.push(element.result);
                    }
                }
            });
            stream.on('end', () => {
                output.result = result;
                resolve(output);
            });
        });
    }
    // This method exists solely to enable unit tests to mock it.
    _isPermanentRpcError(err, methodName) {
        return (0, util_1.isPermanentRpcError)(err, methodName);
    }
    _hasRetryTimedOut(methodName, startTime) {
        const totalTimeout = (0, util_1.getTotalTimeout)(methodName);
        if (totalTimeout === 0) {
            return false;
        }
        return Date.now() - startTime >= totalTimeout;
    }
    stream(structuredPipeline, transactionOrReadTime) {
        const responseStream = this._stream(structuredPipeline, transactionOrReadTime);
        const transform = new stream_1.Transform({
            objectMode: true,
            transform(chunk, encoding, callback) {
                chunk.forEach(item => {
                    if (item.result) {
                        this.push(item.result);
                    }
                });
                callback();
            },
        });
        responseStream.pipe(transform);
        responseStream.on('error', e => transform.destroy(e));
        return transform;
    }
    _stream(structuredPipeline, transactionOrReadTime) {
        const tag = (0, util_1.requestTag)();
        let backendStream;
        const stream = new stream_1.Transform({
            objectMode: true,
            transform: (proto, enc, callback) => {
                if (proto === constants_1.NOOP_MESSAGE) {
                    callback(undefined);
                    return;
                }
                if (proto.results && proto.results.length === 0) {
                    const output = {};
                    if (proto.transaction?.length) {
                        output.transaction = proto.transaction;
                    }
                    if (proto.executionTime) {
                        output.executionTime = index_1.Timestamp.fromProto(proto.executionTime);
                    }
                    callback(undefined, [output]);
                }
                else {
                    let output = proto.results.map(result => {
                        const output = {};
                        if (proto.transaction?.length) {
                            output.transaction = proto.transaction;
                        }
                        if (proto.executionTime) {
                            output.executionTime = index_1.Timestamp.fromProto(proto.executionTime);
                        }
                        const ref = result.name
                            ? new index_1.DocumentReference(this._firestore, path_1.QualifiedResourcePath.fromSlashSeparatedString(result.name))
                            : undefined;
                        if (!result.fields) {
                            (0, logger_1.logger)('_stream', null, 'Unexpected state: `result.fields` was falsey. Using an empty map.');
                        }
                        output.result = new pipelines_1.PipelineResult(this._serializer, result.fields || {}, ref, proto.executionTime
                            ? index_1.Timestamp.fromProto(proto.executionTime)
                            : undefined, result.createTime
                            ? index_1.Timestamp.fromProto(result.createTime)
                            : undefined, result.updateTime
                            ? index_1.Timestamp.fromProto(result.updateTime)
                            : undefined);
                        return output;
                    });
                    if (proto.explainStats?.data?.value) {
                        const explainStats = new pipelines_1.ExplainStats(proto.explainStats.data);
                        output = [
                            ...output,
                            {
                                explainStats,
                            },
                        ];
                    }
                    callback(undefined, output);
                }
            },
        });
        Promise.all([
            this._firestore.initializeIfNeeded(tag),
            pipelines_1.ExplainStats._ensureMessageTypesLoaded(),
        ])
            .then(async () => {
            // `toProto()` might throw an exception. We rely on the behavior of an
            // async function to convert this exception into the rejected Promise we
            // catch below.
            const request = {
                database: this._firestore.formattedName,
                structuredPipeline: structuredPipeline._toProto(this._serializer),
            };
            if (transactionOrReadTime instanceof Uint8Array) {
                request.transaction = transactionOrReadTime;
            }
            else if (transactionOrReadTime instanceof index_1.Timestamp) {
                request.readTime = transactionOrReadTime.toProto().timestampValue;
            }
            else if (transactionOrReadTime) {
                request.newTransaction = transactionOrReadTime;
            }
            let streamActive;
            do {
                streamActive = new util_1.Deferred();
                const methodName = 'executePipeline';
                backendStream = await this._firestore.requestStream(methodName, 
                /* bidirectional= */ false, request, tag);
                backendStream.on('error', err => {
                    backendStream.unpipe(stream);
                    (0, logger_1.logger)('PipelineUtil._stream', tag, 'Pipeline failed with stream error:', err);
                    stream.destroy(err);
                    streamActive.resolve(/* active= */ false);
                });
                backendStream.on('end', () => {
                    streamActive.resolve(/* active= */ false);
                });
                backendStream.resume();
                backendStream.pipe(stream);
            } while (await streamActive.promise);
        })
            .catch(e => {
            (0, logger_1.logger)('PipelineUtil._stream', tag, 'Pipeline failed with stream error:', e);
            stream.destroy(e);
        });
        return stream;
    }
}
exports.ExecutionUtil = ExecutionUtil;
function isITimestamp(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false; // Must be a non-null object
    }
    if ('seconds' in obj &&
        (obj.seconds === null ||
            typeof obj.seconds === 'number' ||
            typeof obj.seconds === 'string') &&
        'nanos' in obj &&
        (obj.nanos === null || typeof obj.nanos === 'number')) {
        return true;
    }
    return false;
}
function isILatLng(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false; // Must be a non-null object
    }
    if ('latitude' in obj &&
        (obj.latitude === null || typeof obj.latitude === 'number') &&
        'longitude' in obj &&
        (obj.longitude === null || typeof obj.longitude === 'number')) {
        return true;
    }
    return false;
}
function isIArrayValue(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false; // Must be a non-null object
    }
    if ('values' in obj && (obj.values === null || Array.isArray(obj.values))) {
        return true;
    }
    return false;
}
function isIMapValue(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false; // Must be a non-null object
    }
    if ('fields' in obj && (obj.fields === null || (0, util_1.isObject)(obj.fields))) {
        return true;
    }
    return false;
}
function isIFunction(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false; // Must be a non-null object
    }
    if ('name' in obj &&
        (obj.name === null || typeof obj.name === 'string') &&
        'args' in obj &&
        (obj.args === null || Array.isArray(obj.args))) {
        return true;
    }
    return false;
}
function isIPipeline(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false; // Must be a non-null object
    }
    if ('stages' in obj && (obj.stages === null || Array.isArray(obj.stages))) {
        return true;
    }
    return false;
}
function isFirestoreValue(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false; // Must be a non-null object
    }
    // Check optional properties and their types
    if (('nullValue' in obj &&
        (obj.nullValue === null || obj.nullValue === 'NULL_VALUE')) ||
        ('booleanValue' in obj &&
            (obj.booleanValue === null || typeof obj.booleanValue === 'boolean')) ||
        ('integerValue' in obj &&
            (obj.integerValue === null ||
                typeof obj.integerValue === 'number' ||
                typeof obj.integerValue === 'string')) ||
        ('doubleValue' in obj &&
            (obj.doubleValue === null || typeof obj.doubleValue === 'number')) ||
        ('timestampValue' in obj &&
            (obj.timestampValue === null || isITimestamp(obj.timestampValue))) ||
        ('stringValue' in obj &&
            (obj.stringValue === null || typeof obj.stringValue === 'string')) ||
        ('bytesValue' in obj &&
            (obj.bytesValue === null || obj.bytesValue instanceof Uint8Array)) ||
        ('referenceValue' in obj &&
            (obj.referenceValue === null ||
                typeof obj.referenceValue === 'string')) ||
        ('geoPointValue' in obj &&
            (obj.geoPointValue === null || isILatLng(obj.geoPointValue))) ||
        ('arrayValue' in obj &&
            (obj.arrayValue === null || isIArrayValue(obj.arrayValue))) ||
        ('mapValue' in obj &&
            (obj.mapValue === null || isIMapValue(obj.mapValue))) ||
        ('fieldReferenceValue' in obj &&
            (obj.fieldReferenceValue === null ||
                typeof obj.fieldReferenceValue === 'string')) ||
        ('functionValue' in obj &&
            (obj.functionValue === null || isIFunction(obj.functionValue))) ||
        ('pipelineValue' in obj &&
            (obj.pipelineValue === null || isIPipeline(obj.pipelineValue)))) {
        return true;
    }
    return false;
}
function whereConditionsFromCursor(cursor, orderings, position) {
    // The filterFunc is either greater than or less than
    const filterFunc = position === 'before' ? expression_1.lessThan : expression_1.greaterThan;
    const cursors = cursor.values.map(value => expression_1.Constant._fromProto(value));
    const size = cursors.length;
    let field = orderings[size - 1].expr;
    let value = cursors[size - 1];
    // Add condition for last bound
    let condition = filterFunc(field, value);
    if ((position === 'after' && cursor.before) ||
        (position === 'before' && !cursor.before)) {
        // When the cursor bound is inclusive, then the last bound
        // can be equal to the value, otherwise it's not equal
        condition = (0, expression_1.or)(condition, field.equal(value));
    }
    // Iterate backwards over the remaining bounds, adding
    // a condition for each one
    for (let i = size - 2; i >= 0; i--) {
        field = orderings[i].expr;
        value = cursors[i];
        // For each field in the orderings, the condition is either
        // a) lessThan|greaterThan the cursor value,
        // b) or equal the cursor value and lessThan|greaterThan the cursor values for other fields
        condition = (0, expression_1.or)(filterFunc(field, value), (0, expression_1.and)(field.equal(value), condition));
    }
    return condition;
}
function reverseOrderings(orderings) {
    return orderings.map(o => new expression_1.Ordering(o.expr, o.direction === 'ascending' ? 'descending' : 'ascending'));
}
function toPipelineBooleanExpr(f, serializer) {
    if (f instanceof field_filter_internal_1.FieldFilterInternal) {
        const field = (0, expression_1.field)(f.field);
        // Comparison filters
        const value = isFirestoreValue(f.value)
            ? f.value
            : serializer.encodeValue(f.value);
        switch (f.op) {
            case 'LESS_THAN':
                return (0, expression_1.and)(field.exists(), field.lessThan(value));
            case 'LESS_THAN_OR_EQUAL':
                return (0, expression_1.and)(field.exists(), field.lessThanOrEqual(value));
            case 'GREATER_THAN':
                return (0, expression_1.and)(field.exists(), field.greaterThan(value));
            case 'GREATER_THAN_OR_EQUAL':
                return (0, expression_1.and)(field.exists(), field.greaterThanOrEqual(value));
            case 'EQUAL':
                return (0, expression_1.and)(field.exists(), field.equal(value));
            case 'NOT_EQUAL':
                return (0, expression_1.and)(field.exists(), field.notEqual(value));
            case 'ARRAY_CONTAINS':
                return (0, expression_1.and)(field.exists(), field.arrayContains(value));
            case 'IN': {
                const values = value?.arrayValue?.values?.map(val => (0, expression_1.constant)(val));
                return (0, expression_1.and)(field.exists(), field.equalAny(values));
            }
            case 'ARRAY_CONTAINS_ANY': {
                const values = value?.arrayValue?.values?.map(val => (0, expression_1.constant)(val));
                return (0, expression_1.and)(field.exists(), field.arrayContainsAny(values));
            }
            case 'NOT_IN': {
                const values = value?.arrayValue?.values?.map(val => (0, expression_1.constant)(val));
                // In Enterprise DB's NOT_IN will match a field that does not exist,
                // therefore we do not want an existence filter for the NOT_IN conversion
                // so the Query and Pipeline behavior are consistent in Enterprise.
                return field.notEqualAny(values);
            }
        }
    }
    else if (f instanceof composite_filter_internal_1.CompositeFilterInternal) {
        switch (f._getOperator()) {
            case 'AND': {
                const conditions = f
                    .getFilters()
                    .map(f => toPipelineBooleanExpr(f, serializer));
                return (0, expression_1.and)(conditions[0], conditions[1], ...conditions.slice(2));
            }
            case 'OR': {
                const conditions = f
                    .getFilters()
                    .map(f => toPipelineBooleanExpr(f, serializer));
                return (0, expression_1.or)(conditions[0], conditions[1], ...conditions.slice(2));
            }
        }
    }
    throw new Error(`Failed to convert filter to pipeline conditions: ${f.toProto()}`);
}
function isString(val) {
    return typeof val === 'string';
}
function isNumber(val) {
    return typeof val === 'number';
}
function isSelectable(val) {
    const candidate = val;
    return (candidate.selectable &&
        isString(candidate._alias) &&
        isExpr(candidate._expr));
}
function isOrdering(val) {
    const candidate = val;
    return (val !== undefined &&
        isExpr(candidate.expr) &&
        (candidate.direction === 'ascending' ||
            candidate.direction === 'descending'));
}
function isAliasedAggregate(val) {
    const candidate = val;
    return (isString(candidate._alias) &&
        candidate._aggregate instanceof expression_1.AggregateFunction);
}
function isExpr(val) {
    return val instanceof expression_1.Expression;
}
function isBooleanExpr(val) {
    return val instanceof expression_1.BooleanExpression;
}
function isAliasedExpr(val) {
    return val instanceof expression_1.AliasedExpression;
}
function isField(val) {
    return val instanceof expression_1.Field;
}
function isPipeline(val) {
    return val instanceof pipelines_1.Pipeline;
}
function isCollectionReference(val) {
    return val instanceof index_1.CollectionReference;
}
/**
 * Converts a value to an Expression, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 *
 * @private
 * @internal
 * @param value
 */
function valueToDefaultExpr(value) {
    let result;
    if (isFirestoreValue(value)) {
        return (0, expression_1.constant)(value);
    }
    if (isPipeline(value)) {
        return (0, expression_1.pipelineValue)(value);
    }
    if (value instanceof expression_1.Expression) {
        return value;
    }
    else if ((0, util_1.isPlainObject)(value)) {
        result = (0, expression_1.map)(value);
    }
    else if (value instanceof Array) {
        result = (0, expression_1.array)(value);
    }
    else {
        result = (0, expression_1.constant)(value);
    }
    result._createdFromLiteral = true;
    return result;
}
/**
 * Converts a value to an Expression, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 *
 * @private
 * @internal
 * @param value
 */
function vectorToExpr(value) {
    if (value instanceof expression_1.Expression) {
        return value;
    }
    else if (value instanceof index_1.VectorValue) {
        const result = (0, expression_1.constant)(value);
        result._createdFromLiteral = true;
        return result;
    }
    else if (Array.isArray(value)) {
        const result = (0, expression_1.constant)(index_1.FieldValue.vector(value));
        result._createdFromLiteral = true;
        return result;
    }
    else {
        throw new Error('Unsupported value: ' + typeof value);
    }
}
/**
 * Converts a value to an Expression, Returning either a Constant, MapFunction,
 * ArrayFunction, or the input itself (if it's already an expression).
 * If the input is a string, it is assumed to be a field name, and a
 * field(value) is returned.
 *
 * @private
 * @internal
 * @param value
 */
function fieldOrExpression(value) {
    if (isString(value)) {
        const result = (0, expression_1.field)(value);
        result._createdFromLiteral = true;
        return result;
    }
    else {
        return valueToDefaultExpr(value);
    }
}
function toField(value) {
    if (isString(value)) {
        const result = (0, expression_1.field)(value);
        result._createdFromLiteral = true;
        return result;
    }
    else {
        return value;
    }
}
/**
 * Converts a value to a Selectable, returning either a
 * Field, or the input itself (if it's already a Selectable).
 * If the input is a string, it is assumed to be a field name, and a
 * field(value) is returned.
 *
 * @private
 * @internal
 * @param value
 */
function fieldOrSelectable(value) {
    if (isString(value)) {
        const result = (0, expression_1.field)(value);
        result._createdFromLiteral = true;
        return result;
    }
    else {
        return value;
    }
}
/**
 * @deprecated use selectablesToObject instead
 */
function selectablesToMap(selectables) {
    return new Map(Object.entries(selectablesToObject(selectables)));
}
function selectablesToObject(selectables) {
    const result = {};
    for (const selectable of selectables) {
        let alias;
        let expression;
        if (typeof selectable === 'string') {
            alias = selectable;
            expression = new expression_1.Field(path_1.FieldPath.fromArgument(selectable));
        }
        else {
            alias = selectable._alias;
            expression = selectable._expr;
        }
        if (result[alias] !== undefined) {
            throw new Error(`Duplicate alias or field '${alias}'`);
        }
        result[alias] = expression;
    }
    return result;
}
function aliasedAggregateToMap(aliasedAggregatees) {
    return aliasedAggregatees.reduce((map, selectable) => {
        if (map.get(selectable._alias) !== undefined) {
            throw new Error(`Duplicate alias or field '${selectable._alias}'`);
        }
        map.set(selectable._alias, selectable._aggregate);
        return map;
    }, new Map());
}
/**
 * @internal
 *
 * Helper to read user data across a number of different formats.
 */
function validateUserDataHelper(expressionMap, ignoreUndefinedProperties) {
    if ((0, serializer_1.hasUserData)(expressionMap)) {
        expressionMap._validateUserData(ignoreUndefinedProperties);
    }
    else if (Array.isArray(expressionMap)) {
        expressionMap.forEach(readableData => {
            readableData._validateUserData(ignoreUndefinedProperties);
        });
    }
    else {
        expressionMap.forEach(expr => expr._validateUserData(ignoreUndefinedProperties));
    }
    return expressionMap;
}
//# sourceMappingURL=pipeline-util.js.map