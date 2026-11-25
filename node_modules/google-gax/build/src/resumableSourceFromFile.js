"use strict";
/**
 * Copyright 2026 Google LLC
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
exports.resumableSourceFromFile = resumableSourceFromFile;
const featureDetection_1 = require("./featureDetection");
/**
 * Creates a {@link ResumableSource} backed by a local file.
 *
 * This factory lives outside the fallback transport entrypoint so browser
 * builds do not pull in the Node.js `fs` module. Generated clients should
 * delegate to this function rather than constructing file streams directly.
 */
function resumableSourceFromFile(filePath) {
    if (!(0, featureDetection_1.isNodeJS)()) {
        throw new Error('resumableSourceFromFile is only supported in Node.js environments.');
    }
    const fs = require('fs');
    const stat = fs.statSync(filePath);
    return {
        size: stat.size,
        getStream: (offset) => {
            const start = offset ?? 0;
            if (start < 0 || start > stat.size) {
                throw new RangeError(`Invalid start offset ${start} for file of size ${stat.size}.`);
            }
            return fs.createReadStream(filePath, { start });
        },
    };
}
//# sourceMappingURL=resumableSourceFromFile.js.map