/**
 * Copyright 2022 Google LLC
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
/**
 * Known paths unique to Google Compute Engine Linux instances
 */
export declare const GCE_LINUX_BIOS_PATHS: {
    BIOS_DATE: string;
    BIOS_VENDOR: string;
};
/**
 * Determines if the process is running on a Google Cloud Serverless environment
 * (Cloud Run Services/Jobs/Worker Pools or Cloud Functions).
 *
 * Environment variables checked:
 * - `CLOUD_RUN_JOB` is used for Cloud Run Jobs:
 *   {@link https://cloud.google.com/run/docs/container-contract#env-vars Cloud Run environment variables}.
 * - `FUNCTION_NAME` is used in older Cloud Functions environments:
 *   {@link https://cloud.google.com/functions/docs/env-var Python 3.7 and Go 1.11}.
 * - `K_SERVICE` is used in Cloud Run and newer Cloud Functions environments:
 *   {@link https://cloud.google.com/run/docs/container-contract#env-vars Cloud Run environment variables},
 *   {@link https://cloud.google.com/functions/docs/env-var Cloud Functions newer runtimes}.
 * - `CLOUD_RUN_WORKER_POOL` is used in Cloud Run Worker Pools:
 *   {@link https://cloud.google.com/run/docs/container-contract#env-vars Cloud Run environment variables},
 *   {@link https://cloud.google.com/run/docs/deploy-worker-pools Deploy Worker Pools to Cloud Run}.
 *
 * @returns {boolean} `true` if the process is running on GCP serverless, `false` otherwise.
 */
export declare function isGoogleCloudServerless(): boolean;
/**
 * Determines if the process is running on a Linux Google Compute Engine instance.
 *
 * @returns {boolean} `true` if the process is running on Linux GCE, `false` otherwise.
 */
export declare function isGoogleComputeEngineLinux(): boolean;
/**
 * Determines if the process is running on a Google Compute Engine instance with a known
 * MAC address.
 *
 * @returns {boolean} `true` if the process is running on GCE (as determined by MAC address), `false` otherwise.
 */
export declare function isGoogleComputeEngineMACAddress(): boolean;
/**
 * Determines if the process is running on a Google Compute Engine instance.
 *
 * @returns {boolean} `true` if the process is running on GCE, `false` otherwise.
 */
export declare function isGoogleComputeEngine(): boolean;
/**
 * Determines if the process is running on Google Cloud Platform.
 *
 * @returns {boolean} `true` if the process is running on GCP, `false` otherwise.
 */
export declare function detectGCPResidency(): boolean;
