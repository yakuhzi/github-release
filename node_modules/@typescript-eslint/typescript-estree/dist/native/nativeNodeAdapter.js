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
exports.toClassicDiagnostic = toClassicDiagnostic;
exports.toNativeKind = toNativeKind;
exports.hasClassicKind = hasClassicKind;
exports.createNativeNodeAdapter = createNativeNodeAdapter;
const ast_1 = require("@typescript/native/ast");
const ts = __importStar(require("typescript"));
const translateFlags_1 = require("./translateFlags");
function toClassicDiagnostic(diagnostic, getFile) {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- values match classic; see native-enum-parity.test.ts
        category: diagnostic.category,
        code: diagnostic.code,
        file: getFile(diagnostic.fileName),
        length: diagnostic.end - diagnostic.pos,
        messageText: diagnostic.messageChain?.length
            ? toMessageChain(diagnostic)
            : diagnostic.text,
        relatedInformation: diagnostic.relatedInformation?.map(related => toClassicDiagnostic(related, getFile)),
        reportsDeprecated: diagnostic.reportsDeprecated,
        reportsUnnecessary: diagnostic.reportsUnnecessary,
        source: diagnostic.source,
        start: diagnostic.pos,
    };
}
function toMessageChain(diagnostic) {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- values match classic; see native-enum-parity.test.ts
        category: diagnostic.category,
        code: diagnostic.code,
        messageText: diagnostic.text,
        next: diagnostic.messageChain?.map(toMessageChain),
    };
}
const classicToNativeKind = new Map();
const nativeToClassicKind = new Map();
for (const [name, value] of Object.entries(ast_1.SyntaxKind)) {
    if (typeof value === 'number') {
        const classic = ts.SyntaxKind[name];
        if (typeof classic === 'number') {
            classicToNativeKind.set(classic, value);
            nativeToClassicKind.set(value, classic);
        }
    }
}
nativeToClassicKind.set(ast_1.SyntaxKind.EndOfFile, ts.SyntaxKind.EndOfFileToken);
function toNativeKind(kind) {
    const translated = classicToNativeKind.get(kind);
    if (translated != null) {
        return translated;
    }
    throw new Error(`Unsupported classic SyntaxKind: ${ts.SyntaxKind[kind]} (${kind})`);
}
function hasClassicKind({ kind }) {
    return nativeToClassicKind.has(kind);
}
function translateKind(kind) {
    const translated = nativeToClassicKind.get(kind);
    if (translated != null) {
        return translated;
    }
    throw new Error(`Unsupported native SyntaxKind: ${ast_1.SyntaxKind[kind]} (${kind})`);
}
const NODE_FLAG_TRANSLATIONS = (0, translateFlags_1.createFlagTranslations)(ast_1.NodeFlags, ts.NodeFlags);
/** TypeScript 7 has no such `NodeFlags`; it models both structurally. */
function getModuleDeclarationFlags(node) {
    const declaration = node;
    if (declaration.keyword === ast_1.SyntaxKind.NamespaceKeyword) {
        return ts.NodeFlags.Namespace;
    }
    return declaration.name?.kind === ast_1.SyntaxKind.Identifier &&
        declaration.name.text === 'global' &&
        !node
            .getChildren()
            .some(child => child.kind === ast_1.SyntaxKind.ModuleKeyword)
        ? ts.NodeFlags.GlobalAugmentation
        : ts.NodeFlags.None;
}
const translatedNodeFlags = new Map();
function translateNodeFlags(node) {
    let flags = translatedNodeFlags.get(node.flags);
    if (flags == null) {
        flags = (0, translateFlags_1.translateFlags)(NODE_FLAG_TRANSLATIONS, node.flags);
        translatedNodeFlags.set(node.flags, flags);
    }
    return node.kind === ast_1.SyntaxKind.ModuleDeclaration
        ? flags | getModuleDeclarationFlags(node)
        : flags;
}
const KIND_PROPERTIES = new Set([
    'keywordToken',
    'operator',
    'phaseModifier',
    'token',
]);
const NATIVE_NODE = Symbol('nativeNode');
const VALUES = Symbol('values');
const EAGER_KEYS = new Set(['end', 'flags', 'kind', 'pos']);
const CLASSIC_ONLY_KEYS = [
    'default',
    'escapedText',
    'modifierFlagsCache',
    'parent',
    'parseDiagnostics',
];
const FORWARDED_METHODS = [
    'getEnd',
    'getFullStart',
    'getFullWidth',
    'getLineAndCharacterOfPosition',
    'getLineStarts',
    'getPositionOfLineAndCharacter',
];
function getGetterNames(prototype) {
    const getters = new Set();
    for (let current = prototype; current && current !== Object.prototype; current = Object.getPrototypeOf(current)) {
        for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(current))) {
            if (descriptor.get && !NATIVE_ONLY_KEYS.has(name)) {
                getters.add(name);
            }
        }
    }
    return getters;
}
/** Native hoists JSDoc types into JS ASTs; classic leaves them in comments. */
function isReparsed(node) {
    return (node.flags & ast_1.NodeFlags.Reparsed) !== 0;
}
/** Native wraps JSDoc `@type` and `@satisfies` casts around their expressions; classic leaves them in comments. */
function isReparsedCast(node) {
    return (((0, ast_1.isAsExpression)(node) || (0, ast_1.isSatisfiesExpression)(node)) &&
        isReparsed(node.type));
}
function skipReparsedCasts(node) {
    while (((0, ast_1.isAsExpression)(node) || (0, ast_1.isSatisfiesExpression)(node)) &&
        isReparsed(node.type)) {
        node = node.expression;
    }
    return node;
}
function skipReparsedCastParents(node) {
    while (isReparsedCast(node)) {
        node = node.parent;
    }
    return node;
}
const NATIVE_ONLY_KEYS = new Set([
    'childMask',
    'data',
    'dataType',
    'defaultType',
    'id',
    'keyword',
    'modifierFlags',
    'next',
    'parentIndex',
    'postfixToken',
    'sourceFile',
]);
function isHeritageTypeReference(node) {
    return (node.kind === ast_1.SyntaxKind.TypeReference &&
        node.parent.kind === ast_1.SyntaxKind.HeritageClause);
}
/** Classic spells a heritage element's qualified name as property accesses. */
function isHeritageQualifiedName(node) {
    if (node.kind !== ast_1.SyntaxKind.QualifiedName) {
        return false;
    }
    let typeName = node;
    while (typeName.parent.kind === ast_1.SyntaxKind.QualifiedName) {
        typeName = typeName.parent;
    }
    return isHeritageTypeReference(typeName.parent);
}
function translateNodeKind(node) {
    if (isHeritageTypeReference(node)) {
        return ts.SyntaxKind.ExpressionWithTypeArguments;
    }
    return isHeritageQualifiedName(node)
        ? ts.SyntaxKind.PropertyAccessExpression
        : translateKind(node.kind);
}
function isNativeNode(value) {
    return (typeof value === 'object' &&
        value != null &&
        typeof value.kind === 'number' &&
        typeof value.forEachChild === 'function');
}
function isNativeNodeArray(value) {
    return (typeof value === 'object' &&
        value != null &&
        Symbol.iterator in value &&
        typeof value.pos === 'number' &&
        typeof value.end === 'number');
}
function createNativeNodeAdapter({ getSyntacticDiagnostics, }) {
    const VIEW = Symbol('view');
    const nativeArrayToAdapter = new WeakMap();
    const childrenBySourceFile = new WeakMap();
    // Children are only needed while a file is converted, but the native client
    // otherwise caches them per source file for the snapshot's lifetime.
    function releaseChildren(sourceFile) {
        childrenBySourceFile.delete(sourceFile);
        sourceFile.childrenCache = undefined;
    }
    function adaptArray(nodes) {
        const cached = nativeArrayToAdapter.get(nodes);
        if (cached) {
            return cached;
        }
        const adapted = [];
        const adaptedNodeArray = adapted;
        nativeArrayToAdapter.set(nodes, adaptedNodeArray);
        Object.assign(adaptedNodeArray, {
            end: nodes.end,
            hasTrailingComma: nodes.hasTrailingComma,
            pos: nodes.pos,
            transformFlags: nodes.transformFlags,
        });
        for (const node of nodes) {
            if (!isReparsed(node)) {
                adapted.push(wrapNode(skipReparsedCasts(node)));
            }
        }
        return adaptedNodeArray;
    }
    function createToken(native, kind, pos, end, parent) {
        const token = ts.factory.createIdentifier('');
        Object.defineProperties(token, {
            end: { value: end },
            kind: { value: kind },
            parent: { value: parent },
            pos: { value: pos },
        });
        token[NATIVE_NODE] = native;
        return token;
    }
    /** Classic splits a JSX closing tag's `</` into `<` and `/`; native keeps it whole. */
    function getChildren(node) {
        const sourceFile = node.getSourceFile();
        let cache = childrenBySourceFile.get(sourceFile);
        if (!cache) {
            cache = new Map();
            childrenBySourceFile.set(sourceFile, cache);
        }
        const cached = cache.get(node);
        if (cached) {
            return cached;
        }
        const parent = wrapNode(node);
        const children = node.getChildren().flatMap(child => {
            if (isReparsed(child)) {
                return [];
            }
            if (child.kind !== ast_1.SyntaxKind.LessThanSlashToken) {
                return [wrapNode(skipReparsedCasts(child))];
            }
            return [
                createToken(child, ts.SyntaxKind.LessThanToken, child.pos, child.end - 1, parent),
                createToken(child, ts.SyntaxKind.SlashToken, child.end - 1, child.end, parent),
            ];
        });
        cache.set(node, children);
        return children;
    }
    /** A `</` is only ever a first token, where classic answers its `<`. */
    function wrapToken(token) {
        if (token?.kind !== ast_1.SyntaxKind.LessThanSlashToken) {
            return token && wrapNode(token);
        }
        return getChildren(token.parent).find(child => child.pos === token.pos);
    }
    function readNative(target, property) {
        const value = Reflect.get(target, property);
        if (typeof value === 'number' && KIND_PROPERTIES.has(property)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- a kind read from a native node
            return translateKind(value);
        }
        if (isNativeNode(value)) {
            if (property === 'externalModuleIndicator' || property === 'parent') {
                const reference = skipReparsedCastParents(value);
                return hasClassicKind(reference) ? wrapNode(reference) : undefined;
            }
            return isReparsed(value) ? undefined : wrapNode(skipReparsedCasts(value));
        }
        if (isNativeNodeArray(value)) {
            const adapted = adaptArray(value);
            return adapted.length === 0 &&
                property !== 'statements' &&
                hasReparsedNode(value)
                ? undefined
                : adapted;
        }
        return value;
    }
    /** Classic has no array at all where native only synthesized nodes, such as a nested namespace's `export`. */
    function hasReparsedNode(nodes) {
        for (const node of nodes) {
            if (isReparsed(node)) {
                return true;
            }
        }
        return false;
    }
    /**
     * A fallback rather than a rename: nodes that do have a native property of
     * the classic name — a parameter's `?`, a mapped type's `?` — keep using it.
     */
    function readPostfixToken(target, property, kind) {
        const own = readNative(target, property);
        if (own != null) {
            return own;
        }
        const postfix = Reflect.get(target, 'postfixToken');
        return isNativeNode(postfix) && postfix.kind === kind
            ? wrapNode(postfix)
            : undefined;
    }
    const nodeMethods = {
        forEachChild(visitor, visitArray) {
            return unwrap(this).forEachChild(child => isReparsed(child)
                ? undefined
                : visitor(wrapNode(skipReparsedCasts(child))), visitArray && (children => visitArray(adaptArray(children))));
        },
        getChildAt(index) {
            return getChildren(unwrap(this))[index];
        },
        getChildCount() {
            return getChildren(unwrap(this)).length;
        },
        getChildren() {
            return getChildren(unwrap(this));
        },
        getFirstToken() {
            return wrapToken(unwrap(this).getFirstToken());
        },
        getFullText() {
            return unwrap(this).getFullText();
        },
        getLastToken() {
            return wrapToken(unwrap(this).getLastToken());
        },
        getLeadingTriviaWidth() {
            return unwrap(this).getLeadingTriviaWidth();
        },
        getSourceFile() {
            return wrapNode(unwrap(this).getSourceFile());
        },
        getStart(_sourceFile, includeJsDocComment) {
            return unwrap(this).getStart(undefined, includeJsDocComment);
        },
        getText() {
            return unwrap(this).getText();
        },
        getWidth() {
            return unwrap(this).getWidth();
        },
    };
    function readClassic(target, property, receiver) {
        switch (property) {
            case 'default':
                return readNative(target, 'defaultType');
            case 'elements':
                return target.kind === ast_1.SyntaxKind.ImportAttributes
                    ? readNative(target, 'attributes')
                    : readNative(target, property);
            case 'escapedText':
                return target.kind === ast_1.SyntaxKind.Identifier ||
                    target.kind === ast_1.SyntaxKind.PrivateIdentifier
                    ? ts.escapeLeadingUnderscores(target.text)
                    : readNative(target, property);
            case 'exclamationToken':
                return readPostfixToken(target, property, ast_1.SyntaxKind.ExclamationToken);
            // Classic always spells a heritage element as an expression.
            case 'expression':
                if (isHeritageTypeReference(target)) {
                    return wrapNode(target.typeName);
                }
                return isHeritageQualifiedName(target)
                    ? readNative(target, 'left')
                    : readNative(target, property);
            // Classic only counts modifiers where they are allowed to appear.
            case 'modifierFlagsCache':
                return (
                // eslint-disable-next-line @typescript-eslint/no-deprecated -- the native backend runs alongside TypeScript 6
                (ts.canHaveModifiers(receiver)
                    ? (target
                        .modifierFlags ?? ts.ModifierFlags.None)
                    : ts.ModifierFlags.None) | ts.ModifierFlags.HasComputedFlags);
            case 'name':
                return isHeritageQualifiedName(target)
                    ? readNative(target, 'right')
                    : readNative(target, property);
            case 'parseDiagnostics': {
                if (target.kind !== ast_1.SyntaxKind.SourceFile) {
                    return undefined;
                }
                const { fileName } = target;
                return getSyntacticDiagnostics(fileName).map(diagnostic => toClassicDiagnostic(diagnostic, () => receiver));
            }
            case 'questionToken':
                return readPostfixToken(target, property, ast_1.SyntaxKind.QuestionToken);
            default:
                return readNative(target, property);
        }
    }
    const viewPrototypes = new WeakMap();
    function createViewPrototype(nativePrototype) {
        const prototype = {};
        for (const name of FORWARDED_METHODS) {
            if (name in nativePrototype) {
                prototype[name] = function (...args) {
                    return this[NATIVE_NODE][name](...args);
                };
            }
        }
        Object.assign(prototype, nodeMethods);
        for (const name of new Set([
            ...getGetterNames(nativePrototype),
            ...CLASSIC_ONLY_KEYS,
        ])) {
            if (EAGER_KEYS.has(name)) {
                continue;
            }
            // Read values live in a map so that reading them doesn't reshape the view.
            Object.defineProperty(prototype, name, {
                configurable: true,
                enumerable: false,
                get() {
                    const values = this[VALUES];
                    if (values?.has(name)) {
                        return values.get(name);
                    }
                    const value = readClassic(this[NATIVE_NODE], name, this);
                    (this[VALUES] ??= new Map()).set(name, value);
                    return value;
                },
                set(value) {
                    (this[VALUES] ??= new Map()).set(name, value);
                },
            });
        }
        return prototype;
    }
    function getViewPrototype(node) {
        const nativePrototype = Object.getPrototypeOf(node);
        let prototype = viewPrototypes.get(nativePrototype);
        if (!prototype) {
            prototype = createViewPrototype(nativePrototype);
            viewPrototypes.set(nativePrototype, prototype);
        }
        return prototype;
    }
    function unwrap(node) {
        const native = node[NATIVE_NODE];
        if (!native) {
            throw new Error('The node was not created by a native node adapter.');
        }
        return native;
    }
    function wrapNode(node) {
        const cached = node[VIEW];
        if (cached) {
            return cached;
        }
        const view = Object.create(getViewPrototype(node));
        view[NATIVE_NODE] = node;
        view[VALUES] = undefined;
        view.kind = translateNodeKind(node);
        view.pos = node.pos;
        view.end = node.end;
        view.flags = translateNodeFlags(node);
        const adapted = view;
        node[VIEW] = adapted;
        return adapted;
    }
    return { releaseChildren, unwrapNode: unwrap, wrapNode };
}
//# sourceMappingURL=nativeNodeAdapter.js.map