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
exports.EnabledTraceUtil = void 0;
const api_1 = require("@opentelemetry/api");
const span_1 = require("./span");
const trace_util_1 = require("./trace-util");
const firestore_client_config_json_1 = require("../v1/firestore_client_config.json");
const v1_1 = require("../v1");
const path_1 = require("../path");
const index_1 = require("../index");
const serviceConfig = firestore_client_config_json_1.interfaces['google.firestore.v1.Firestore'];
/**
 * @private
 * @internal
 */
class EnabledTraceUtil {
    tracer;
    settingsAttributes;
    // Visible for testing
    tracerProvider;
    constructor(settings) {
        let provider = settings.openTelemetry?.tracerProvider;
        // If a TracerProvider has not been given to us, we try to use the global one.
        if (!provider) {
            const { trace } = require('@opentelemetry/api');
            provider = trace.getTracerProvider();
        }
        // At this point provider is guaranteed to be defined because
        // `trace.getTracerProvider()` does not return null or undefined.
        this.tracerProvider = provider;
        const libVersion = require('../../../package.json').version;
        const libName = require('../../../package.json').name;
        try {
            this.tracer = this.tracerProvider.getTracer(libName, libVersion);
        }
        catch (e) {
            throw new Error("The object provided for 'tracerProvider' does not conform to the TracerProvider interface.");
        }
        const databaseId = settings.databaseId || path_1.DEFAULT_DATABASE_ID;
        this.settingsAttributes = {};
        this.settingsAttributes['otel.scope.name'] = libName;
        this.settingsAttributes['otel.scope.version'] = libVersion;
        if (settings.projectId) {
            this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.project_id`] =
                settings.projectId;
            this.settingsAttributes[trace_util_1.ATTRIBUTE_GCP_RESOURCE_NAME] =
                `//firestore.googleapis.com/projects/${settings.projectId}/databases/${databaseId}`;
        }
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.database_id`] =
            databaseId;
        const host = settings.servicePath ?? settings.host ?? 'firestore.googleapis.com';
        const port = settings.port ?? v1_1.FirestoreClient.port;
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.host`] =
            `${host}:${port}`;
        if (settings.preferRest !== undefined) {
            this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.prefer_REST`] =
                settings.preferRest;
        }
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.max_idle_channels`] =
            settings.maxIdleChannels ?? index_1.DEFAULT_MAX_IDLE_CHANNELS;
        const defaultRetrySettings = serviceConfig.retry_params.default;
        const customRetrySettings = settings.clientConfig?.interfaces?.['google.firestore.v1.Firestore']?.['retry_params']?.['default'];
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.initial_retry_delay`] = this.millisToSecondString(customRetrySettings?.initial_retry_delay_millis ??
            defaultRetrySettings.initial_retry_delay_millis);
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.initial_rpc_timeout`] = this.millisToSecondString(customRetrySettings?.initial_rpc_timeout_millis ??
            defaultRetrySettings.initial_rpc_timeout_millis);
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.total_timeout`] =
            this.millisToSecondString(customRetrySettings?.total_timeout_millis ??
                defaultRetrySettings.total_timeout_millis);
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.max_retry_delay`] =
            this.millisToSecondString(customRetrySettings?.max_retry_delay_millis ??
                defaultRetrySettings.max_retry_delay_millis);
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.max_rpc_timeout`] =
            this.millisToSecondString(customRetrySettings?.max_rpc_timeout_millis ??
                defaultRetrySettings.max_rpc_timeout_millis);
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.retry_delay_multiplier`] =
            customRetrySettings?.retry_delay_multiplier.toString() ??
                defaultRetrySettings.retry_delay_multiplier.toString();
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.rpc_timeout_multiplier`] =
            customRetrySettings?.rpc_timeout_multiplier.toString() ??
                defaultRetrySettings.rpc_timeout_multiplier.toString();
    }
    recordProjectIdAndResourceName(projectId, databaseId) {
        this.settingsAttributes[`${trace_util_1.ATTRIBUTE_SETTINGS_PREFIX}.project_id`] =
            projectId;
        this.settingsAttributes[trace_util_1.ATTRIBUTE_GCP_RESOURCE_NAME] =
            `//firestore.googleapis.com/projects/${projectId}/databases/${databaseId}`;
        this.currentSpan().setAttributes(this.settingsAttributes);
    }
    millisToSecondString(millis) {
        return `${millis / 1000}s`;
    }
    endSpan(otelSpan, error) {
        otelSpan.setStatus({
            code: api_1.SpanStatusCode.ERROR,
            message: error.message,
        });
        otelSpan.recordException(error);
        otelSpan.end();
    }
    startActiveSpan(name, fn, attributes) {
        return this.tracer.startActiveSpan(name, {
            attributes: attributes,
        }, (otelSpan) => {
            this.addCommonAttributes(otelSpan);
            // Note that if `fn` returns a `Promise`, we want the otelSpan to end
            // after the `Promise` has resolved, NOT after the `fn` has returned.
            // Therefore, we should not use a `finally` clause to end the otelSpan.
            try {
                let result = fn(new span_1.Span(otelSpan));
                if (result instanceof Promise) {
                    result = result
                        .then(value => {
                        otelSpan.end();
                        return value;
                    })
                        .catch(error => {
                        this.endSpan(otelSpan, error);
                        // Returns a Promise.reject the same as the underlying function.
                        return Promise.reject(error);
                    });
                }
                else {
                    otelSpan.end();
                }
                return result;
            }
            catch (error) {
                this.endSpan(otelSpan, error);
                // Re-throw the exception to maintain normal error handling.
                throw error;
            }
        });
    }
    startSpan(name) {
        const otelSpan = this.tracer.startSpan(name, undefined, api_1.context.active());
        this.addCommonAttributes(otelSpan);
        return new span_1.Span(otelSpan);
    }
    currentSpan() {
        return new span_1.Span(api_1.trace.getActiveSpan());
    }
    addCommonAttributes(otelSpan) {
        otelSpan.setAttributes(this.settingsAttributes);
    }
}
exports.EnabledTraceUtil = EnabledTraceUtil;
//# sourceMappingURL=enabled-trace-util.js.map