"use strict";
/**
 * Copyright 2024 Google LLC. All Rights Reserved.
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
exports.Span = void 0;
/**
 * @private
 * @internal
 */
class Span {
    span;
    constructor(span) {
        this.span = span;
    }
    end() {
        this.span?.end();
    }
    addEvent(name, attributes) {
        this.span = this.span?.addEvent(name, attributes);
        return this;
    }
    setAttributes(attributes) {
        this.span = this.span?.setAttributes(attributes);
        return this;
    }
}
exports.Span = Span;
//# sourceMappingURL=span.js.map