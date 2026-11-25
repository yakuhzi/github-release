"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./checkNativeVersion");
const nativeParserRegistry_1 = require("../nativeParserRegistry");
const createNativeProjectService_1 = require("./createNativeProjectService");
const parseAndGenerateNativeServices_1 = require("./parseAndGenerateNativeServices");
(0, nativeParserRegistry_1.registerNativeBackend)({
    clearProjectService: createNativeProjectService_1.clearNativeProjectService,
    parse: parseAndGenerateNativeServices_1.parseAndGenerateNativeServices,
});
//# sourceMappingURL=index.js.map