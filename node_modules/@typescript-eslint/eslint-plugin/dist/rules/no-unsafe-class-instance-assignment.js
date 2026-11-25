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
const utils_1 = require("@typescript-eslint/utils");
const tsutils = __importStar(require("ts-api-utils"));
const ts = __importStar(require("typescript"));
const util_1 = require("../util");
exports.default = (0, util_1.createRule)({
    name: 'no-unsafe-class-instance-assignment',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow assigning non-instance values to class instance typed locations',
            recommended: 'strict',
            requiresTypeChecking: true,
        },
        messages: {
            nonInstance: 'This value is used where an instance of class `{{type}}` is expected, but was not created by its constructor.',
            objectLiteral: 'This object literal is used where an instance of class `{{type}}` is expected.',
        },
        schema: [],
    },
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- For compatibility with ESLint 8, see #12842
    defaultOptions: [],
    create(context) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        function getClassTarget(type) {
            if (!tsutils.isObjectType(type)) {
                return undefined;
            }
            const target = tsutils.isTypeReference(type) ? type.target : type;
            return tsutils.isObjectFlagSet(target, ts.ObjectFlags.Class)
                ? target
                : undefined;
        }
        function getNominalClass(type) {
            let found;
            (0, util_1.matchesTypeOrBaseType)(services, candidate => {
                if (getClassTarget(candidate)) {
                    found = candidate;
                }
                return !!found;
            }, type);
            return found;
        }
        function resolveConstraint(type) {
            return tsutils.isTypeFlagSet(type, ts.TypeFlags.Instantiable)
                ? checker.getBaseConstraintOfType(type)
                : type;
        }
        function containsClass(type, seen = new Set()) {
            if (seen.has(type)) {
                return false;
            }
            seen.add(type);
            const resolved = resolveConstraint(type);
            if (!resolved) {
                return false;
            }
            if (tsutils.isUnionOrIntersectionType(resolved)) {
                return resolved.types.some(part => containsClass(part, seen));
            }
            return (!!getNominalClass(resolved) ||
                (tsutils.isTypeReference(resolved) &&
                    checker
                        .getTypeArguments(resolved)
                        .some(typeArgument => containsClass(typeArgument, seen))) ||
                checker
                    .getIndexInfosOfType(resolved)
                    .some(indexInfo => containsClass(indexInfo.type, seen)));
        }
        function isInstanceOf(source, classType) {
            const classTarget = getClassTarget(classType);
            return tsutils
                .intersectionConstituents(source)
                .some(part => (tsutils.isObjectType(part) &&
                tsutils.isObjectFlagSet(part, ts.ObjectFlags.Mapped)) ||
                (0, util_1.matchesTypeOrBaseType)(services, type => getClassTarget(type) === classTarget, part));
        }
        function findFirstViolation(items, find) {
            for (const [i, item] of items.entries()) {
                const violation = find(item, i);
                if (violation) {
                    return violation;
                }
            }
            return undefined;
        }
        function findViolation(source, target, shallow) {
            const resolvedSource = resolveConstraint(source);
            const resolvedTarget = resolveConstraint(target);
            if (!resolvedSource ||
                !resolvedTarget ||
                resolvedSource === resolvedTarget ||
                tsutils.isTypeFlagSet(resolvedSource, ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never) ||
                !containsClass(resolvedTarget)) {
                return undefined;
            }
            if (resolvedSource.isUnion()) {
                return findFirstViolation(resolvedSource.types.filter(part => checker.isTypeAssignableTo(part, resolvedTarget)), part => findViolation(part, resolvedTarget, shallow));
            }
            if (!tsutils.isObjectType(resolvedSource) &&
                !(resolvedSource.isIntersection() &&
                    !checker.isTypeAssignableTo(resolvedSource, checker.getNeverType()))) {
                return undefined;
            }
            if (resolvedTarget.isUnion()) {
                const candidates = resolvedTarget.types.filter(part => checker.isTypeAssignableTo(resolvedSource, part));
                if (candidates.length === 0 ||
                    candidates.some(candidate => !containsClass(candidate))) {
                    return undefined;
                }
                const violations = candidates.map(candidate => findViolation(resolvedSource, candidate, shallow));
                return violations.every(Boolean) ? violations[0] : undefined;
            }
            if (resolvedTarget.isIntersection()) {
                return findFirstViolation(resolvedTarget.types, part => findViolation(resolvedSource, part, shallow));
            }
            const nominalClass = getNominalClass(resolvedTarget);
            if (nominalClass && !isInstanceOf(resolvedSource, nominalClass)) {
                return nominalClass;
            }
            if (shallow) {
                return undefined;
            }
            if (tsutils.isTypeReference(resolvedSource) &&
                tsutils.isTypeReference(resolvedTarget) &&
                resolvedSource.target === resolvedTarget.target) {
                const sourceArguments = checker.getTypeArguments(resolvedSource);
                return findFirstViolation(checker
                    .getTypeArguments(resolvedTarget)
                    .slice(0, sourceArguments.length), (targetArgument, i) => findViolation(sourceArguments[i], targetArgument, false));
            }
            return findFirstViolation([ts.IndexKind.Number, ts.IndexKind.String], indexKind => {
                const sourceIndexType = checker.getIndexTypeOfType(resolvedSource, indexKind);
                const targetIndexType = checker.getIndexTypeOfType(resolvedTarget, indexKind);
                return (sourceIndexType &&
                    targetIndexType &&
                    findViolation(sourceIndexType, targetIndexType, false));
            });
        }
        function checkSite(node) {
            switch (node.type) {
                case utils_1.AST_NODE_TYPES.ArrowFunctionExpression:
                case utils_1.AST_NODE_TYPES.ConditionalExpression:
                case utils_1.AST_NODE_TYPES.FunctionExpression:
                case utils_1.AST_NODE_TYPES.LogicalExpression:
                case utils_1.AST_NODE_TYPES.SequenceExpression:
                    return;
            }
            const contextualType = checker.getContextualType(services.esTreeNodeToTSNodeMap.get(node));
            if (!contextualType) {
                return;
            }
            const isLiteral = node.type === utils_1.AST_NODE_TYPES.ObjectExpression ||
                node.type === utils_1.AST_NODE_TYPES.ArrayExpression;
            const violation = findViolation(services.getTypeAtLocation(node), contextualType, isLiteral);
            if (violation) {
                context.report({
                    node,
                    messageId: node.type === utils_1.AST_NODE_TYPES.ObjectExpression
                        ? 'objectLiteral'
                        : 'nonInstance',
                    data: { type: checker.typeToString(violation) },
                });
            }
        }
        function checkArguments(node) {
            for (const argument of node.arguments) {
                if (argument.type !== utils_1.AST_NODE_TYPES.SpreadElement) {
                    checkSite(argument);
                }
            }
        }
        return {
            ArrayExpression(node) {
                for (const element of node.elements) {
                    if (element && element.type !== utils_1.AST_NODE_TYPES.SpreadElement) {
                        checkSite(element);
                    }
                }
            },
            ArrowFunctionExpression(node) {
                if (node.body.type !== utils_1.AST_NODE_TYPES.BlockStatement) {
                    checkSite(node.body);
                }
            },
            AssignmentExpression(node) {
                if (['=', '&&=', '??=', '||='].includes(node.operator)) {
                    checkSite(node.right);
                }
            },
            AssignmentPattern(node) {
                checkSite(node.right);
            },
            CallExpression: checkArguments,
            ConditionalExpression(node) {
                checkSite(node.consequent);
                checkSite(node.alternate);
            },
            JSXExpressionContainer(node) {
                if (node.expression.type !== utils_1.AST_NODE_TYPES.JSXEmptyExpression) {
                    checkSite(node.expression);
                }
            },
            LogicalExpression(node) {
                checkSite(node.left);
                checkSite(node.right);
            },
            NewExpression: checkArguments,
            'ObjectExpression > Property'(node) {
                checkSite(node.value);
            },
            'PropertyDefinition, AccessorProperty'(node) {
                if (node.value) {
                    checkSite(node.value);
                }
            },
            ReturnStatement(node) {
                if (node.argument) {
                    checkSite(node.argument);
                }
            },
            SequenceExpression(node) {
                checkSite(node.expressions[node.expressions.length - 1]);
            },
            'TSAsExpression, TSSatisfiesExpression, TSTypeAssertion'(node) {
                checkSite(node.expression);
            },
            VariableDeclarator(node) {
                if (node.init) {
                    checkSite(node.init);
                }
            },
            YieldExpression(node) {
                if (node.argument) {
                    checkSite(node.argument);
                }
            },
        };
    },
});
//# sourceMappingURL=no-unsafe-class-instance-assignment.js.map