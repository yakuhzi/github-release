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
exports.PipelineResult = exports.PipelineSnapshot = exports.ExplainStats = exports.Pipeline = exports.PipelineSource = void 0;
exports.subcollection = subcollection;
const deepEqual = require("fast-deep-equal");
const index_1 = require("../index");
const path_1 = require("../path");
const pipeline_util_1 = require("./pipeline-util");
const document_reference_1 = require("../reference/document-reference");
const util_1 = require("../util");
const expression_1 = require("./expression");
const stage_1 = require("./stage");
const structured_pipeline_1 = require("./structured-pipeline");
const protobufjs_1 = require("protobufjs");
/**
 * Represents the source of a Firestore `Pipeline`.
 */
class PipelineSource {
    db;
    constructor(db) {
        this.db = db;
    }
    collection(collectionOrOptions) {
        const options = (0, pipeline_util_1.isString)(collectionOrOptions) ||
            (0, pipeline_util_1.isCollectionReference)(collectionOrOptions)
            ? {}
            : collectionOrOptions;
        const collection = (0, pipeline_util_1.isString)(collectionOrOptions) ||
            (0, pipeline_util_1.isCollectionReference)(collectionOrOptions)
            ? collectionOrOptions
            : collectionOrOptions.collection;
        // Validate that a user provided reference is for the same Firestore DB
        if ((0, pipeline_util_1.isCollectionReference)(collection)) {
            this._validateReference(collection);
        }
        const normalizedCollection = (0, pipeline_util_1.isString)(collection)
            ? this.db.collection(collection)
            : collection;
        const internalOptions = {
            ...options,
            collection: normalizedCollection,
        };
        return new Pipeline(this.db, [new stage_1.CollectionSource(internalOptions)]);
    }
    collectionGroup(collectionIdOrOptions) {
        const options = (0, pipeline_util_1.isString)(collectionIdOrOptions)
            ? { collectionId: collectionIdOrOptions }
            : { ...collectionIdOrOptions };
        return new Pipeline(this.db, [new stage_1.CollectionGroupSource(options)]);
    }
    database(options) {
        return new Pipeline(this.db, [new stage_1.DatabaseSource(options ?? {})]);
    }
    documents(docsOrOptions) {
        const options = Array.isArray(docsOrOptions) ? {} : docsOrOptions;
        const docs = Array.isArray(docsOrOptions)
            ? docsOrOptions
            : docsOrOptions.docs;
        // Validate that all user provided references are for the same Firestore DB
        docs
            .filter(v => v instanceof document_reference_1.DocumentReference)
            .forEach(dr => this._validateReference(dr));
        const normalizedDocs = docs.map(doc => (0, pipeline_util_1.isString)(doc) ? this.db.doc(doc) : doc);
        const internalOptions = {
            ...options,
            docs: normalizedDocs,
        };
        return new Pipeline(this.db, [new stage_1.DocumentsSource(internalOptions)]);
    }
    createFrom(query) {
        return query._pipeline();
    }
    _validateReference(reference) {
        if (!(reference instanceof index_1.CollectionReference ||
            reference instanceof document_reference_1.DocumentReference)) {
            throw new Error('Invalid reference. The value may not be a CollectionReference or DocumentReference. Or, it may be an object from a different SDK build.');
        }
        const refDbId = reference.firestore.formattedName;
        if (refDbId !== this.db.formattedName) {
            throw new Error(`Invalid ${reference instanceof index_1.CollectionReference
                ? 'CollectionReference'
                : 'DocumentReference'}. ` +
                `The database name ("${refDbId}") of this reference does not match ` +
                `the database name ("${this.db.formattedName}") of the target database of this Pipeline.`);
        }
        return true;
    }
}
exports.PipelineSource = PipelineSource;
/**
 * The Pipeline class provides a flexible and expressive framework for building complex data
 * transformation and query pipelines for Firestore.
 *
 * A pipeline takes data sources, such as Firestore collections or collection groups, and applies
 * a series of stages that are chained together. Each stage takes the output from the previous stage
 * (or the data source) and produces an output for the next stage (or as the final output of the
 * pipeline).
 *
 * Expressions can be used within each stage to filter and transform data through the stage.
 *
 * NOTE: The chained stages do not prescribe exactly how Firestore will execute the pipeline.
 * Instead, Firestore only guarantees that the result is the same as if the chained stages were
 * executed in order.
 *
 * Usage Examples:
 *
 * @example
 * ```typescript
 * const db: Firestore; // Assumes a valid firestore instance.
 *
 * // Example 1: Select specific fields and rename 'rating' to 'bookRating'
 * const results1 = await db.pipeline()
 *     .collection('books')
 *     .select('title', 'author', field('rating').as('bookRating'))
 *     .execute();
 *
 * // Example 2: Filter documents where 'genre' is 'Science Fiction' and 'published' is after 1950
 * const results2 = await db.pipeline()
 *     .collection('books')
 *     .where(and(field('genre').equal('Science Fiction'), field('published').greaterThan(1950)))
 *     .execute();
 *
 * // Example 3: Calculate the average rating of books published after 1980
 * const results3 = await db.pipeline()
 *     .collection('books')
 *     .where(field('published').greaterThan(1980))
 *     .aggregate(average(field('rating')).as('averageRating'))
 *     .execute();
 * ```
 */
class Pipeline {
    db;
    stages;
    constructor(db, stages) {
        this.db = db;
        this.stages = stages;
    }
    _addStage(stage) {
        const copy = this.stages.map(s => s);
        copy.push(stage);
        return new Pipeline(this.db, copy);
    }
    addFields(fieldOrOptions, ...additionalFields) {
        const options = (0, pipeline_util_1.isSelectable)(fieldOrOptions) ? {} : fieldOrOptions;
        const fields = (0, pipeline_util_1.isSelectable)(fieldOrOptions)
            ? [fieldOrOptions, ...additionalFields]
            : fieldOrOptions.fields;
        const normalizedFields = (0, pipeline_util_1.selectablesToMap)(fields);
        const internalOptions = {
            ...options,
            fields: normalizedFields,
        };
        return this._addStage(new stage_1.AddFields(internalOptions));
    }
    removeFields(fieldValueOrOptions, ...additionalFields) {
        const options = (0, pipeline_util_1.isField)(fieldValueOrOptions) || (0, pipeline_util_1.isString)(fieldValueOrOptions)
            ? {}
            : fieldValueOrOptions;
        const fields = (0, pipeline_util_1.isField)(fieldValueOrOptions) || (0, pipeline_util_1.isString)(fieldValueOrOptions)
            ? [fieldValueOrOptions, ...additionalFields]
            : fieldValueOrOptions.fields;
        const convertedFields = fields.map(f => (0, pipeline_util_1.isString)(f) ? (0, expression_1.field)(f) : f);
        const innerOptions = {
            ...options,
            fields: convertedFields,
        };
        return this._addStage(new stage_1.RemoveFields(innerOptions));
    }
    define(aliasedExpressionOrOptions, ...additionalExpressions) {
        const options = (0, pipeline_util_1.isAliasedExpr)(aliasedExpressionOrOptions)
            ? {}
            : aliasedExpressionOrOptions;
        const aliasedExpressions = (0, pipeline_util_1.isAliasedExpr)(aliasedExpressionOrOptions)
            ? [aliasedExpressionOrOptions, ...additionalExpressions]
            : aliasedExpressionOrOptions.variables;
        const convertedExpressions = (0, pipeline_util_1.selectablesToMap)(aliasedExpressions);
        const internalOptions = {
            ...options,
            variables: convertedExpressions,
        };
        return this._addStage(new stage_1.Define(internalOptions));
    }
    /**
     * Converts this Pipeline into an expression that evaluates to an array of map (objects), where each result document of the pipeline is represented as a map in the returned array.
     *
     * <p>Result Unwrapping:</p>
     * <ul>
     *  <li>If the items have a single field, their values are unwrapped and returned directly in the array.</li>
     *  <li>If the items have multiple fields, they are returned as objects in the array.</li>
     * </ul>
     *
     * @example
     * ```typescript
     * // Get a list of reviewers for each book
     * db.pipeline().collection("books")
     *     .define(field("id").as("current_book_id"))
     *     .addFields(
     *         db.pipeline().collection("reviews")
     *             .where(field("book_id").equal(variable("current_book_id")))
     *             .select(field("reviewer"))
     *             .toArrayExpression()
     *             .as("reviewers")
     *     );
     * ```
     *
     * Output:
     * ```json
     * [
     *   {
     *     "id": "1",
     *     "title": "1984",
     *     "reviewers": ["Alice", "Bob"]
     *   }
     * ]
     * ```
     *
     * Multiple Fields:
     * ```typescript
     * // Get a list of reviews (reviewer and rating) for each book
     * db.pipeline().collection("books")
     *     .define(field("id").as("current_book_id"))
     *     .addFields(
     *         db.pipeline().collection("reviews")
     *             .where(field("book_id").equal(variable("current_book_id")))
     *             .select(field("reviewer"), field("rating"))
     *             .toArrayExpression()
     *             .as("reviews")
     *    );
     * ```
     *
     * Output:
     * ```json
     * [
     *   {
     *     "id": "1",
     *     "title": "1984",
     *     "reviews": [
     *       { "reviewer": "Alice", "rating": 5 },
     *       { "reviewer": "Bob", "rating": 4 }
     *     ]
     *   }
     * ]
     * ```
     *
     * @returns An `Expression` representing the execution of this pipeline.
     */
    toArrayExpression() {
        return new expression_1.FunctionExpression('array', [(0, pipeline_util_1.fieldOrExpression)(this)]);
    }
    /**
     * Converts this Pipeline into an expression that evaluates to a single scalar result.
     *
     * <p><b>Runtime Validation:</b> The runtime validates that the result set contains zero or one item. If
     * zero items, it evaluates to `null`.</p>
     *
     * <p>Result Unwrapping:</p>
     * <ul>
     *  <li>If the item has a single field, its value is unwrapped and returned directly.</li>
     *  <li>If the item has multiple fields, they are returned as an object.</li>
     * </ul>
     *
     * @example
     * ```typescript
     * // Calculate average rating for a restaurant
     * db.pipeline().collection("restaurants")
     *     .define(field("id").as("current_restaurant_id"))
     *     .addFields(
     *       db.pipeline().collection("reviews")
     *         .where(field("restaurant_id").equal(variable("current_restaurant_id")))
     *         .aggregate(average("rating").as("avg"))
     *         // Unwraps the single "avg" field to a scalar double
     *         .toScalarExpression().as("average_rating")
     *    );
     * ```
     *
     * Output:
     * ```json
     * {
     *   "name": "The Burger Joint",
     *   "average_rating": 4.5
     * }
     * ```
     *
     * Multiple Fields:
     * ```typescript
     * // Calculate average rating AND count for a restaurant
     * db.pipeline().collection("restaurants")
     *     .define(field("id").as("current_restaurant_id"))
     *     .addFields(
     *       db.pipeline().collection("reviews")
     *         .where(field("restaurant_id").equal(variable("current_restaurant_id")))
     *         .aggregate(
     *           average("rating").as("avg"),
     *           count().as("count")
     *         )
     *         // Returns an object with "avg" and "count" fields
     *         .toScalarExpression().as("stats")
     *    );
     * ```
     *
     * Output:
     * ```json
     * {
     *   "name": "The Burger Joint",
     *   "stats": {
     *     "avg": 4.5,
     *     "count": 100
     *   }
     * }
     * ```
     *
     * @returns An `Expression` representing the execution of this pipeline.
     */
    toScalarExpression() {
        return new expression_1.FunctionExpression('scalar', [(0, pipeline_util_1.fieldOrExpression)(this)]);
    }
    select(selectionOrOptions, ...additionalSelections) {
        const options = (0, pipeline_util_1.isSelectable)(selectionOrOptions) || (0, pipeline_util_1.isString)(selectionOrOptions)
            ? {}
            : selectionOrOptions;
        const selections = (0, pipeline_util_1.isSelectable)(selectionOrOptions) || (0, pipeline_util_1.isString)(selectionOrOptions)
            ? [selectionOrOptions, ...additionalSelections]
            : selectionOrOptions.selections;
        const normalizedSelections = (0, pipeline_util_1.selectablesToMap)(selections);
        const internalOptions = {
            ...options,
            selections: normalizedSelections,
        };
        return this._addStage(new stage_1.Select(internalOptions));
    }
    where(conditionOrOptions) {
        const options = (0, pipeline_util_1.isBooleanExpr)(conditionOrOptions) ? {} : conditionOrOptions;
        const condition = (0, pipeline_util_1.isBooleanExpr)(conditionOrOptions)
            ? conditionOrOptions
            : conditionOrOptions.condition;
        const convertedCondition = condition;
        const internalOptions = {
            ...options,
            condition: convertedCondition,
        };
        return this._addStage(new stage_1.Where(internalOptions));
    }
    offset(offsetOrOptions) {
        const options = (0, pipeline_util_1.isNumber)(offsetOrOptions) ? {} : offsetOrOptions;
        const offset = (0, pipeline_util_1.isNumber)(offsetOrOptions)
            ? offsetOrOptions
            : offsetOrOptions.offset;
        const internalOptions = {
            ...options,
            offset,
        };
        return this._addStage(new stage_1.Offset(internalOptions));
    }
    limit(limitOrOptions) {
        const options = (0, pipeline_util_1.isNumber)(limitOrOptions) ? {} : limitOrOptions;
        const limit = (0, pipeline_util_1.isNumber)(limitOrOptions)
            ? limitOrOptions
            : limitOrOptions.limit;
        const internalOptions = {
            ...options,
            limit,
        };
        return this._addStage(new stage_1.Limit(internalOptions));
    }
    distinct(groupOrOptions, ...additionalGroups) {
        const options = (0, pipeline_util_1.isString)(groupOrOptions) || (0, pipeline_util_1.isSelectable)(groupOrOptions)
            ? {}
            : groupOrOptions;
        const groups = (0, pipeline_util_1.isString)(groupOrOptions) || (0, pipeline_util_1.isSelectable)(groupOrOptions)
            ? [groupOrOptions, ...additionalGroups]
            : groupOrOptions.groups;
        const convertedGroups = (0, pipeline_util_1.selectablesToMap)(groups);
        const internalOptions = {
            ...options,
            groups: convertedGroups,
        };
        return this._addStage(new stage_1.Distinct(internalOptions));
    }
    aggregate(targetOrOptions, ...rest) {
        const options = (0, pipeline_util_1.isAliasedAggregate)(targetOrOptions) ? {} : targetOrOptions;
        const accumulators = (0, pipeline_util_1.isAliasedAggregate)(targetOrOptions)
            ? [targetOrOptions, ...rest]
            : targetOrOptions.accumulators;
        const convertedAccumulators = (0, pipeline_util_1.aliasedAggregateToMap)(accumulators);
        const groups = (0, pipeline_util_1.isAliasedAggregate)(targetOrOptions) ? [] : (targetOrOptions.groups ?? []);
        const convertedGroups = (0, pipeline_util_1.selectablesToMap)(groups);
        const internalOptions = {
            ...options,
            accumulators: convertedAccumulators,
            groups: convertedGroups,
        };
        return this._addStage(new stage_1.Aggregate(internalOptions));
    }
    /**
     * Performs a vector proximity search on the documents from the previous stage, returning the
     * K-nearest documents based on the specified query `vectorValue` and `distanceMeasure`. The
     * returned documents will be sorted in order from nearest to furthest from the query `vectorValue`.
     *
     *
     * @example
     * ```typescript
     * // Find the 10 most similar books based on the book description.
     * const bookDescription = "Lorem ipsum...";
     * const queryVector: number[] = ...; // compute embedding of `bookDescription`
     *
     * firestore.pipeline().collection("books")
     *     .findNearest({
     *       field: 'embedding',
     *       vectorValue: queryVector,
     *       distanceMeasure: 'euclidean',
     *       limit: 10,                        // optional
     *       distanceField: 'computedDistance' // optional
     *     });
     * ```
     *
     * @param options - An object that specifies required and optional parameters for the stage.
     * @returns A new `Pipeline` object with this stage appended to the stage list.
     */
    findNearest(options) {
        const field = (0, pipeline_util_1.toField)(options.field);
        const vectorValue = (0, pipeline_util_1.vectorToExpr)(options.vectorValue);
        const distanceField = options.distanceField
            ? (0, pipeline_util_1.toField)(options.distanceField)
            : undefined;
        const internalOptions = {
            ...options,
            field,
            vectorValue,
            distanceField,
        };
        return this._addStage(new stage_1.FindNearest(internalOptions));
    }
    replaceWith(valueOrOptions) {
        const options = (0, pipeline_util_1.isString)(valueOrOptions) || (0, pipeline_util_1.isExpr)(valueOrOptions) ? {} : valueOrOptions;
        const fieldNameOrExpr = (0, pipeline_util_1.isString)(valueOrOptions) || (0, pipeline_util_1.isExpr)(valueOrOptions)
            ? valueOrOptions
            : valueOrOptions.map;
        const mapExpr = (0, pipeline_util_1.fieldOrExpression)(fieldNameOrExpr);
        const internalOptions = {
            ...options,
            map: mapExpr,
        };
        return this._addStage(new stage_1.ReplaceWith(internalOptions));
    }
    sample(documentsOrOptions) {
        const options = (0, pipeline_util_1.isNumber)(documentsOrOptions) ? {} : documentsOrOptions;
        let rate;
        let mode;
        if ((0, pipeline_util_1.isNumber)(documentsOrOptions)) {
            rate = documentsOrOptions;
            mode = 'documents';
        }
        else if ((0, pipeline_util_1.isNumber)(documentsOrOptions.documents)) {
            rate = documentsOrOptions.documents;
            mode = 'documents';
        }
        else {
            rate = documentsOrOptions.percentage;
            mode = 'percent';
        }
        const internalOptions = {
            ...options,
            rate,
            mode,
        };
        return this._addStage(new stage_1.Sample(internalOptions));
    }
    union(otherOrOptions) {
        const options = (0, pipeline_util_1.isPipeline)(otherOrOptions) ? {} : otherOrOptions;
        const otherPipeline = (0, pipeline_util_1.isPipeline)(otherOrOptions)
            ? otherOrOptions
            : otherOrOptions.other;
        const normalizedOtherPipeline = otherPipeline;
        const internalOptions = {
            ...options,
            other: normalizedOtherPipeline,
        };
        return this._addStage(new stage_1.Union(internalOptions));
    }
    unnest(selectableOrOptions, indexField) {
        const options = (0, pipeline_util_1.isSelectable)(selectableOrOptions)
            ? {}
            : selectableOrOptions;
        const selectable = (0, pipeline_util_1.isSelectable)(selectableOrOptions)
            ? selectableOrOptions
            : selectableOrOptions.selectable;
        const alias = selectable._alias;
        const expr = selectable._expr;
        const indexFieldName = (0, pipeline_util_1.isSelectable)(selectableOrOptions)
            ? indexField
            : selectableOrOptions.indexField;
        const normalizedIndexField = indexFieldName
            ? (0, expression_1.field)(indexFieldName)
            : undefined;
        const internalOptions = {
            ...options,
            alias,
            expr,
            indexField: normalizedIndexField,
        };
        return this._addStage(new stage_1.Unnest(internalOptions));
    }
    /**
     * @beta
     *
     * Add a search stage to the Pipeline.
     *
     * @remarks This must be the first stage of the pipeline.
     * @remarks A limited set of expressions are supported in the search stage.
     *
     * @example
     * ```typescript
     * db.pipeline().collection('restaurants').search({
     *   query: documentMatches('breakfast')
     * })
     * ```
     *
     * @param options - An object that specifies required and optional parameters
     *                  for the stage.
     * @return A new `Pipeline` object with this stage appended to the stage list.
     */
    search(options) {
        // Convert user land convenience types to internal types
        const normalizedQuery = (0, pipeline_util_1.isExpr)(options.query)
            ? options.query
            : (0, expression_1.documentMatches)(options.query);
        // TODO(search) - re-enable select normalization when select is supported in the API
        // const normalizedSelect: Record<string, Expression> | undefined =
        //   options.select ? selectablesToObject(options.select) : undefined;
        const normalizedAddFields = options.addFields ? (0, pipeline_util_1.selectablesToObject)(options.addFields) : undefined;
        const normalizedSort = (0, pipeline_util_1.isOrdering)(options.sort)
            ? [options.sort]
            : options.sort;
        const internalOptions = {
            ...options,
            query: normalizedQuery,
            // TODO(search) - re-enable select normalization when select is supported in the API
            // select: normalizedSelect,
            addFields: normalizedAddFields,
            sort: normalizedSort,
        };
        // Add stage to the pipeline
        return this._addStage(new stage_1.Search(internalOptions));
    }
    sort(orderingOrOptions, ...additionalOrderings) {
        const options = (0, pipeline_util_1.isOrdering)(orderingOrOptions) ? {} : orderingOrOptions;
        const orderings = (0, pipeline_util_1.isOrdering)(orderingOrOptions)
            ? [orderingOrOptions, ...additionalOrderings]
            : orderingOrOptions.orderings;
        const normalizedOrderings = orderings;
        const internalOptions = {
            ...options,
            orderings: normalizedOrderings,
        };
        return this._addStage(new stage_1.Sort(internalOptions));
    }
    /**
     * @beta
     * Performs a delete operation on documents from previous stages.
     *
     * @example
     * ```typescript
     * // Deletes all documents in the "books" collection.
     * firestore.pipeline().collection("books")
     *    .delete();
     * ```
     *
     * @return A new {@code Pipeline} object with this stage appended to the stage list.
     */
    delete() {
        return this._addStage(new stage_1.DeleteStage());
    }
    update(transformedFields) {
        return this._addStage(new stage_1.UpdateStage(transformedFields));
    }
    /**
     * Adds a raw stage to the pipeline.
     *
     * <p>This method provides a flexible way to extend the pipeline's functionality by adding custom
     * stages. Each raw stage is defined by a unique `name` and a set of `params` that control its
     * behavior.
     *
     * @example
     * Assuming there is no 'where' stage available in SDK:
     *
     * @example
     * ```typescript
     * // Assume we don't have a built-in 'where' stage
     * firestore.pipeline().collection('books')
     *     .rawStage('where', [field('published').lessThan(1900)]) // Custom 'where' stage
     *     .select('title', 'author');
     * ```
     *
     * @param name - The unique name of the raw stage to add.
     * @param params - A list of parameters to configure the raw stage's behavior.
     * @param options - An object of key value pairs that specifies optional parameters for the stage.
     * @returns A new `Pipeline` object with this stage appended to the stage list.
     */
    rawStage(name, params, options) {
        // Convert input values to Expressions.
        // We treat objects as mapValues and arrays as arrayValues,
        // this is unlike the default conversion for objects and arrays
        // passed to an expression.
        const expressionParams = params.map((value) => {
            if (value instanceof expression_1.Expression) {
                return value;
            }
            else if (value instanceof expression_1.AggregateFunction) {
                return value;
            }
            else if ((0, util_1.isPlainObject)(value)) {
                return (0, expression_1._mapValue)(value);
            }
            else {
                return (0, expression_1.constant)(value);
            }
        });
        return this._addStage(new stage_1.RawStage(name, expressionParams, options ?? {}));
    }
    /**
     * Executes this pipeline and returns a Promise to represent the asynchronous operation.
     *
     * <p>The returned Promise can be used to track the progress of the pipeline execution
     * and retrieve the results (or handle any errors) asynchronously.
     *
     * <p>The pipeline results are returned in a `PipelineSnapshot` object, which contains a list of
     * `PipelineResult` objects. Each `PipelineResult` typically represents a single key/value map that
     * has passed through all the stages of the pipeline, however this might differ depending on the stages involved
     * in the pipeline. For example:
     *
     * <ul>
     *   <li>If there are no stages or only transformation stages, each `PipelineResult`
     *       represents a single document.</li>
     *   <li>If there is an aggregation, only a single `PipelineResult` is returned,
     *       representing the aggregated results over the entire dataset .</li>
     *   <li>If there is an aggregation stage with grouping, each `PipelineResult` represents a
     *       distinct group and its associated aggregated values.</li>
     * </ul>
     *
     *
     * @example
     * ```typescript
     * const futureResults = await firestore.pipeline().collection('books')
     *     .where(greaterThan(field('rating'), 4.5))
     *     .select('title', 'author', 'rating')
     *     .execute();
     * ```
     *
     * @param pipelineExecuteOptions - Optionally specify pipeline execution behavior.
     * @returns A Promise representing the asynchronous pipeline execution.
     */
    execute(pipelineExecuteOptions) {
        return this._execute(undefined, pipelineExecuteOptions).then(response => {
            const results = response.result || [];
            const executionTime = response.executionTime;
            const stats = response.explainStats;
            return new PipelineSnapshot(this, results, executionTime, stats);
        });
    }
    _execute(transactionOrReadTime, pipelineExecuteOptions) {
        if (!this.db) {
            throw new Error('This pipeline was created without a database (e.g., as a subcollection pipeline) and cannot be executed directly. It can only be used as part of another pipeline.');
        }
        // Validates user data in the entire pipeline
        this._validateUserData(this.db._settings.ignoreUndefinedProperties ?? false);
        const util = new pipeline_util_1.ExecutionUtil(this.db, this.db._serializer);
        const structuredPipeline = this._toStructuredPipeline(pipelineExecuteOptions);
        return util
            ._getResponse(structuredPipeline, transactionOrReadTime)
            .then(result => result);
    }
    _toStructuredPipeline(pipelineExecuteOptions) {
        const structuredPipelineOptions = pipelineExecuteOptions ?? {};
        const optionsOverride = pipelineExecuteOptions?.rawOptions ?? {};
        return new structured_pipeline_1.StructuredPipeline(this, structuredPipelineOptions, optionsOverride);
    }
    /**
     * Executes this pipeline and streams the results as `PipelineResult`s.
     *
     * @returns {Stream.<PipelineResult>} A stream of
     * PipelineResult.
     *
     * @example
     * ```typescript
     * firestore.pipeline().collection('books')
     *     .where(greaterThan(field('rating'), 4.5))
     *     .select('title', 'author', 'rating')
     *     .stream()
     *     .on('data', (pipelineResult) => {})
     *     .on('end', () => {});
     * ```
     */
    stream() {
        if (!this.db) {
            throw new Error('This pipeline was created without a database (e.g., as a subcollection pipeline) and cannot be executed directly. It can only be used as part of another pipeline.');
        }
        const util = new pipeline_util_1.ExecutionUtil(this.db, this.db._serializer);
        // TODO(pipelines) support options
        const structuredPipeline = this._toStructuredPipeline();
        return util.stream(structuredPipeline, undefined);
    }
    _toProto(serializer) {
        const resolvedSerializer = serializer || this.db?._serializer;
        if (!resolvedSerializer) {
            throw new Error('This pipeline was created without a database (e.g., as a subcollection pipeline) and cannot be executed directly. It can only be used as part of another pipeline.');
        }
        const stages = this.stages.map(stage => stage._toProto(resolvedSerializer));
        return { stages };
    }
    _validateUserData(ignoreUndefinedProperties) {
        this.stages.forEach(stage => {
            stage._validateUserData(ignoreUndefinedProperties);
        });
    }
}
exports.Pipeline = Pipeline;
/**
 * A wrapper object to access explain stats if explain or analyze
 * was enabled for the Pipeline query execution.
 */
class ExplainStats {
    explainStatsData;
    static protoRoot = undefined;
    /**
     * @private
     * @internal
     */
    static async _ensureMessageTypesLoaded() {
        if (ExplainStats.protoRoot) {
            return;
        }
        this.protoRoot = await (0, protobufjs_1.load)('../protos/google/protobuf/wrappers.proto');
    }
    /**
     * @private
     * @internal
     * @hideconstructor
     * @param _value
     */
    constructor(explainStatsData) {
        this.explainStatsData = explainStatsData;
    }
    /**
     * Decode an ExplainStats proto message into a value.
     * @private
     * @internal
     * @param explainStatsMessage
     */
    _decode() {
        if (!ExplainStats.protoRoot) {
            throw new Error('Ensure message types are loaded before attempting to decode ExplainStats');
        }
        if (!this.explainStatsData.value) {
            throw new Error('Unexpected explainStatsMessage without data');
        }
        if (!this.explainStatsData.type_url) {
            throw new Error('Unexpected explainStatsMessage without type_url');
        }
        const typeUrl = this.explainStatsData.type_url;
        let reflectionObject = null;
        const NAMESPACE = 'type.googleapis.com/';
        if (!typeUrl.startsWith(NAMESPACE) ||
            !(reflectionObject = ExplainStats.protoRoot.lookup(typeUrl.slice(NAMESPACE.length))) ||
            !(reflectionObject instanceof protobufjs_1.Type)) {
            throw new Error(`Unsupported explainStatsMessage type_url "${this.explainStatsData.type_url}". Use \`.rawMessage\` to get access to the encoded explainStats message and perform the protobuf parsing in your application.`);
        }
        const messageType = reflectionObject;
        return messageType.toObject(messageType.decode(this.explainStatsData.value))
            .value;
    }
    /**
     * When explain stats were requested with `outputFormat = 'text'`, this returns
     * the explain stats string verbatium as returned from the Firestore backend.
     *
     * If explain stats were requested with `outputFormat = 'json'`, this returns
     * the explain stats as stringified JSON, which was returned from the Firestore backend.
     */
    get text() {
        const value = this._decode();
        if ((0, pipeline_util_1.isString)(value)) {
            return value;
        }
        throw new Error("Explain stats is not in a string format, ensure you requested an `explainOptions.outputFormat` that returns a string value, such as 'text'.");
    }
    /**
     * Returns the explain stats in an encoded proto format, as returned from the Firestore backend.
     * The caller is responsible for unpacking this proto message.
     */
    get rawData() {
        return this.explainStatsData;
    }
}
exports.ExplainStats = ExplainStats;
/**
 * Represents the results of a Firestore pipeline execution.
 *
 * A `PipelineSnapshot` contains zero or more `PipelineResult` objects
 * representing the documents returned by a pipeline query. It provides methods
 * to iterate over the documents and access metadata about the query results.
 *
 * @example
 * ```typescript
 * const snapshot: PipelineSnapshot = await firestore
 *   .pipeline()
 *   .collection('myCollection')
 *   .where(field('value').greaterThan(10))
 *   .execute();
 *
 * snapshot.results.forEach(doc => {
 *   console.log(doc.id, '=>', doc.data());
 * });
 * ```
 */
class PipelineSnapshot {
    _pipeline;
    _executionTime;
    _results;
    _explainStats;
    constructor(pipeline, results, executionTime, explainStats) {
        this._pipeline = pipeline;
        this._executionTime = executionTime;
        this._results = results;
        this._explainStats = explainStats;
    }
    /**
     * The Pipeline on which you called `execute()` in order to get this
     * `PipelineSnapshot`.
     */
    get pipeline() {
        return this._pipeline;
    }
    /**
     * An array of all the results in the `PipelineSnapshot`. */
    get results() {
        return this._results;
    }
    /**
     * The time at which the pipeline producing this result is executed.
     *
     * @type {Timestamp}
     * @readonly
     *
     */
    get executionTime() {
        if (this._executionTime === undefined) {
            throw new Error("'executionTime' is expected to exist, but it is undefined");
        }
        return this._executionTime;
    }
    /**
     * Return stats from query explain.
     *
     * If `explainOptions.mode` was set to `execute` or left unset, then this returns `undefined`.
     */
    get explainStats() {
        return this._explainStats;
    }
}
exports.PipelineSnapshot = PipelineSnapshot;
/**
 * A PipelineResult contains data read from a Firestore Pipeline. The data can be extracted with the
 * `data()` or `get(String)` methods.
 *
 * <p>If the PipelineResult represents a non-document result, `ref` will return a undefined
 * value.
 */
class PipelineResult {
    _fieldsProto;
    _ref;
    _serializer;
    _executionTime;
    _createTime;
    _updateTime;
    /**
     * @private
     * @internal
     *
     * @param serializer The serializer used to encode/decode protobuf.
     * @param ref The reference to the document.
     * @param _fieldsProto The fields of the Firestore `Document` Protobuf backing
     * this document (or undefined if the document does not exist).
     * @param readTime The time when this result was read  (or undefined if
     * the document exists only locally).
     * @param createTime The time when the document was created if the result is a document, undefined otherwise.
     * @param updateTime The time when the document was last updated if the result is a document, undefined otherwise.
     */
    constructor(serializer, 
    /**
     * @internal
     * @private
     **/
    _fieldsProto, ref, readTime, createTime, updateTime) {
        this._fieldsProto = _fieldsProto;
        this._ref = ref;
        this._serializer = serializer;
        this._executionTime = readTime;
        this._createTime = createTime;
        this._updateTime = updateTime;
    }
    /**
     * The reference of the document, if it is a document; otherwise `undefined`.
     */
    get ref() {
        return this._ref;
    }
    /**
     * The ID of the document for which this PipelineResult contains data, if it is a document; otherwise `undefined`.
     *
     * @type {string}
     * @readonly
     *
     */
    get id() {
        return this._ref?.id;
    }
    /**
     * The time the document was created. Undefined if this result is not a document.
     *
     * @type {Timestamp|undefined}
     * @readonly
     */
    get createTime() {
        return this._createTime;
    }
    /**
     * The time the document was last updated (at the time the snapshot was
     * generated). Undefined if this result is not a document.
     *
     * @type {Timestamp|undefined}
     * @readonly
     */
    get updateTime() {
        return this._updateTime;
    }
    /**
     * Retrieves all fields in the result as an object.
     *
     * @returns {T} An object containing all fields in the document.
     *
     * @example
     * ```typescript
     * let p = firestore.pipeline().collection('col');
     *
     * p.execute().then(results => {
     *   let data = results[0].data();
     *   console.log(`Retrieved data: ${JSON.stringify(data)}`);
     * });
     * ```
     */
    data() {
        const fields = this._fieldsProto;
        const obj = {};
        for (const prop of Object.keys(fields)) {
            obj[prop] = this._serializer.decodeValue(fields[prop]);
        }
        return obj;
    }
    /**
     * Retrieves the field specified by `field`.
     *
     * @param {string|FieldPath} fieldPath The field path
     * (e.g. 'foo' or 'foo.bar') to a specific field.
     * @returns {*} The data at the specified field location or undefined if no
     * such field exists.
     *
     * @example
     * ```typescript
     * let p = firestore.pipeline().collection('col');
     *
     * p.execute().then(results => {
     *   let field = results[0].get('a.b');
     *   console.log(`Retrieved field value: ${field}`);
     * });
     * ```
     */
    // We deliberately use `any` in the external API to not impose type-checking
    // on end users.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(fieldPath) {
        (0, path_1.validateFieldPath)('field', fieldPath);
        const protoField = this.protoField(fieldPath);
        if (protoField === undefined) {
            return undefined;
        }
        return this._serializer.decodeValue(protoField);
    }
    /**
     * Retrieves the field specified by 'fieldPath' in its Protobuf JS
     * representation.
     *
     * @private
     * @internal
     * @param field The path (e.g. 'foo' or 'foo.bar') to a specific field.
     * @returns The Protobuf-encoded data at the specified field location or
     * undefined if no such field exists.
     */
    protoField(field) {
        let fields = this._fieldsProto;
        if (fields === undefined) {
            return undefined;
        }
        const components = index_1.FieldPath.fromArgument(field).toArray();
        while (components.length > 1) {
            fields = fields[components.shift()];
            if (!fields || !fields.mapValue) {
                return undefined;
            }
            fields = fields.mapValue.fields;
        }
        return fields[components[0]];
    }
    /**
     * Returns true if the document's data and path in this `PipelineResult` is
     * equal to the provided value.
     *
     * @param {*} other The value to compare against.
     * @returns {boolean} true if this `PipelineResult` is equal to the provided
     * value.
     */
    isEqual(other) {
        return (this === other ||
            ((0, util_1.isOptionalEqual)(this.ref, other.ref) &&
                deepEqual(this._fieldsProto, other._fieldsProto)));
    }
}
exports.PipelineResult = PipelineResult;
function subcollection(pathOrOptions) {
    const options = (0, pipeline_util_1.isString)(pathOrOptions) ? {} : pathOrOptions;
    const path = (0, pipeline_util_1.isString)(pathOrOptions) ? pathOrOptions : pathOrOptions.path;
    const internalOptions = {
        ...options,
        path,
    };
    return new Pipeline(undefined, [new stage_1.SubcollectionSource(internalOptions)]);
}
//# sourceMappingURL=pipelines.js.map