"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const tsutils = __importStar(require("ts-api-utils"));
const util_1 = require("../util");
exports.default = (0, util_1.createRule)({
    name: 'require-array-sort-compare',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require `Array#sort` and `Array#toSorted` calls to always provide a `compareFunction`',
            requiresTypeChecking: true,
        },
        messages: {
            requireCompare: "Require 'compare' argument.",
        },
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    ignoreStringArrays: {
                        type: 'boolean',
                        description: 'Whether to ignore arrays in which all elements are strings.',
                    },
                },
            },
        ],
    },
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- For compatibility with ESLint 8, see #12842
    defaultOptions: [
        {
            ignoreStringArrays: true,
        },
    ],
    create(context, [options]) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        /**
         * Check if a given node is an array which all elements are string.
         */
        function isStringArrayNode(node) {
            const type = (0, util_1.getConstrainedTypeAtLocation)(services, node);
            if (checker.isArrayType(type) || checker.isTupleType(type)) {
                // Before TS 5.1, a constrained type parameter's array type has an extra `this` type argument
                const typeArgs = checker
                    .getTypeArguments(type)
                    .slice(0, type.target.typeParameters?.length);
                return typeArgs.every(arg => {
                    const typeName = (0, util_1.getTypeName)(checker, checker.getBaseConstraintOfType(arg) ?? arg);
                    return typeName === 'string';
                });
            }
            return false;
        }
        function checkSortArgument(callee) {
            if (!(0, util_1.isStaticMemberAccessOfValue)(callee, context, 'sort', 'toSorted')) {
                return;
            }
            const calleeObjType = (0, util_1.getConstrainedTypeAtLocation)(services, callee.object);
            if (options.ignoreStringArrays && isStringArrayNode(callee.object)) {
                return;
            }
            if (isAlwaysArray(calleeObjType, checker)) {
                context.report({ node: callee.parent, messageId: 'requireCompare' });
            }
        }
        return {
            'CallExpression[arguments.length=0] > MemberExpression': checkSortArgument,
        };
    },
});
function isAlwaysArray(type, checker) {
    return tsutils
        .unionConstituents(type)
        .every(t => checker.isArrayType(t) || checker.isTupleType(t));
}
//# sourceMappingURL=require-array-sort-compare.js.map