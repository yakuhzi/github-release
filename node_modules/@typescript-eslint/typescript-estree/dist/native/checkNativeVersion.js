"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const package_json_1 = require("@typescript/native/package.json");
const semver_1 = __importDefault(require("semver"));
const SUPPORTED_VERSIONS = '>=7.1.0-dev.20261009.1 || >=7.1.0-beta <7.1.0-dev';
if (!semver_1.default.satisfies(package_json_1.version, SUPPORTED_VERSIONS, { includePrerelease: true })) {
    throw new Error(`@typescript/native ${package_json_1.version} is not supported; the experimental tsgo backend needs ${SUPPORTED_VERSIONS}.`);
}
//# sourceMappingURL=checkNativeVersion.js.map