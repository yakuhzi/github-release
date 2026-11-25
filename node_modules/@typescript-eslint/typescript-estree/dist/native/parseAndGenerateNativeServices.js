"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndGenerateNativeServices = parseAndGenerateNativeServices;
const ast_1 = require("@typescript/native/ast");
const ast_converter_1 = require("../ast-converter");
const convert_1 = require("../convert");
const createParserServices_1 = require("../createParserServices");
const semantic_or_syntactic_errors_1 = require("../semantic-or-syntactic-errors");
const createNativeProjectService_1 = require("./createNativeProjectService");
const nativeCheckerAdapter_1 = require("./nativeCheckerAdapter");
const nativeNodeAdapter_1 = require("./nativeNodeAdapter");
const nativeProgramAdapter_1 = require("./nativeProgramAdapter");
const nativeTypeAdapter_1 = require("./nativeTypeAdapter");
const PREFETCH_KINDS = new Set(Object.entries(ast_1.SyntaxKind)
    .filter(([name, value]) => typeof value === 'number' &&
    /Expression$|Literal$|^Identifier$|^FunctionDeclaration$|^(?:False|Null|Super|This|True)Keyword$/.test(name))
    .map(([, value]) => value));
const NAME_PREFETCH_PARENT_KINDS = new Set([
    ast_1.SyntaxKind.ShorthandPropertyAssignment,
    ast_1.SyntaxKind.VariableDeclaration,
]);
const UNTYPED_IDENTIFIER_PARENT_KINDS = new Set([
    ast_1.SyntaxKind.ExportSpecifier,
    ast_1.SyntaxKind.ImportClause,
    ast_1.SyntaxKind.ImportSpecifier,
    ast_1.SyntaxKind.NamespaceExport,
    ast_1.SyntaxKind.NamespaceImport,
    ast_1.SyntaxKind.QualifiedName,
    ast_1.SyntaxKind.TypeReference,
]);
/** Rules ask after an identifier's type where it is a value, rarely where it names something. */
function isTypedIdentifier(node) {
    const { parent } = node;
    return (!UNTYPED_IDENTIFIER_PARENT_KINDS.has(parent.kind) &&
        (parent.name !== node ||
            NAME_PREFETCH_PARENT_KINDS.has(parent.kind)));
}
const CALL_KINDS = new Set([
    ast_1.SyntaxKind.CallExpression,
    ast_1.SyntaxKind.NewExpression,
]);
function isContextualTypeCandidate(node) {
    switch (node.parent.kind) {
        case ast_1.SyntaxKind.CallExpression:
        case ast_1.SyntaxKind.NewExpression:
            return (node.parent.arguments?.includes(node) ?? false);
        case ast_1.SyntaxKind.PropertyAssignment:
        case ast_1.SyntaxKind.ReturnStatement:
        case ast_1.SyntaxKind.ShorthandPropertyAssignment:
            return true;
        default:
            return false;
    }
}
function collectPrefetchNodes(sourceFile) {
    const calls = [];
    const contextual = [];
    const typed = [];
    const visit = (node) => {
        if (CALL_KINDS.has(node.kind)) {
            calls.push(node);
        }
        if (isContextualTypeCandidate(node)) {
            contextual.push(node);
        }
        if (node.kind === ast_1.SyntaxKind.Identifier
            ? isTypedIdentifier(node)
            : PREFETCH_KINDS.has(node.kind)) {
            typed.push(node);
        }
        node.forEachChild(visit);
    };
    sourceFile.forEachChild(visit);
    return { calls, contextual, typed };
}
/** Classic's `parseDiagnostics` leave out the grammar errors that `getJSSyntacticDiagnosticsForFile` adds for JavaScript files. */
const JS_ONLY_SYNTACTIC_CODES = new Set([
    1206, 1486, 8002, 8003, 8004, 8005, 8006, 8008, 8009, 8010, 8011, 8012, 8013,
    8016, 8017, 8037, 8038,
]);
function createAdapters({ api, project }) {
    let diagnosticsByFile;
    const { checker, prefetch } = (0, nativeCheckerAdapter_1.createNativeChecker)({
        api,
        checker: project.checker,
        nodeAdapter,
        typeAdapter: (0, nativeTypeAdapter_1.createNativeTypeAdapter)({
            checker: project.checker,
            nodeAdapter,
            project,
        }),
    });
    return {
        getSyntacticDiagnostics(fileName) {
            if (!diagnosticsByFile) {
                diagnosticsByFile = new Map();
                for (const diagnostic of project.program.getSyntacticDiagnostics()) {
                    if (JS_ONLY_SYNTACTIC_CODES.has(diagnostic.code)) {
                        continue;
                    }
                    const key = diagnostic.fileName ?? '';
                    const existing = diagnosticsByFile.get(key);
                    if (existing) {
                        existing.push(diagnostic);
                    }
                    else {
                        diagnosticsByFile.set(key, [diagnostic]);
                    }
                }
            }
            return diagnosticsByFile.get(fileName) ?? [];
        },
        prefetch,
        prefetchedSourceFiles: new WeakSet(),
        program: (0, nativeProgramAdapter_1.createNativeProgram)({ checker, nodeAdapter, project }),
    };
}
let currentAdapters;
// Views depend only on their native node, so one adapter lets every program
// share them; native nodes of unchanged files outlive snapshots.
const nodeAdapter = (0, nativeNodeAdapter_1.createNativeNodeAdapter)({
    getSyntacticDiagnostics: fileName => currentAdapters?.getSyntacticDiagnostics(fileName) ?? [],
});
const adaptersByProgram = new WeakMap();
function getAdapters(context) {
    let adapters = adaptersByProgram.get(context.project.program);
    if (!adapters) {
        adapters = createAdapters(context);
        adaptersByProgram.set(context.project.program, adapters);
    }
    return adapters;
}
function parseAndGenerateNativeServices(parseSettings) {
    const context = (0, createNativeProjectService_1.getNativeProjectService)(parseSettings.tsconfigRootDir).openFile(parseSettings.filePath, parseSettings.codeFullText);
    currentAdapters = getAdapters(context);
    const { prefetch, prefetchedSourceFiles, program } = currentAdapters;
    const sourceFile = nodeAdapter.wrapNode(context.sourceFile);
    const { astMaps, estree } = (0, ast_converter_1.astConverter)(sourceFile, parseSettings, parseSettings.preserveNodeMaps ?? true);
    nodeAdapter.releaseChildren(context.sourceFile);
    if (!prefetchedSourceFiles.has(context.sourceFile)) {
        prefetchedSourceFiles.add(context.sourceFile);
        const wrap = (nodes) => nodes.map(node => nodeAdapter.wrapNode(node));
        const { calls, contextual, typed } = collectPrefetchNodes(context.sourceFile);
        prefetch({
            calls: wrap(calls),
            contextual: wrap(contextual),
            typed: wrap(typed),
        });
    }
    if (parseSettings.errorOnTypeScriptSyntacticAndSemanticIssues) {
        const error = (0, semantic_or_syntactic_errors_1.getFirstSemanticOrSyntacticError)(program, sourceFile);
        if (error) {
            throw (0, convert_1.convertError)(error);
        }
    }
    return {
        ast: estree,
        services: (0, createParserServices_1.createParserServices)(astMaps, program),
    };
}
//# sourceMappingURL=parseAndGenerateNativeServices.js.map