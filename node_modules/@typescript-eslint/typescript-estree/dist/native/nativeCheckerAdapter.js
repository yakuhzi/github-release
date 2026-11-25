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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNativeChecker = createNativeChecker;
const ast_1 = require("@typescript/native/ast");
const sync_1 = require("@typescript/native/sync");
const debug_1 = __importDefault(require("debug"));
const tsutils = __importStar(require("ts-api-utils"));
const ts = __importStar(require("typescript"));
const nativeNodeAdapter_1 = require("./nativeNodeAdapter");
const throwOnUnsupportedMembers_1 = require("./throwOnUnsupportedMembers");
const log = (0, debug_1.default)('typescript-eslint:typescript-estree:native:nativeCheckerAdapter');
const MINIMUM_PREFETCH_MISSES = 2;
const PREFETCH_TYPES_AFTER_MISSES = 0.1;
const UNSUPPORTED_CHECKER_MEMBERS = new Set([
    'getAmbientModules',
    'getAugmentedPropertiesOfType',
    'getBigIntLiteralType',
    'getIndexInfosOfIndexSymbol',
    'getJsxIntrinsicTagNamesAt',
    'getMergedSymbol',
    'getNullableType',
    'getNumberLiteralType',
    'getPrivateIdentifierPropertyOfType',
    'getPropertySymbolOfDestructuringAssignment',
    'getRootSymbols',
    'getStringLiteralType',
    'getSymbolOfExpando',
    'getSymbolsOfParameterPropertyDeclaration',
    'getTypeArgumentsForResolvedSignature',
    'getTypeOfAssignmentPattern',
    'indexInfoToIndexSignatureDeclaration',
    'isImplementationOfOverload',
    'isOptionalParameter',
    'isValidPropertyAccess',
    'runWithCancellationToken',
    'signatureToString',
    'symbolToEntityName',
    'symbolToExpression',
    'symbolToParameterDeclaration',
    'symbolToString',
    'symbolToTypeParameterDeclarations',
    'typeParameterToDeclaration',
    'typePredicateToString',
]);
const CONSTRAINED_FLAGS = ts.TypeFlags.InstantiableNonPrimitive |
    ts.TypeFlags.UnionOrIntersection |
    ts.TypeFlags.TemplateLiteral |
    ts.TypeFlags.StringMapping |
    ts.TypeFlags.Index;
const PRIMITIVE_KINDS = [
    ts.TypeFlags.String | ts.TypeFlags.StringLiteral,
    ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral,
    ts.TypeFlags.BigInt | ts.TypeFlags.BigIntLiteral,
    ts.TypeFlags.BooleanLiteral,
    ts.TypeFlags.ESSymbol | ts.TypeFlags.UniqueESSymbol,
    ts.TypeFlags.NonPrimitive,
];
/** Where classic's answer can differ from the symbol's own type: narrowing and write types. */
function isTypeOfSymbolLocation(symbol, node) {
    const parent = node.parent;
    return (!!parent &&
        // An identifier only narrows the symbol it names.
        ((ts.isIdentifier(node) &&
            (node.text === symbol.name ||
                ts.isPropertyAccessExpression(parent) ||
                ts.isQualifiedName(parent))) ||
            node.kind === ts.SyntaxKind.PrivateIdentifier ||
            (ts.isSetAccessorDeclaration(parent) && parent.name === node) ||
            (ts.isElementAccessExpression(parent) &&
                parent.argumentExpression === node)));
}
function createNativeChecker({ api, checker, nodeAdapter, typeAdapter, }) {
    const { toSignature, toSymbol, toType, unwrapSignature, unwrapSymbol, unwrapType, wrapIndexInfo, wrapSignature, wrapSymbol, wrapType, wrapTypePredicate, } = typeAdapter;
    const { unwrapNode } = nodeAdapter;
    const apparentTypesByKind = new Map();
    const arrayTargets = new Map();
    /** Native only answers for parsed nodes, so a meta property's keyword asks after the meta property. */
    function unwrapLocation(node) {
        const native = unwrapNode(node);
        return (native.kind === ast_1.SyntaxKind.ImportKeyword ||
            native.kind === ast_1.SyntaxKind.NewKeyword) &&
            native.parent.kind === ast_1.SyntaxKind.MetaProperty
            ? native.parent
            : native;
    }
    const typeOfSymbolElsewhereRoot = new MemoEntry();
    const getTypeOfSymbolElsewhere = memoize((symbol) => wrapType(checker.getNonMissingTypeOfSymbol(symbol)), typeOfSymbolElsewhereRoot);
    // Classic's intrinsic `true` and `false` are the regular constituents of `boolean`.
    function getBooleanLiteralType(value) {
        const boolean = checker.getBooleanType();
        const type = boolean.isUnionType()
            ? boolean
                .getTypes()
                .find(constituent => constituent.isBooleanLiteralType() && constituent.value === value)
            : undefined;
        if (!type) {
            throw new Error(`The native boolean type has no ${value} constituent.`);
        }
        return wrapType(type);
    }
    const pendingTypes = new WeakMap();
    const pendingCalls = new WeakMap();
    const pendingArguments = new WeakMap();
    const pendingContextual = new WeakMap();
    function takePending(pending, node) {
        const sourceFile = unwrapNode(node).getSourceFile();
        const nodes = pending.get(sourceFile);
        pending.delete(sourceFile);
        return nodes;
    }
    // Batches also ask after nodes no rule asked about, so a failure falls back to asking alone.
    function batch(generators) {
        try {
            return api.batch(...generators);
        }
        catch (error) {
            log('Falling back from a failed batch: %O', error);
            return undefined;
        }
    }
    // Light rule sets ask after a few of a file's nodes and heavy ones after most,
    // so a file's types are batched once enough of them have been asked for alone.
    function prefetchTypes(node, sourceFile) {
        const pending = pendingTypes.get(sourceFile);
        if (!pending ||
            ++pending.misses <
                Math.max(MINIMUM_PREFETCH_MISSES, pending.nodes.length * PREFETCH_TYPES_AFTER_MISSES)) {
            return undefined;
        }
        pendingTypes.delete(sourceFile);
        const nodes = pending.nodes.filter(pendingNode => !getMemoEntry(memoRoots.getTypeAtLocation, [pendingNode], 1).resolved);
        const types = checker.getTypeAtLocation(nodes.map(unwrapNode));
        nodes.forEach((pendingNode, index) => {
            seed(memoRoots.getTypeAtLocation, [pendingNode], wrapType(types[index]));
        });
        const entry = getMemoEntry(memoRoots.getTypeAtLocation, [node], 1);
        return entry.resolved ? entry : undefined;
    }
    function prefetchParameterTypes(signatures) {
        const parameterLists = batch([...new Set(signatures)]
            .filter(signature => signature != null)
            .map(signature => signature.getParameters.gen()));
        const parameters = [...new Set(parameterLists?.flat())];
        if (!parameters.length) {
            return;
        }
        const types = batch([checker.getTypeOfSymbol.gen(parameters)])?.[0];
        if (!types) {
            return;
        }
        parameters.forEach((parameter, index) => {
            const type = wrapType(types[index]);
            seed(memoRoots.getTypeOfSymbol, [wrapSymbol(parameter)], type);
            if (!(parameter.flags & sync_1.SymbolFlags.Optional)) {
                seed(typeOfSymbolElsewhereRoot, [parameter], type);
            }
        });
    }
    const nativeChecker = {
        getAliasedSymbol: symbol => wrapSymbol(checker.getAliasedSymbol(unwrapSymbol(symbol))),
        getAnyType: () => wrapType(checker.getAnyType()),
        // Plain object types are their own apparent types, and primitives of a kind share one.
        getApparentType: type => {
            if (tsutils.isObjectType(type) &&
                !tsutils.isObjectFlagSet(type, ts.ObjectFlags.Mapped)) {
                return type;
            }
            const kind = PRIMITIVE_KINDS.find(flags => tsutils.isTypeFlagSet(type, flags));
            if (kind == null) {
                return wrapType(checker.getApparentType(unwrapType(type)));
            }
            let apparentType = apparentTypesByKind.get(kind);
            if (!apparentType) {
                apparentType = wrapType(checker.getApparentType(unwrapType(type)));
                apparentTypesByKind.set(kind, apparentType);
            }
            return apparentType;
        },
        getAwaitedType: type => wrapType(checker.getAwaitedType(unwrapType(type))),
        // Only these types and tuples, which may be variadic, have base constraints.
        getBaseConstraintOfType: type => tsutils.isTypeFlagSet(type, CONSTRAINED_FLAGS) ||
            unwrapType(type).isTupleType()
            ? wrapType(checker.getBaseConstraintOfType(unwrapType(type)))
            : undefined,
        getBaseTypeOfLiteralType: type => wrapType(checker.getBaseTypeOfLiteralType(unwrapType(type))),
        getBaseTypes: type => checker
            .getBaseTypes(unwrapType(type))
            .map(toType),
        getBigIntType: () => wrapType(checker.getBigIntType()),
        getBooleanType: () => wrapType(checker.getBooleanType()),
        getConstantValue: node => checker.getConstantValue(unwrapNode(node)),
        getContextualType: node => {
            const candidates = takePending(pendingContextual, node);
            if (candidates) {
                const types = batch(candidates.map(candidate => checker.getContextualType.gen(unwrapNode(candidate))))?.map(type => wrapType(type));
                if (types) {
                    candidates.forEach((candidate, index) => {
                        seed(memoRoots.getContextualType, [candidate], types[index]);
                    });
                    const index = candidates.indexOf(node);
                    if (index !== -1) {
                        return types[index];
                    }
                }
            }
            return wrapType(checker.getContextualType(unwrapNode(node)));
        },
        getContextualTypeForArgumentAtIndex: (call, index) => {
            const calls = takePending(pendingArguments, call);
            if (calls) {
                const keys = calls.flatMap(pendingCall => ts.isCallExpression(pendingCall) || ts.isNewExpression(pendingCall)
                    ? (pendingCall.arguments ?? []).map((_, argumentIndex) => [pendingCall, argumentIndex])
                    : []);
                const types = batch(keys.map(([pendingCall, argumentIndex]) => checker.getContextualTypeForArgumentAtIndex.gen(unwrapNode(pendingCall), argumentIndex)))?.map(type => wrapType(type));
                if (types) {
                    keys.forEach((key, keyIndex) => {
                        seed(memoRoots.getContextualTypeForArgumentAtIndex, key, types[keyIndex]);
                    });
                    const keyIndex = keys.findIndex(([pendingCall, argumentIndex]) => pendingCall === call && argumentIndex === index);
                    if (keyIndex !== -1) {
                        return types[keyIndex];
                    }
                }
            }
            return wrapType(checker.getContextualTypeForArgumentAtIndex(unwrapNode(call), index));
        },
        getDeclaredTypeOfSymbol: symbol => wrapType(checker.getDeclaredTypeOfSymbol(unwrapSymbol(symbol))),
        getDefaultFromTypeParameter: type => wrapType(checker.getDefaultFromTypeParameter(unwrapType(type))),
        getESSymbolType: () => wrapType(checker.getESSymbolType()),
        getExportsOfModule: symbol => checker.getExportsOfModule(unwrapSymbol(symbol)).map(toSymbol),
        getExportSpecifierLocalTargetSymbol: node => wrapSymbol(checker.getExportSpecifierLocalTargetSymbol(unwrapNode(node))),
        getExportSymbolOfSymbol: symbol => wrapSymbol(checker.getExportSymbolOfSymbol(unwrapSymbol(symbol))),
        getFalseType: () => getBooleanLiteralType(false),
        getFullyQualifiedName: symbol => checker.getFullyQualifiedName(unwrapSymbol(symbol)),
        getImmediateAliasedSymbol: symbol => wrapSymbol(checker.getImmediateAliasedSymbol(unwrapSymbol(symbol))),
        getIndexInfoOfType: (type, kind) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- values match classic; see native-enum-parity.test.ts
            const info = checker.getIndexInfoOfType(unwrapType(type), kind);
            return info && wrapIndexInfo(info);
        },
        getIndexInfosOfType: type => checker.getIndexInfosOfType(unwrapType(type)).map(wrapIndexInfo),
        getIndexTypeOfType: (type, kind) => 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- values match classic; see native-enum-parity.test.ts
        wrapType(checker.getIndexTypeOfType(unwrapType(type), kind)),
        getNeverType: () => wrapType(checker.getNeverType()),
        getNonNullableType: type => wrapType(checker.getNonNullableType(unwrapType(type))),
        getNonPrimitiveType: () => wrapType(checker.getNonPrimitiveType()),
        getNullType: () => wrapType(checker.getNullType()),
        getNumberType: () => wrapType(checker.getNumberType()),
        getPropertiesOfType: type => checker.getPropertiesOfType(unwrapType(type)).map(toSymbol),
        getPropertyOfType: (type, name) => wrapSymbol(checker.getPropertyOfType(unwrapType(type), name)),
        getResolvedSignature: node => {
            const calls = takePending(pendingCalls, node);
            if (calls) {
                const nativeSignatures = batch(calls.map(call => checker.getResolvedSignature.gen(unwrapNode(call))));
                if (nativeSignatures) {
                    const signatures = nativeSignatures.map(signature => wrapSignature(signature));
                    calls.forEach((call, index) => {
                        seed(memoRoots.getResolvedSignature, [call], signatures[index]);
                    });
                    prefetchParameterTypes(nativeSignatures);
                    const index = calls.indexOf(node);
                    if (index !== -1) {
                        return signatures[index];
                    }
                }
            }
            return wrapSignature(checker.getResolvedSignature(unwrapNode(node)));
        },
        getReturnTypeOfSignature: signature => wrapType(checker.getReturnTypeOfSignature(unwrapSignature(signature))),
        getShorthandAssignmentValueSymbol: node => wrapSymbol(node && checker.getShorthandAssignmentValueSymbol(unwrapNode(node))),
        getSignatureFromDeclaration: declaration => wrapSignature(checker.getSignatureFromDeclaration(unwrapNode(declaration))),
        getSignaturesOfType: (type, kind) => 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- values match classic; see native-enum-parity.test.ts
        checker.getSignaturesOfType(unwrapType(type), kind).map(toSignature),
        getStringType: () => wrapType(checker.getStringType()),
        getSymbolAtLocation: node => wrapSymbol(checker.getSymbolAtLocation(unwrapLocation(node))),
        getSymbolsInScope: (location, meaning) => checker
            .getSymbolsInScope(unwrapNode(location), meaning)
            .map(toSymbol),
        getTrueType: () => getBooleanLiteralType(true),
        getTypeArguments: type => checker
            .getTypeArguments(unwrapType(type))
            .map(toType),
        // Classic answers its error type for a missing node. The native API has no
        // error type to return, so `any` stands in.
        getTypeAtLocation: (node) => {
            if (node == null) {
                return wrapType(checker.getAnyType());
            }
            const location = unwrapLocation(node);
            const prefetched = prefetchTypes(node, location.getSourceFile());
            return prefetched
                ? prefetched.result
                : wrapType(checker.getTypeAtLocation(location));
        },
        getTypeFromTypeNode: node => wrapType(checker.getTypeFromTypeNode(unwrapNode(node))),
        getTypeOfPropertyOfType: (type, name) => wrapType(checker.getTypeOfPropertyOfType(unwrapType(type), name)),
        getTypeOfSymbol: symbol => wrapType(checker.getTypeOfSymbol(unwrapSymbol(symbol))),
        // Elsewhere the answer is the symbol's own, so one serves them all.
        getTypeOfSymbolAtLocation: (symbol, node) => {
            const nativeSymbol = unwrapSymbol(symbol);
            return tsutils.isSymbolFlagSet(symbol, ts.SymbolFlags.ExportValue) ||
                isTypeOfSymbolLocation(symbol, node)
                ? wrapType(checker.getTypeOfSymbolAtLocation(nativeSymbol, unwrapNode(node)))
                : getTypeOfSymbolElsewhere(nativeSymbol);
        },
        getTypePredicateOfSignature: signature => wrapTypePredicate(checker.getTypePredicateOfSignature(unwrapSignature(signature))),
        getUndefinedType: () => wrapType(checker.getUndefinedType()),
        getUnknownType: () => wrapType(checker.getUnknownType()),
        getVoidType: () => wrapType(checker.getVoidType()),
        getWidenedType: type => wrapType(checker.getWidenedType(unwrapType(type))),
        isArgumentsSymbol: symbol => checker.isArgumentsSymbol(unwrapSymbol(symbol)),
        isArrayLikeType: type => checker.isArrayLikeType(unwrapType(type)),
        // Whether a reference is to an array depends only on its target.
        isArrayType: type => {
            const native = unwrapType(type);
            const { target } = native;
            if (!native.isTypeReference()) {
                return false;
            }
            if (target == null) {
                return checker.isArrayType(native);
            }
            let isArray = arrayTargets.get(target);
            if (isArray == null) {
                isArray = checker.isArrayType(native);
                arrayTargets.set(target, isArray);
            }
            return isArray;
        },
        isTupleType: type => unwrapType(type).isTupleType(),
        isTypeAssignableTo: (source, target) => checker.isTypeAssignableTo(unwrapType(source), unwrapType(target)),
        isUndefinedSymbol: symbol => checker.isUndefinedSymbol(unwrapSymbol(symbol)),
        isUnknownSymbol: symbol => checker.isUnknownSymbol(unwrapSymbol(symbol)),
        resolveName: (name, location, meaning, excludeGlobals) => wrapSymbol(checker.resolveName(name, meaning, location && unwrapNode(location), excludeGlobals)),
        signatureToSignatureDeclaration: (signature, kind, enclosingDeclaration, flags) => {
            const declaration = checker.signatureToSignatureDeclaration(unwrapSignature(signature), (0, nativeNodeAdapter_1.toNativeKind)(kind), enclosingDeclaration && unwrapNode(enclosingDeclaration), 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- values match classic; see native-enum-parity.test.ts
            flags);
            return (declaration &&
                nodeAdapter.wrapNode(declaration));
        },
        tryGetMemberInModuleExports: (memberName, moduleSymbol) => wrapSymbol(checker.getMemberInModuleExports(unwrapSymbol(moduleSymbol), memberName)),
        typeToString: (type, enclosingDeclaration, flags) => checker.typeToString(unwrapType(type), enclosingDeclaration && unwrapNode(enclosingDeclaration), flags),
        typeToTypeNode: (type, enclosingDeclaration, flags) => {
            const typeNode = checker.typeToTypeNode(unwrapType(type), enclosingDeclaration && unwrapNode(enclosingDeclaration), flags);
            return typeNode && nodeAdapter.wrapNode(typeNode);
        },
    };
    const memoized = {};
    const memoRoots = {};
    for (const [name, method] of Object.entries(nativeChecker)) {
        const root = new MemoEntry();
        memoRoots[name] = root;
        memoized[name] = memoize(method, root);
    }
    return {
        checker: (0, throwOnUnsupportedMembers_1.throwOnUnsupportedMembers)('TypeChecker', UNSUPPORTED_CHECKER_MEMBERS, memoized),
        prefetch({ calls, contextual, typed }) {
            if (typed.length) {
                pendingTypes.set(unwrapNode(typed[0]).getSourceFile(), {
                    misses: 0,
                    nodes: typed,
                });
            }
            for (const [pending, nodes] of [
                [pendingCalls, calls],
                [pendingArguments, calls],
                [pendingContextual, contextual],
            ]) {
                if (nodes.length) {
                    pending.set(unwrapNode(nodes[0]).getSourceFile(), nodes);
                }
            }
        },
    };
}
class MemoEntry {
    objects = undefined;
    primitives = undefined;
    resolved = false;
    result = undefined;
}
function getMemoEntry(root, args, arity) {
    let length = Math.min(args.length, arity);
    while (length > 0 && args[length - 1] == null) {
        length--;
    }
    let entry = root;
    for (let index = 0; index < length; index++) {
        const arg = args[index];
        let next;
        if (typeof arg === 'object' && arg != null) {
            entry.objects ??= new WeakMap();
            next = entry.objects.get(arg);
            if (!next) {
                next = new MemoEntry();
                entry.objects.set(arg, next);
            }
        }
        else {
            entry.primitives ??= new Map();
            next = entry.primitives.get(arg);
            if (!next) {
                next = new MemoEntry();
                entry.primitives.set(arg, next);
            }
        }
        entry = next;
    }
    return entry;
}
function memoize(method, root = new MemoEntry()) {
    return (...args) => {
        const entry = getMemoEntry(root, args, method.length);
        if (!entry.resolved) {
            entry.result = method(...args);
            entry.resolved = true;
        }
        return entry.result;
    };
}
function seed(root, args, result) {
    const entry = getMemoEntry(root, args, args.length);
    entry.result = result;
    entry.resolved = true;
}
//# sourceMappingURL=nativeCheckerAdapter.js.map