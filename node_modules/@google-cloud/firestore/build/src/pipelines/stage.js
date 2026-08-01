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
exports.UpdateStage = exports.DeleteStage = exports.RawStage = exports.SubcollectionSource = exports.Define = exports.Search = exports.Sort = exports.AddFields = exports.Select = exports.ReplaceWith = exports.Offset = exports.Limit = exports.Unnest = exports.Union = exports.Sample = exports.FindNearest = exports.Where = exports.DocumentsSource = exports.DatabaseSource = exports.CollectionGroupSource = exports.CollectionSource = exports.Distinct = exports.Aggregate = exports.RemoveFields = void 0;
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
    name = 'delete';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor() { }
    _toProto(serializer) {
        const args = [];
        return {
            name: this.name,
            args,
            options: this.optionsUtil.getOptionsProto(serializer, {}, {}),
        };
    }
    _validateUserData(_) { }
}
exports.DeleteStage = DeleteStage;
/**
 * Update stage.
 */
class UpdateStage {
    transformedFields;
    name = 'update';
    optionsUtil = new options_util_1.OptionsUtil({});
    constructor(transformedFields) {
        this.transformedFields = transformedFields;
    }
    _toProto(serializer) {
        const args = [];
        if (this.transformedFields && this.transformedFields.length > 0) {
            const mapped = (0, pipeline_util_1.selectablesToMap)(this.transformedFields);
            args.push(serializer.encodeValue(mapped));
        }
        else {
            args.push(serializer.encodeValue(new Map()));
        }
        return {
            name: this.name,
            args,
            options: this.optionsUtil.getOptionsProto(serializer, {}, {}),
        };
    }
    _validateUserData(ignoreUndefinedProperties) {
        if (this.transformedFields) {
            (0, pipeline_util_1.validateUserDataHelper)(this.transformedFields, ignoreUndefinedProperties);
        }
    }
}
exports.UpdateStage = UpdateStage;
//# sourceMappingURL=stage.js.map