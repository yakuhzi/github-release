"use strict";
//  Copyright 2025 Google LLC
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      https://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Quadruple = void 0;
const quadruple_builder_1 = require("./quadruple_builder");
/*
 * @private
 * @internal
 */
class Quadruple {
    constructor(negative, biasedExponent, mantHi, mantLo) {
        this.negative = negative;
        this.biasedExponent = biasedExponent;
        this.mantHi = mantHi;
        this.mantLo = mantLo;
    }
    // The fields containing the value of the instance
    negative;
    biasedExponent;
    mantHi;
    mantLo;
    static #exponentOfInfinity = Number(quadruple_builder_1.QuadrupleBuilder.EXPONENT_OF_INFINITY);
    static positiveZero = new Quadruple(false, 0, 0n, 0n);
    static negativeZero = new Quadruple(true, 0, 0n, 0n);
    static NaN = new Quadruple(false, Quadruple.#exponentOfInfinity, 1n << 63n, 0n);
    static negativeInfinity = new Quadruple(true, Quadruple.#exponentOfInfinity, 0n, 0n);
    static positiveInfinity = new Quadruple(false, Quadruple.#exponentOfInfinity, 0n, 0n);
    static #minLong = new Quadruple(true, Quadruple.#bias(63), 0n, 0n);
    static #positiveOne = new Quadruple(false, Quadruple.#bias(0), 0n, 0n);
    static #negativeOne = new Quadruple(true, Quadruple.#bias(0), 0n, 0n);
    /** Return the (unbiased) exponent of this {@link Quadruple}. */
    exponent() {
        return this.biasedExponent - quadruple_builder_1.QuadrupleBuilder.EXPONENT_BIAS;
    }
    /** Return true if this {@link Quadruple} is -0 or +0 */
    isZero() {
        return (this.biasedExponent === 0 && this.mantHi === 0n && this.mantLo === 0n);
    }
    /** Return true if this {@link Quadruple} is -infinity or +infinity */
    isInfinite() {
        return (this.biasedExponent === Quadruple.#exponentOfInfinity &&
            this.mantHi === 0n &&
            this.mantLo === 0n);
    }
    /** Return true if this {@link Quadruple} is a NaN. */
    isNaN() {
        return (this.biasedExponent === Quadruple.#exponentOfInfinity &&
            !(this.mantHi === 0n && this.mantLo === 0n));
    }
    /** Compare two quadruples, with -0 < 0, and all NaNs equal and larger than all numbers. */
    compareTo(other) {
        if (this.isNaN()) {
            return other.isNaN() ? 0 : 1;
        }
        if (other.isNaN()) {
            return -1;
        }
        let lessThan;
        let greaterThan;
        if (this.negative) {
            if (!other.negative) {
                return -1;
            }
            lessThan = 1;
            greaterThan = -1;
        }
        else {
            if (other.negative) {
                return 1;
            }
            lessThan = -1;
            greaterThan = 1;
        }
        if (this.biasedExponent < other.biasedExponent) {
            return lessThan;
        }
        if (this.biasedExponent > other.biasedExponent) {
            return greaterThan;
        }
        if (this.mantHi < other.mantHi) {
            return lessThan;
        }
        if (this.mantHi > other.mantHi) {
            return greaterThan;
        }
        if (this.mantLo < other.mantLo) {
            return lessThan;
        }
        if (this.mantLo > other.mantLo) {
            return greaterThan;
        }
        return 0;
    }
    debug() {
        return ((this.negative ? '+' : '-') +
            Quadruple.#hex(this.mantHi) +
            Quadruple.#hex(this.mantLo) +
            '*2^' +
            this.exponent());
    }
    static #hex(n) {
        return n.toString(16).padStart(16, '0');
    }
    static fromNumber(value) {
        if (isNaN(value)) {
            return Quadruple.NaN;
        }
        if (!isFinite(value)) {
            return value < 0
                ? Quadruple.negativeInfinity
                : Quadruple.positiveInfinity;
        }
        if (value === 0) {
            // -0 === 0 and Math.sign(-0) = -0, so can't be used to distinguish 0 and -0.
            // But 1/-0=-infinity, and 1/0=infinity, and Math.sign does "work" on infinity.
            return Math.sign(1 / value) > 0
                ? Quadruple.positiveZero
                : Quadruple.negativeZero;
        }
        const array = new DataView(new ArrayBuffer(8));
        array.setFloat64(0, value);
        const bits = array.getBigUint64(0);
        let mantHi = BigInt.asUintN(64, bits << 12n);
        let exponent = Number(bits >> 52n) & 0x7ff;
        if (exponent === 0) {
            // subnormal - mantHi cannot be zero as that means value===+/-0
            const leadingZeros = quadruple_builder_1.QuadrupleBuilder.clz64(mantHi);
            mantHi = leadingZeros < 63 ? mantHi << BigInt(leadingZeros + 1) : 0n;
            exponent = -leadingZeros;
        }
        return new Quadruple(value < 0, Quadruple.#bias(exponent - 1023), mantHi, 0n);
    }
    /**
     * Converts a decimal number to a {@link Quadruple}. The supported format (no whitespace allowed)
     * is:
     *
     * <ul>
     *   <li>NaN for Quadruple.NaN
     *   <li>Infinity or +Infinity for Quadruple.POSITIVE_INFINITY
     *   <li>-Infinity for Quadruple.NEGATIVE_INFINITY
     *   <li>regular expression: [+-]?[0-9]*(.[0-9]*)?([eE][+-]?[0-9]+)? - the exponent cannot be more
     *       than 9 digits, and the whole string cannot be empty
     * </ul>
     */
    static fromString(s) {
        if (s === 'NaN') {
            return Quadruple.NaN;
        }
        if (s === '-Infinity') {
            return Quadruple.negativeInfinity;
        }
        if (s === 'Infinity' || s === '+Infinity') {
            return Quadruple.positiveInfinity;
        }
        const digits = new Array(s.length).fill(0);
        let i = 0;
        let j = 0;
        let exponent = 0;
        let negative = false;
        if (s[i] === '-') {
            negative = true;
            i++;
        }
        else if (s[i] === '+') {
            i++;
        }
        while (Quadruple.#isDigit(s, i)) {
            digits[j++] = Quadruple.#digit(s, i++);
        }
        if (s[i] === '.') {
            const decimal = ++i;
            while (Quadruple.#isDigit(s, i)) {
                digits[j++] = Quadruple.#digit(s, i++);
            }
            exponent = decimal - i;
        }
        if (s[i] === 'e' || s[i] === 'E') {
            let exponentValue = 0;
            i++;
            let exponentSign = 1;
            if (s[i] === '-') {
                exponentSign = -1;
                i++;
            }
            else if (s[i] === '+') {
                i++;
            }
            const firstExponent = i;
            while (Quadruple.#isDigit(s, i)) {
                exponentValue = exponentValue * 10 + Quadruple.#digit(s, i++);
                if (i - firstExponent > 9) {
                    throw new Error('Exponent too large ' + s);
                }
            }
            if (i === firstExponent) {
                throw new Error('Invalid number ' + s);
            }
            exponent += exponentValue * exponentSign;
        }
        if (j === 0 || i !== s.length) {
            throw new Error('Invalid number ' + s);
        }
        const parsed = quadruple_builder_1.QuadrupleBuilder.parseDecimal(digits.slice(0, j), exponent);
        return new Quadruple(negative, parsed.exponent, parsed.mantHi, parsed.mantLo);
    }
    static #isDigit(s, i) {
        const cp = s.codePointAt(i);
        return cp !== undefined && cp >= 48 && cp <= 57;
    }
    static #digit(s, i) {
        return s.codePointAt(i) - 48;
    }
    static #bias(exponent) {
        return exponent + quadruple_builder_1.QuadrupleBuilder.EXPONENT_BIAS;
    }
}
exports.Quadruple = Quadruple;
//# sourceMappingURL=quadruple.js.map