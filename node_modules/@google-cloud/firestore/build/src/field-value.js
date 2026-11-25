"use strict";
/*!
 * Copyright 2018 Google Inc. All Rights Reserved.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteTransform = exports.FieldTransform = exports.FieldValue = exports.Bytes = exports.BsonTimestamp = exports.Decimal128Value = exports.Int32Value = exports.BsonObjectId = exports.RegexValue = exports.MaxKey = exports.MinKey = exports.VectorValue = void 0;
const deepEqual = require("fast-deep-equal");
const serializer_1 = require("./serializer");
const util_1 = require("./util");
const validate_1 = require("./validate");
const map_type_1 = require("./map-type");
const quadruple_1 = require("./quadruple");
/**
 * Represent a vector type in Firestore documents.
 * Create an instance with {@link FieldValue.vector}.
 *
 * @class VectorValue
 */
class VectorValue {
    _values;
    /**
     * @private
     * @internal
     */
    constructor(values) {
        // Making a copy of the parameter.
        this._values = (values || []).map(n => n);
    }
    /**
     * Returns a copy of the raw number array form of the vector.
     */
    toArray() {
        return this._values.map(n => n);
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return serializer.encodeVector(this._values);
    }
    /**
     * @private
     * @internal
     */
    static _fromProto(valueArray) {
        const values = valueArray.arrayValue?.values?.map(v => {
            return v.doubleValue;
        });
        return new VectorValue(values);
    }
    /**
     * Returns `true` if the two VectorValue has the same raw number arrays, returns `false` otherwise.
     */
    isEqual(other) {
        return (0, util_1.isPrimitiveArrayEqual)(this._values, other._values);
    }
}
exports.VectorValue = VectorValue;
/**
 * Represents the Firestore "Min Key" data type.
 *
 * @class MinKey
 */
class MinKey {
    static MIN_KEY_VALUE_INSTANCE = new MinKey();
    type = 'MinKey';
    constructor() { }
    /**
     * @private
     * @internal
     */
    static instance() {
        return MinKey.MIN_KEY_VALUE_INSTANCE;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return serializer.encodeMinKey();
    }
}
exports.MinKey = MinKey;
/**
 * Represents the Firestore "Max Key" data type.
 *
 * @class MaxKey
 */
class MaxKey {
    static MAX_KEY_VALUE_INSTANCE = new MaxKey();
    type = 'MaxKey';
    /**
     * @private
     * @internal
     */
    constructor() { }
    /**
     * @private
     * @internal
     */
    static instance() {
        return MaxKey.MAX_KEY_VALUE_INSTANCE;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return serializer.encodeMaxKey();
    }
}
exports.MaxKey = MaxKey;
/**
 * Represents a regular expression type in Firestore documents.
 *
 * @class RegexValue
 */
class RegexValue {
    pattern;
    options;
    /**
     * Creates a new regular expression value with the given pattern and options.
     *
     * @param pattern - The pattern to use for this regex value.
     * @param options - The options to use for this regex value.
     *
     * @private
     * @internal
     */
    constructor(pattern, options) {
        this.pattern = pattern;
        this.options = options;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return serializer.encodeRegex(this.pattern, this.options);
    }
    /**
     * @private
     * @internal
     */
    static _fromProto(proto) {
        const fields = proto.mapValue.fields;
        const pattern = fields?.[map_type_1.RESERVED_REGEX_KEY]?.mapValue?.fields?.[map_type_1.RESERVED_REGEX_PATTERN_KEY]?.stringValue ?? '';
        const options = fields?.[map_type_1.RESERVED_REGEX_KEY]?.mapValue?.fields?.[map_type_1.RESERVED_REGEX_OPTIONS_KEY]?.stringValue ?? '';
        return new RegexValue(pattern, options);
    }
    /**
     * Returns `true` if the two regex values have the same pattern and options, returns `false` otherwise.
     */
    isEqual(other) {
        return (this === other ||
            (other instanceof RegexValue &&
                this.pattern === other.pattern &&
                this.options === other.options));
    }
}
exports.RegexValue = RegexValue;
/**
 * Represents a BSON ObjectId type in Firestore documents.
 *
 * @class BsonObjectId
 */
class BsonObjectId {
    value;
    /**
     * Creates a new BSON ObjectId value with the given value.
     *
     * @param value - The 24-character hex string representing the ObjectId.
     *
     * @private
     * @internal
     */
    constructor(value) {
        this.value = value;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return serializer.encodeBsonObjectId(this.value);
    }
    /**
     * @private
     * @internal
     */
    static _fromProto(proto) {
        const oid = proto.mapValue.fields?.[map_type_1.RESERVED_BSON_OBJECT_ID_KEY]?.stringValue ?? '';
        return new BsonObjectId(oid);
    }
    /**
     * Returns `true` if the two BsonObjectId values have the same pattern and options, returns `false` otherwise.
     */
    isEqual(other) {
        return (this === other ||
            (other instanceof BsonObjectId && this.value === other.value));
    }
}
exports.BsonObjectId = BsonObjectId;
/** Represents a 32-bit integer type in Firestore documents. */
class Int32Value {
    value;
    /**
     * Creates a new 32-bit signed integer value.
     *
     * @param value - The number whose 32-bit representation will be used.
     *
     * Note: values larger than the largest 32-bit signed integer,
     * or smaller than the smallest 32-bit signed integer are invalid
     * and will get rejected.
     *
     * @private
     * @internal
     */
    constructor(value) {
        this.value = value;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return serializer.encodeInt32(this.value);
    }
    /**
     * @private
     * @internal
     */
    static _fromProto(proto) {
        const value = Number(proto.mapValue.fields?.[map_type_1.RESERVED_INT32_KEY]?.integerValue);
        return new Int32Value(value);
    }
    /**
     * Returns true if this `Int32Value` is equal to the provided one.
     *
     * @param other The `Int32Value` to compare against.
     * @return 'true' if this `Int32Value` is equal to the provided one.
     */
    isEqual(other) {
        return (this === other ||
            (other instanceof Int32Value && this.value === other.value));
    }
}
exports.Int32Value = Int32Value;
/** Represents a 128-bit decimal type in Firestore documents. */
class Decimal128Value {
    value;
    /**
     * Creates a new 128-bit decimal value.
     *
     * @param value - The string representation of the 128-bit decimal.
     *
     * @private
     * @internal
     */
    constructor(value) {
        this.value = value;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return serializer.encodeDecimal128(this.value);
    }
    /**
     * @private
     * @internal
     */
    static _fromProto(proto) {
        const value = proto.mapValue.fields?.[map_type_1.RESERVED_DECIMAL128_KEY]?.stringValue || '';
        return new Decimal128Value(value);
    }
    /**
     * Returns true if this `Decimal128Value` is equal to the provided one.
     *
     * @param other The `Decimal128Value` to compare against.
     * @return 'true' if this `Decimal128Value` is equal to the provided one.
     */
    isEqual(other) {
        if (this === other) {
            return true;
        }
        if (!(other instanceof Decimal128Value)) {
            return false;
        }
        const lhs = quadruple_1.Quadruple.fromString(this.value);
        const rhs = quadruple_1.Quadruple.fromString(other.value);
        // Firestore considers -0 and +0 to be equal, but Quadruple does not.
        if (lhs.isZero() && rhs.isZero()) {
            return true;
        }
        return lhs.compareTo(rhs) === 0;
    }
}
exports.Decimal128Value = Decimal128Value;
/** Represents a Request Timestamp type in Firestore documents. */
class BsonTimestamp {
    seconds;
    increment;
    /**
     * Creates a new BSON Timestamp from the given values.
     *
     * @param seconds - The seconds value to be used for this BSON timestamp.
     * @param increment - The increment value to be used for this BSON timestamp.
     *
     * Note: negative values and values larger than the largest 32-bit
     * unsigned integer are invalid and will get rejected.
     *
     * @private
     * @internal
     */
    constructor(seconds, increment) {
        this.seconds = seconds;
        this.increment = increment;
        if (!Number.isInteger(seconds) || seconds < 0 || seconds > 4294967295) {
            throw new Error("BsonTimestamp 'seconds' must be in the range of a 32-bit unsigned integer (0-4294967295).");
        }
        if (!Number.isInteger(increment) ||
            increment < 0 ||
            increment > 4294967295) {
            throw new Error("BsonTimestamp 'increment' must be in the range of a 32-bit unsigned integer (0-4294967295).");
        }
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        return serializer.encodeBsonTimestamp(this.seconds, this.increment);
    }
    /**
     * @private
     * @internal
     */
    static _fromProto(proto) {
        const fields = proto.mapValue.fields?.[map_type_1.RESERVED_BSON_TIMESTAMP_KEY];
        const seconds = Number(fields?.mapValue?.fields?.[map_type_1.RESERVED_BSON_TIMESTAMP_SECONDS_KEY]
            ?.integerValue);
        const increment = Number(fields?.mapValue?.fields?.[map_type_1.RESERVED_BSON_TIMESTAMP_INCREMENT_KEY]
            ?.integerValue);
        return new BsonTimestamp(seconds, increment);
    }
    /**
     * Returns true if this `BsonTimestamp` is equal to the provided one.
     *
     * @param other The `BsonTimestamp` to compare against.
     * @return 'true' if this `BsonTimestamp` is equal to the provided one.
     */
    isEqual(other) {
        return (this === other ||
            (other instanceof BsonTimestamp &&
                this.seconds === other.seconds &&
                this.increment === other.increment));
    }
}
exports.BsonTimestamp = BsonTimestamp;
/** An immutable object representing an array of bytes. */
class Bytes {
    subtype;
    data;
    constructor(data, subtype = 0) {
        this.subtype = subtype;
        if (!Number.isInteger(subtype) || subtype < 0 || subtype > 255) {
            throw new Error('The subtype for Bytes must be a value in the inclusive [0, 255] range.');
        }
        this.data = data instanceof Uint8Array ? data : new Uint8Array(data);
        this.subtype = subtype;
    }
    /**
     * Creates a new `Bytes` object from the given Base64 string, converting it to
     * bytes.
     *
     * @param base64 - The Base64 string used to create the `Bytes` object.
     * @param subtype - Optional subtype value.
     */
    static fromBase64String(base64, subtype = 0) {
        try {
            const buffer = Buffer.from(base64, 'base64');
            const data = new Uint8Array(buffer);
            return new Bytes(data, subtype);
        }
        catch (e) {
            throw new Error('Failed to parse base64 string: ' + e);
        }
    }
    /**
     * Creates a new `Bytes` object from the given Uint8Array.
     *
     * @param array - The Uint8Array used to create the `Bytes` object.
     * @param subtype - Optional subtype value.
     */
    static fromUint8Array(array, subtype = 0) {
        return new Bytes(array, subtype);
    }
    /**
     * Returns the underlying bytes as a Base64-encoded string.
     *
     * @returns The Base64-encoded string created from the `Bytes` object.
     */
    toBase64() {
        return Buffer.from(this.data.buffer, this.data.byteOffset, this.data.byteLength).toString('base64');
    }
    /**
     * Returns the underlying bytes in a new `Uint8Array`.
     *
     * @returns The Uint8Array created from the `Bytes` object.
     */
    toUint8Array() {
        return Uint8Array.from(this.data);
    }
    /**
     * Returns a string representation of the `Bytes` object.
     *
     * @returns A string representation of the `Bytes` object.
     */
    toString() {
        return ('Bytes(base64: ' + this.toBase64() + ', subtype: ' + this.subtype + ')');
    }
    /**
     * Returns true if this `Bytes` object is equal to the provided one.
     *
     * @param other - The `Bytes` object to compare against.
     * @returns true if this `Bytes` object is equal to the provided one.
     */
    isEqual(other) {
        if (other instanceof Bytes) {
            return (this.subtype === other.subtype &&
                Buffer.from(this.data).equals(other.data));
        }
        if (other instanceof Uint8Array) {
            return this.subtype === 0 && Buffer.from(this.data).equals(other);
        }
        return false;
    }
    /**
     * @private
     * @internal
     */
    _toProto(serializer) {
        if (this.subtype === 0) {
            return {
                bytesValue: this.data,
            };
        }
        return serializer.encodeBsonBinaryData(this.subtype, this.data);
    }
    /**
     * @private
     * @internal
     */
    static _fromProto(proto) {
        const fields = proto.mapValue.fields?.[map_type_1.RESERVED_BSON_BINARY_KEY];
        const subtypeAndData = fields?.bytesValue;
        if (!subtypeAndData) {
            throw new Error('Received incorrect bytesValue for Bytes');
        }
        const bytes = typeof subtypeAndData === 'string'
            ? Buffer.from(subtypeAndData, 'base64')
            : subtypeAndData;
        if (bytes.length === 0) {
            throw new Error('Received empty bytesValue for Bytes');
        }
        const subtype = bytes[0];
        const data = new Uint8Array(bytes.subarray(1));
        return new Bytes(data, subtype);
    }
}
exports.Bytes = Bytes;
/**
 * Sentinel values that can be used when writing documents with set(), create()
 * or update().
 *
 * @class FieldValue
 */
class FieldValue {
    /** @private */
    constructor() { }
    /**
     * Creates a new `VectorValue` constructed with a copy of the given array of numbers.
     *
     * @param values - Create a `VectorValue` instance with a copy of this array of numbers.
     *
     * @returns A new `VectorValue` constructed with a copy of the given array of numbers.
     */
    static vector(values) {
        return new VectorValue(values);
    }
    /**
     * Returns a sentinel for use with update() or set() with {merge:true} to mark
     * a field for deletion.
     *
     * @returns {FieldValue} The sentinel value to use in your objects.
     *
     * @example
     * ```
     * let documentRef = firestore.doc('col/doc');
     * let data = { a: 'b', c: 'd' };
     *
     * documentRef.set(data).then(() => {
     *   return documentRef.update({a: Firestore.FieldValue.delete()});
     * }).then(() => {
     *   // Document now only contains { c: 'd' }
     * });
     * ```
     */
    static delete() {
        return DeleteTransform.DELETE_SENTINEL;
    }
    /**
     * Returns a sentinel used with set(), create() or update() to include a
     * server-generated timestamp in the written data.
     *
     * @returns {FieldValue} The FieldValue sentinel for use in a call to set(),
     * create() or update().
     *
     * @example
     * ```
     * let documentRef = firestore.doc('col/doc');
     *
     * documentRef.set({
     *   time: Firestore.FieldValue.serverTimestamp()
     * }).then(() => {
     *   return documentRef.get();
     * }).then(doc => {
     *   console.log(`Server time set to ${doc.get('time')}`);
     * });
     * ```
     */
    static serverTimestamp() {
        return ServerTimestampTransform.SERVER_TIMESTAMP_SENTINEL;
    }
    /**
     * Returns a special value that can be used with set(), create() or update()
     * that tells the server to increment the field's current value by the
     * given value.
     *
     * If either current field value or the operand uses floating point
     * precision, both values will be interpreted as floating point numbers and
     * all arithmetic will follow IEEE 754 semantics. Otherwise, integer
     * precision is kept and the result is capped between -2^63 and 2^63-1.
     *
     * If the current field value is not of type 'number', or if the field does
     * not yet exist, the transformation will set the field to the given value.
     *
     * @param {number} n The value to increment by.
     * @returns {FieldValue} The FieldValue sentinel for use in a call to set(),
     * create() or update().
     *
     * @example
     * ```
     * let documentRef = firestore.doc('col/doc');
     *
     * documentRef.update(
     *   'counter', Firestore.FieldValue.increment(1)
     * ).then(() => {
     *   return documentRef.get();
     * }).then(doc => {
     *   // doc.get('counter') was incremented
     * });
     * ```
     */
    static increment(n) {
        // eslint-disable-next-line prefer-rest-params
        (0, validate_1.validateMinNumberOfArguments)('FieldValue.increment', arguments, 1);
        return new NumericIncrementTransform(n);
    }
    /**
     * Returns a special value that can be used with `set()`, `create()` or `update()`
     * that tells the server to set the field to the numeric minimum of the
     * field's current and the given value.
     *
     * If the current field value is not of type 'number', or if the field does
     * not yet exist, the transformation will set the field to the given value.
     *
     * If the existing value and the operand are equivalent, then the field does
     * not change. For example, `0`, `0.0`, and `-0.0` are all equivalent. If the
     * operand is `NaN` then the result is always `NaN`.
     *
     * @param {number} n The value to compare to the exiting field value.
     * @return {FieldValue} The FieldValue for use in a call to `set()`, `create()` or
     * `update()`.
     *
     * @example
     * ```typescript
     * let documentRef = firestore.doc('col/doc');
     *
     * documentRef.update(
     *   'counter', Firestore.FieldValue.minimum(1)
     * ).then(() => {
     *   return documentRef.get();
     * }).then(doc => {
     *   // doc.get('counter') is the minimum of either the existing value or 1
     * });
     * ```
     */
    static minimum(n) {
        // eslint-disable-next-line prefer-rest-params
        (0, validate_1.validateMinNumberOfArguments)('FieldValue.minimum', arguments, 1);
        return new NumericMinimumTransform(n);
    }
    /**
     * Returns a special value that can be used with `set()`, `create()` or `update()`
     * that tells the server to set the field to the numeric maximum of the
     * field's current and the given value.
     *
     * If the current field value is not of type 'number', or if the field does
     * not yet exist, the transformation will set the field to the given value.
     *
     * If the existing value and the operand are equivalent, then the field does
     * not change. For example, `0`, `0.0`, and `-0.0` are all equivalent. If the
     * operand is `NaN` then the result is always `NaN`.
     *
     * @param {number} n The value to compare to the exiting field value.
     * @return {FieldValue} The `FieldValue` for use in a call to `set()`, `create()` or
     * `update()`.
     *
     * @example
     * ```typescript
     * let documentRef = firestore.doc('col/doc');
     *
     * documentRef.update(
     *   'counter', Firestore.FieldValue.maximum(1)
     * ).then(() => {
     *   return documentRef.get();
     * }).then(doc => {
     *   // doc.get('counter') is the maximum of either the existing value or 1
     * });
     * ```
     */
    static maximum(n) {
        // eslint-disable-next-line prefer-rest-params
        (0, validate_1.validateMinNumberOfArguments)('FieldValue.maximum', arguments, 1);
        return new NumericMaximumTransform(n);
    }
    /**
     * Returns a special value that can be used with set(), create() or update()
     * that tells the server to union the given elements with any array value that
     * already exists on the server. Each specified element that doesn't already
     * exist in the array will be added to the end. If the field being modified is
     * not already an array it will be overwritten with an array containing
     * exactly the specified elements.
     *
     * @param {...*} elements The elements to union into the array.
     * @returns {FieldValue} The FieldValue sentinel for use in a call to set(),
     * create() or update().
     *
     * @example
     * ```
     * let documentRef = firestore.doc('col/doc');
     *
     * documentRef.update(
     *   'array', Firestore.FieldValue.arrayUnion('foo')
     * ).then(() => {
     *   return documentRef.get();
     * }).then(doc => {
     *   // doc.get('array') contains field 'foo'
     * });
     * ```
     */
    static arrayUnion(...elements) {
        (0, validate_1.validateMinNumberOfArguments)('FieldValue.arrayUnion', elements, 1);
        return new ArrayUnionTransform(elements);
    }
    /**
     * Returns a special value that can be used with set(), create() or update()
     * that tells the server to remove the given elements from any array value
     * that already exists on the server. All instances of each element specified
     * will be removed from the array. If the field being modified is not already
     * an array it will be overwritten with an empty array.
     *
     * @param {...*} elements The elements to remove from the array.
     * @returns {FieldValue} The FieldValue sentinel for use in a call to set(),
     * create() or update().
     *
     * @example
     * ```
     * let documentRef = firestore.doc('col/doc');
     *
     * documentRef.update(
     *   'array', Firestore.FieldValue.arrayRemove('foo')
     * ).then(() => {
     *   return documentRef.get();
     * }).then(doc => {
     *   // doc.get('array') no longer contains field 'foo'
     * });
     * ```
     */
    static arrayRemove(...elements) {
        (0, validate_1.validateMinNumberOfArguments)('FieldValue.arrayRemove', elements, 1);
        return new ArrayRemoveTransform(elements);
    }
    /**
     * Returns true if this `FieldValue` is equal to the provided value.
     *
     * @param {*} other The value to compare against.
     * @returns {boolean} true if this `FieldValue` is equal to the provided value.
     *
     * @example
     * ```
     * let fieldValues = [
     *   Firestore.FieldValue.increment(-1.0),
     *   Firestore.FieldValue.increment(-1),
     *   Firestore.FieldValue.increment(-0.0),
     *   Firestore.FieldValue.increment(-0),
     *   Firestore.FieldValue.increment(0),
     *   Firestore.FieldValue.increment(0.0),
     *   Firestore.FieldValue.increment(1),
     *   Firestore.FieldValue.increment(1.0)
     * ];
     *
     * let equal = 0;
     * for (let i = 0; i < fieldValues.length; ++i) {
     *   for (let j = i + 1; j < fieldValues.length; ++j) {
     *     if (fieldValues[i].isEqual(fieldValues[j])) {
     *       ++equal;
     *     }
     *   }
     * }
     * console.log(`Found ${equal} equalities.`);
     * ```
     */
    isEqual(other) {
        return this === other;
    }
}
exports.FieldValue = FieldValue;
/**
 * An internal interface shared by all field transforms.
 *
 * A 'FieldTransform` subclass should implement '.includeInDocumentMask',
 * '.includeInDocumentTransform' and 'toProto' (if '.includeInDocumentTransform'
 * is 'true').
 *
 * @private
 * @internal
 * @abstract
 */
class FieldTransform extends FieldValue {
}
exports.FieldTransform = FieldTransform;
/**
 * A transform that deletes a field from a Firestore document.
 *
 * @private
 * @internal
 */
class DeleteTransform extends FieldTransform {
    /**
     * Sentinel value for a field delete.
     * @private
     * @internal
     */
    static DELETE_SENTINEL = new DeleteTransform();
    constructor() {
        super();
    }
    /**
     * Deletes are included in document masks.
     * @private
     * @internal
     */
    get includeInDocumentMask() {
        return true;
    }
    /**
     * Deletes are are omitted from document transforms.
     * @private
     * @internal
     */
    get includeInDocumentTransform() {
        return false;
    }
    get methodName() {
        return 'FieldValue.delete';
    }
    validate() { }
    toProto() {
        throw new Error('FieldValue.delete() should not be included in a FieldTransform');
    }
}
exports.DeleteTransform = DeleteTransform;
/**
 * A transform that sets a field to the Firestore server time.
 *
 * @private
 * @internal
 */
class ServerTimestampTransform extends FieldTransform {
    /**
     * Sentinel value for a server timestamp.
     *
     * @private
     * @internal
     */
    static SERVER_TIMESTAMP_SENTINEL = new ServerTimestampTransform();
    constructor() {
        super();
    }
    /**
     * Server timestamps are omitted from document masks.
     *
     * @private
     * @internal
     */
    get includeInDocumentMask() {
        return false;
    }
    /**
     * Server timestamps are included in document transforms.
     *
     * @private
     * @internal
     */
    get includeInDocumentTransform() {
        return true;
    }
    get methodName() {
        return 'FieldValue.serverTimestamp';
    }
    validate() { }
    toProto(serializer, fieldPath) {
        return {
            fieldPath: fieldPath.formattedName,
            setToServerValue: 'REQUEST_TIME',
        };
    }
}
/**
 * Base class of numeric field transforms.
 * @private
 * @internal
 */
class NumericFieldTransform extends FieldTransform {
    operand;
    constructor(operand) {
        super();
        this.operand = operand;
    }
    /**
     * Numeric transforms are omitted from document masks.
     *
     * @private
     * @internal
     */
    get includeInDocumentMask() {
        return false;
    }
    /**
     * Numeric transforms are included in document transforms.
     *
     * @private
     * @internal
     */
    get includeInDocumentTransform() {
        return true;
    }
    validate() {
        (0, validate_1.validateNumber)(this.methodName + '()', this.operand);
    }
}
/**
 * Increments a field value on the backend.
 *
 * @private
 * @internal
 */
class NumericIncrementTransform extends NumericFieldTransform {
    constructor(operand) {
        super(operand);
    }
    get methodName() {
        return 'FieldValue.increment';
    }
    toProto(serializer, fieldPath) {
        const encodedOperand = serializer.encodeValue(this.operand);
        return { fieldPath: fieldPath.formattedName, increment: encodedOperand };
    }
    isEqual(other) {
        return (this === other ||
            (other instanceof NumericIncrementTransform &&
                (this.operand === other.operand ||
                    (Number.isNaN(this.operand) && Number.isNaN(other.operand)))));
    }
}
/**
 * Sets a field to the minimum of existing or operand.
 *
 * @private
 * @internal
 */
class NumericMinimumTransform extends NumericFieldTransform {
    constructor(operand) {
        super(operand);
    }
    get methodName() {
        return 'FieldValue.minimum';
    }
    toProto(serializer, fieldPath) {
        const encodedOperand = serializer.encodeValue(this.operand);
        return { fieldPath: fieldPath.formattedName, minimum: encodedOperand };
    }
    isEqual(other) {
        return (this === other ||
            (other instanceof NumericMinimumTransform &&
                (this.operand === other.operand ||
                    (Number.isNaN(this.operand) && Number.isNaN(other.operand)))));
    }
}
/**
 * Sets a field to the maximum of existing or operand.
 *
 * @private
 * @internal
 */
class NumericMaximumTransform extends NumericFieldTransform {
    constructor(operand) {
        super(operand);
    }
    get methodName() {
        return 'FieldValue.maximum';
    }
    toProto(serializer, fieldPath) {
        const encodedOperand = serializer.encodeValue(this.operand);
        return { fieldPath: fieldPath.formattedName, maximum: encodedOperand };
    }
    isEqual(other) {
        return (this === other ||
            (other instanceof NumericMaximumTransform &&
                (this.operand === other.operand ||
                    (Number.isNaN(this.operand) && Number.isNaN(other.operand)))));
    }
}
/**
 * Transforms an array value via a union operation.
 *
 * @private
 * @internal
 */
class ArrayUnionTransform extends FieldTransform {
    elements;
    constructor(elements) {
        super();
        this.elements = elements;
    }
    /**
     * Array transforms are omitted from document masks.
     * @private
     * @internal
     */
    get includeInDocumentMask() {
        return false;
    }
    /**
     * Array transforms are included in document transforms.
     * @private
     * @internal
     */
    get includeInDocumentTransform() {
        return true;
    }
    get methodName() {
        return 'FieldValue.arrayUnion';
    }
    validate(allowUndefined) {
        for (let i = 0; i < this.elements.length; ++i) {
            validateArrayElement(i, this.elements[i], allowUndefined);
        }
    }
    toProto(serializer, fieldPath) {
        const encodedElements = serializer.encodeValue(this.elements).arrayValue;
        return {
            fieldPath: fieldPath.formattedName,
            appendMissingElements: encodedElements,
        };
    }
    isEqual(other) {
        return (this === other ||
            (other instanceof ArrayUnionTransform &&
                deepEqual(this.elements, other.elements)));
    }
}
/**
 * Transforms an array value via a remove operation.
 *
 * @private
 * @internal
 */
class ArrayRemoveTransform extends FieldTransform {
    elements;
    constructor(elements) {
        super();
        this.elements = elements;
    }
    /**
     * Array transforms are omitted from document masks.
     * @private
     * @internal
     */
    get includeInDocumentMask() {
        return false;
    }
    /**
     * Array transforms are included in document transforms.
     * @private
     * @internal
     */
    get includeInDocumentTransform() {
        return true;
    }
    get methodName() {
        return 'FieldValue.arrayRemove';
    }
    validate(allowUndefined) {
        for (let i = 0; i < this.elements.length; ++i) {
            validateArrayElement(i, this.elements[i], allowUndefined);
        }
    }
    toProto(serializer, fieldPath) {
        const encodedElements = serializer.encodeValue(this.elements).arrayValue;
        return {
            fieldPath: fieldPath.formattedName,
            removeAllFromArray: encodedElements,
        };
    }
    isEqual(other) {
        return (this === other ||
            (other instanceof ArrayRemoveTransform &&
                deepEqual(this.elements, other.elements)));
    }
}
/**
 * Validates that `value` can be used as an element inside of an array. Certain
 * field values (such as ServerTimestamps) are rejected. Nested arrays are also
 * rejected.
 *
 * @private
 * @internal
 * @param arg The argument name or argument index (for varargs methods).
 * @param value The value to validate.
 * @param allowUndefined Whether to allow nested properties that are `undefined`.
 */
function validateArrayElement(arg, value, allowUndefined) {
    if (Array.isArray(value)) {
        throw new Error(`${(0, validate_1.invalidArgumentMessage)(arg, 'array element')} Nested arrays are not supported.`);
    }
    (0, serializer_1.validateUserInput)(arg, value, 'array element', 
    /*path=*/ { allowDeletes: 'none', allowTransforms: false, allowUndefined }, 
    /*path=*/ undefined, 
    /*level=*/ 0, 
    /*inArray=*/ true);
}
//# sourceMappingURL=field-value.js.map