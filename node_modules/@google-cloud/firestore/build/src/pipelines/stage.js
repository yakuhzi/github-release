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
exports.LiteralsSource = exports.UpsertStage = exports.InsertStage = exports.UpdateStage = exports.DeleteStage = exports.RawStage = exports.SubcollectionSource = exports.Define = exports.Search = exports.Sort = exports.AddFields = exports.Select = exports.ReplaceWith = exports.Offset = exports.Limit = exports.Unnest = exports.Union = exports.Sample = exports.FindNearest = exports.Where = exports.DocumentsSource = exports.DatabaseSource = exports.CollectionGroupSource = exports.CollectionSource = exports.Distinct = exports.Aggregate = exports.RemoveFields = void 0;
const serializer_1 = require("../serializer");
const field_value_1 = require("../field-value");
const util_1 = require("../util");
const expression_1 = require("./expression");
const options_util_1 = require("./options-util");
const pipeline_util_1 = require("./pipeline-util");
/**
 * RemoveFields stage.
 */
class RemoveFields {
    options;
    name = 'remove_fields';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: this.options.fields.map(f => serializer.encodeValue(f)),
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.fields, ignoreUndefinedProperties);
    }
}
exports.RemoveFields = RemoveFields;
/**
 * Aggregate stage.
 */
class Aggregate {
    options;
    name = 'aggregate';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [
                serializer.encodeValue(this.options.accumulators),
                serializer.encodeValue(this.options.groups),
            ],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.groups, ignoreUndefinedProperties);
        (0, pipeline_util_1.validateUserDataHelper)(this.options.accumulators, ignoreUndefinedProperties);
    }
}
exports.Aggregate = Aggregate;
/**
 * Distinct stage.
 */
class Distinct {
    options;
    name = 'distinct';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [serializer.encodeValue(this.options.groups)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.groups, ignoreUndefinedProperties);
    }
}
exports.Distinct = Distinct;
/**
 * Collection stage.
 */
class CollectionSource {
    options;
    name = 'collection';
    optionsUtil = new options_util_1.OptionsUtil({
        forceIndex: {
            serverName: 'force_index',
        },
    });
    collectionPath;
    constructor(options) {
        this.options = options;
        this.collectionPath = this.options.collection.path;
        // prepend slash to collection string
        if (!this.collectionPath.startsWith('/')) {
            this.collectionPath = '/' + this.collectionPath;
        }
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [serializer.encodeReference(this.collectionPath)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(_ignoreUndefinedProperties) { }
}
exports.CollectionSource = CollectionSource;
/**
 * CollectionGroup stage
 */
class CollectionGroupSource {
    options;
    name = 'collection_group';
    optionsUtil = new options_util_1.OptionsUtil({
        forceIndex: {
            serverName: 'force_index',
        },
    });
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [
                serializer.encodeReference(''),
                serializer.encodeValue(this.options.collectionId),
            ],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(_ignoreUndefinedProperties) { }
}
exports.CollectionGroupSource = CollectionGroupSource;
/**
 * Database stage.
 */
class DatabaseSource {
    options;
    name = 'database';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(_ignoreUndefinedProperties) { }
}
exports.DatabaseSource = DatabaseSource;
/**
 * Documents stage.
 */
class DocumentsSource {
    options;
    name = 'documents';
    optionsUtil = new options_util_1.OptionsUtil({});
    formattedPaths;
    constructor(options) {
        this.options = options;
        this.formattedPaths = options.docs.map(ref => '/' + ref.path);
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: this.formattedPaths.map(p => serializer.encodeReference(p)),
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(_ignoreUndefinedProperties) { }
}
exports.DocumentsSource = DocumentsSource;
/**
 * Where stage.
 */
class Where {
    options;
    name = 'where';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [this.options.condition._toProto(serializer)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.condition, ignoreUndefinedProperties);
    }
}
exports.Where = Where;
/**
 * FindNearest stage.
 */
class FindNearest {
    _options;
    name = 'find_nearest';
    optionsUtil = new options_util_1.OptionsUtil({
        limit: {
            serverName: 'limit',
        },
        distanceField: {
            serverName: 'distance_field',
        },
    });
    constructor(_options) {
        this._options = _options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [
                serializer.encodeValue(this._options.field),
                serializer.encodeValue(this._options.vectorValue),
                serializer.encodeValue(this._options.distanceMeasure),
            ],
            options: this.optionsUtil.getOptionsProto(serializer, this._options, this._options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this._options.field, ignoreUndefinedProperties);
        (0, pipeline_util_1.validateUserDataHelper)(this._options.vectorValue, ignoreUndefinedProperties);
        if (this._options.distanceField) {
            (0, pipeline_util_1.validateUserDataHelper)(this._options.distanceField, ignoreUndefinedProperties);
        }
    }
}
exports.FindNearest = FindNearest;
/**
 * Sample stage.
 */
class Sample {
    options;
    name = 'sample';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [
                serializer.encodeValue(this.options.rate),
                serializer.encodeValue(this.options.mode),
            ],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(_ignoreUndefinedProperties) { }
}
exports.Sample = Sample;
/**
 * Union stage.
 */
class Union {
    options;
    name = 'union';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [serializer.encodeValue(this.options.other)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        // A Union stage embeds a full pipeline, we trigger its validation here.
        this.options.other._validateUserData(ignoreUndefinedProperties);
    }
}
exports.Union = Union;
/**
 * Unnest stage.
 */
class Unnest {
    options;
    name = 'unnest';
    optionsUtil = new options_util_1.OptionsUtil({
        indexField: {
            serverName: 'index_field',
        },
    });
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [
                serializer.encodeValue(this.options.expr),
                serializer.encodeValue((0, expression_1.field)(this.options.alias)),
            ],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.expr, ignoreUndefinedProperties);
    }
}
exports.Unnest = Unnest;
/**
 * Limit stage.
 */
class Limit {
    options;
    name = 'limit';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [serializer.encodeValue(this.options.limit)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(_ignoreUndefinedProperties) { }
}
exports.Limit = Limit;
/**
 * Offset stage.
 */
class Offset {
    options;
    name = 'offset';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [serializer.encodeValue(this.options.offset)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(_ignoreUndefinedProperties) { }
}
exports.Offset = Offset;
/**
 * ReplaceWith stage.
 */
class ReplaceWith {
    options;
    name = 'replace_with';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [
                serializer.encodeValue(this.options.map),
                serializer.encodeValue('full_replace'),
            ],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.map, ignoreUndefinedProperties);
    }
}
exports.ReplaceWith = ReplaceWith;
/**
 * Select stage.
 */
class Select {
    options;
    name = 'select';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [serializer.encodeValue(this.options.selections)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.selections, ignoreUndefinedProperties);
    }
}
exports.Select = Select;
/**
 * AddFields stage.
 */
class AddFields {
    options;
    name = 'add_fields';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [serializer.encodeValue(this.options.fields)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.fields, ignoreUndefinedProperties);
    }
}
exports.AddFields = AddFields;
/**
 * Sort stage.
 */
class Sort {
    options;
    name = 'sort';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: this.options.orderings.map(o => serializer.encodeValue(o)),
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.orderings, ignoreUndefinedProperties);
    }
}
exports.Sort = Sort;
/**
 * Search stage.
 */
class Search {
    options;
    name = 'search';
    constructor(options) {
        this.options = options;
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.query, ignoreUndefinedProperties);
        if (this.options.sort) {
            (0, pipeline_util_1.validateUserDataHelper)(this.options.sort, ignoreUndefinedProperties);
        }
        if (this.options.select) {
            (0, pipeline_util_1.validateUserDataHelper)(Object.values(this.options.select), ignoreUndefinedProperties);
        }
        if (this.options.addFields) {
            (0, pipeline_util_1.validateUserDataHelper)(Object.values(this.options.addFields), ignoreUndefinedProperties);
        }
    }
    optionsUtil = new options_util_1.OptionsUtil({
        query: {
            serverName: 'query',
        },
        limit: {
            serverName: 'limit',
        },
        retrievalDepth: {
            serverName: 'retrieval_depth',
        },
        sort: {
            serverName: 'sort',
        },
        addFields: {
            serverName: 'add_fields',
        },
        select: {
            serverName: 'select',
        },
        offset: {
            serverName: 'offset',
        },
        queryEnhancement: {
            serverName: 'query_enhancement',
        },
        languageCode: {
            serverName: 'language_code',
        },
    });
    _toProto(serializer) {
        return {
            name: this.name,
            args: [],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
}
exports.Search = Search;
/**
 * Define stage.
 */
class Define {
    options;
    name = 'let';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [serializer.encodeValue(this.options.variables)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.options.variables, ignoreUndefinedProperties);
    }
}
exports.Define = Define;
/**
 * Subcollection stage.
 */
class SubcollectionSource {
    options;
    name = 'subcollection';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        return {
            name: this.name,
            args: [serializer.encodeValue(this.options.path)],
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(_ignoreUndefinedProperties) { }
}
exports.SubcollectionSource = SubcollectionSource;
/**
 * Raw stage.
 */
class RawStage {
    name;
    params;
    rawOptions;
    optionsUtil = new options_util_1.OptionsUtil({});
    /**
     * @private
     * @internal
     */
    constructor(name, params, rawOptions) {
        this.name = name;
        this.params = params;
        this.rawOptions = rawOptions;
    }
    /**
     * @internal
     * @private
     */
    _toProto(serializer) {
        return {
            name: this.name,
            args: this.params.map(o => o._toProto(serializer)),
            options: this.optionsUtil.getOptionsProto(serializer, {}, this.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.params, ignoreUndefinedProperties);
    }
}
exports.RawStage = RawStage;
/**
 * Delete stage.
 */
class DeleteStage {
    options;
    name = 'delete';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options = {}) {
        this.options = options;
    }
    _toProto(serializer) {
        const args = [];
        return {
            name: this.name,
            args,
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(_) { }
}
exports.DeleteStage = DeleteStage;
/**
 * Update stage.
 */
class UpdateStage {
    options;
    name = 'update';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options = {}) {
        this.options = options;
    }
    _toProto(serializer) {
        const args = [
            serializer.encodeValue(this.options.transformedFields ?? new Map()),
        ];
        return {
            name: this.name,
            args,
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        if (this.options.transformedFields) {
            (0, pipeline_util_1.validateUserDataHelper)(this.options.transformedFields, ignoreUndefinedProperties);
        }
    }
}
exports.UpdateStage = UpdateStage;
/**
 * Converts the `collection` option of an insert or upsert stage to a
 * collection path with a leading slash. Throws if the path is empty.
 */
function normalizeDmlCollectionPath(methodName, collection) {
    const path = typeof collection === 'string'
        ? collection
        : collection.path;
    if (!path) {
        // The error matches the Web SDK.
        throw new Error(`Function ${methodName}() cannot be called with an empty collection path.`);
    }
    return path.startsWith('/') ? path : '/' + path;
}
/**
 * Insert stage.
 */
class InsertStage {
    options;
    name = 'insert';
    optionsUtil = new options_util_1.OptionsUtil({});
    collectionPath;
    documentIdExpr;
    constructor(options = {}) {
        this.options = options;
        if (options.collection !== undefined) {
            this.collectionPath = normalizeDmlCollectionPath('insert', options.collection);
        }
        if (options.documentIdExpression) {
            this.documentIdExpr =
                typeof options.documentIdExpression === 'string'
                    ? (0, expression_1.field)(options.documentIdExpression)
                    : options.documentIdExpression;
        }
    }
    _toProto(serializer) {
        const options = this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions) || {};
        if (this.collectionPath) {
            options['collection'] = serializer.encodeReference(this.collectionPath);
        }
        if (this.documentIdExpr) {
            options['document_id'] = this.documentIdExpr._toProto(serializer);
        }
        return {
            name: this.name,
            args: [],
            options: Object.keys(options).length > 0 ? options : undefined,
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        if (this.documentIdExpr) {
            (0, pipeline_util_1.validateUserDataHelper)(this.documentIdExpr, ignoreUndefinedProperties);
        }
    }
}
exports.InsertStage = InsertStage;
/**
 * Upsert stage.
 */
class UpsertStage {
    options;
    name = 'upsert';
    optionsUtil = new options_util_1.OptionsUtil({});
    collectionPath;
    documentIdExpr;
    additionalFields;
    constructor(options = {}) {
        this.options = options;
        const opts = options;
        this.additionalFields = (0, pipeline_util_1.selectablesToMap)((opts.additionalFields ?? []));
        if (opts.collection !== undefined) {
            this.collectionPath = normalizeDmlCollectionPath('upsert', opts.collection);
        }
        if (opts.documentIdExpression) {
            this.documentIdExpr =
                typeof opts.documentIdExpression === 'string'
                    ? (0, expression_1.field)(opts.documentIdExpression)
                    : opts.documentIdExpression;
        }
    }
    _toProto(serializer) {
        const options = this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions) || {};
        if (this.collectionPath) {
            options['collection'] = serializer.encodeReference(this.collectionPath);
        }
        if (this.documentIdExpr) {
            options['document_id'] = this.documentIdExpr._toProto(serializer);
        }
        const args = [serializer.encodeValue(this.additionalFields)];
        return {
            name: this.name,
            args,
            options: Object.keys(options).length > 0 ? options : undefined,
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        (0, pipeline_util_1.validateUserDataHelper)(this.additionalFields, ignoreUndefinedProperties);
        if (this.documentIdExpr) {
            (0, pipeline_util_1.validateUserDataHelper)(this.documentIdExpr, ignoreUndefinedProperties);
        }
    }
}
exports.UpsertStage = UpsertStage;
/**
 * Literals stage.
 */
class LiteralsSource {
    options;
    name = 'literals';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(options) {
        this.options = options;
    }
    _toProto(serializer) {
        // Each document is sent as a top-level mapValue. The backend only
        // evaluates expressions in the top-level fields of a literal document, so
        // nested objects and arrays are converted to map() and array() expressions
        // (the same conversion used for objects and arrays passed to expressions
        // and to rawStage()). This allows expressions at any depth.
        const args = this.options.documents.map(doc => {
            const fields = new Map();
            for (const [key, value] of Object.entries(doc)) {
                if (value !== undefined) {
                    fields.set(key, (0, pipeline_util_1.valueToDefaultExpr)(value));
                }
            }
            return new expression_1.MapValue(fields)._toProto(serializer);
        });
        return {
            name: this.name,
            args,
            options: this.optionsUtil.getOptionsProto(serializer, this.options, this.options.rawOptions),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        const validate = (value, path) => {
            const location = path.length > 0 ? ` (found in field ${path.join('.')})` : '';
            if (value instanceof field_value_1.FieldTransform) {
                // FieldValue sentinels (serverTimestamp(), increment(), delete(), ...)
                // have no representation in a pipeline, so they cannot be encoded.
                // The error matches the Web SDK.
                throw new Error(`Function literals() called with invalid data. ${value.methodName}() ` +
                    `can only be used with update() and set()${location}`);
            }
            else if (value === undefined) {
                // Undefined values are omitted from the encoded document, which is
                // only allowed when `ignoreUndefinedProperties` is enabled.
                if (!ignoreUndefinedProperties) {
                    throw new Error('Function literals() called with invalid data. Cannot use ' +
                        `"undefined" as a Firestore value${location}. If you want to ` +
                        'ignore undefined values, enable `ignoreUndefinedProperties`.');
                }
            }
            else if (value === null) {
                // null is a valid literal value.
            }
            else if ((0, serializer_1.hasUserData)(value)) {
                value._validateUserData(ignoreUndefinedProperties);
            }
            else if (Array.isArray(value)) {
                value.forEach(element => validate(element, path));
            }
            else if ((0, util_1.isPlainObject)(value)) {
                Object.entries(value).forEach(([key, fieldValue]) => validate(fieldValue, [...path, key]));
            }
        };
        this.options.documents.forEach(doc => validate(doc, []));
    }
}
exports.LiteralsSource = LiteralsSource;
//# sourceMappingURL=stage.js.map