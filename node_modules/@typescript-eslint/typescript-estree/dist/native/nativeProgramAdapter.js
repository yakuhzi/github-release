"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNativeProgram = createNativeProgram;
const nativeNodeAdapter_1 = require("./nativeNodeAdapter");
const throwOnUnsupportedMembers_1 = require("./throwOnUnsupportedMembers");
const UNSUPPORTED_PROGRAM_MEMBERS = new Set([
    'emit',
    'getIdentifierCount',
    'getInstantiationCount',
    'getNodeCount',
    'getRelationCacheSizes',
    'getResolvedProjectReferences',
    'getSymbolCount',
    'getTypeCount',
]);
function createNativeProgram({ checker, nodeAdapter, project, }) {
    const { program } = project;
    function getSourceFile(fileName) {
        const sourceFile = program.getSourceFile(fileName);
        return sourceFile && nodeAdapter.wrapNode(sourceFile);
    }
    function wrapDiagnostic(diagnostic) {
        return (0, nativeNodeAdapter_1.toClassicDiagnostic)(diagnostic, fileName => fileName == null ? undefined : getSourceFile(fileName));
    }
    function locatedDiagnosticsFor(get, file) {
        return get(file?.fileName)
            .map(wrapDiagnostic)
            .filter((diagnostic) => diagnostic.file != null);
    }
    const nativeProgram = {
        getCompilerOptions: () => 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- values match classic; see native-enum-parity.test.ts
        program.getCompilerOptions(),
        getConfigFileParsingDiagnostics: () => program.getConfigFileParsingDiagnostics().map(wrapDiagnostic),
        getCurrentDirectory: () => program.getCurrentDirectory(),
        getDeclarationDiagnostics: file => locatedDiagnosticsFor(program.getDeclarationDiagnostics, file),
        getGlobalDiagnostics: () => program.getGlobalDiagnostics().map(wrapDiagnostic),
        getModeForResolutionAtIndex: (file, index) => 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- values match classic; see native-enum-parity.test.ts
        program.getModeForResolutionAtIndex(file.fileName, index),
        getModeForUsageLocation: (file, usage) => 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-assignment -- values match classic; see native-enum-parity.test.ts
        program.getModeForUsageLocation(file.fileName, nodeAdapter.unwrapNode(usage)),
        getOptionsDiagnostics: () => program.getProgramDiagnostics().map(wrapDiagnostic),
        getProjectReferences: () => project.parsedCommandLine.projectReferences,
        getRootFileNames: () => project.parsedCommandLine.fileNames,
        getSemanticDiagnostics: file => program.getSemanticDiagnostics(file?.fileName).map(wrapDiagnostic),
        getSourceFile,
        getSourceFileByPath: getSourceFile,
        getSourceFiles: () => program
            .getSourceFileNames()
            .map(getSourceFile)
            .filter(sourceFile => sourceFile != null),
        getSyntacticDiagnostics: file => locatedDiagnosticsFor(program.getSyntacticDiagnostics, file),
        getTypeChecker: () => checker,
        isSourceFileDefaultLibrary: sourceFile => program.isSourceFileDefaultLibrary(nodeAdapter.unwrapNode(sourceFile)),
        isSourceFileFromExternalLibrary: sourceFile => program.isSourceFileFromExternalLibrary(nodeAdapter.unwrapNode(sourceFile)),
        sourceFileToPackageName: { get: packageIdNameFromPath },
    };
    return (0, throwOnUnsupportedMembers_1.throwOnUnsupportedMembers)(
    // eslint-disable-next-line @typescript-eslint/internal/prefer-ast-types-enum -- this names the classic TypeScript API, not an ESTree node type
    'Program', UNSUPPORTED_PROGRAM_MEMBERS, nativeProgram);
}
// Classic's package id names are paths within the package, such as `typescript/lib/typescript.d.ts`.
function packageIdNameFromPath(filePath) {
    const segments = filePath.split(/[/\\]/);
    const index = segments.lastIndexOf('node_modules');
    return index === -1 || index === segments.length - 1
        ? undefined
        : segments.slice(index + 1).join('/');
}
//# sourceMappingURL=nativeProgramAdapter.js.map