"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCompilerPath = toCompilerPath;
exports.createNativeProjectService = createNativeProjectService;
exports.clearNativeProjectService = clearNativeProjectService;
exports.getNativeProjectService = getNativeProjectService;
const fs_1 = require("@typescript/native/fs");
const sync_1 = require("@typescript/native/sync");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const shared_1 = require("../create-program/shared");
const CLOSED_ERROR = 'The tsgo project service is closed.';
function startupError(error) {
    return new Error(`Failed to start the tsgo project service: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
}
function notFoundError(filePath) {
    return new Error(`${filePath} was not found by the project service. Consider including it in the tsconfig.json.`);
}
function isNativeProcessFailure(error) {
    return (error instanceof Error &&
        /EBADF|EPIPE|Unexpected EOF while reading from child process/.test(error.message));
}
function toCompilerPath(filePath) {
    return node_path_1.default
        .resolve(filePath)
        .replaceAll('\\', '/')
        .replace(/^[A-Z]:\//, drive => drive.toLowerCase());
}
function createNativeProjectService(cwd = process.cwd()) {
    const fileContexts = new Map();
    const fileProjects = new Map();
    const unverifiedFiles = new Map();
    const nearestConfigs = new Map();
    const openProjects = new Set();
    let closed = false;
    let snapshot;
    function startAPI() {
        try {
            return new sync_1.API({ cwd });
        }
        catch (error) {
            throw startupError(error);
        }
    }
    let api = startAPI();
    function reset() {
        try {
            api.close();
        }
        catch {
            // Intentionally ignored.
        }
        snapshot = undefined;
        fileContexts.clear();
        fileProjects.clear();
        unverifiedFiles.clear();
        nearestConfigs.clear();
        openProjects.clear();
    }
    function findNearestConfig(directory) {
        if (nearestConfigs.has(directory)) {
            return nearestConfigs.get(directory);
        }
        const parent = node_path_1.default.dirname(directory);
        const nearest = ['tsconfig.json', 'jsconfig.json']
            .map(name => node_path_1.default.join(directory, name))
            .find(fileName => node_fs_1.default.existsSync(fileName)) ??
            (parent === directory ? undefined : findNearestConfig(parent));
        nearestConfigs.set(directory, nearest);
        return nearest;
    }
    // A project's root files default to it only if it is their nearest config.
    function addProject(nextSnapshot, configFileName) {
        openProjects.add(configFileName);
        const configKey = (0, shared_1.getCanonicalFileName)(configFileName);
        for (const fileName of nextSnapshot.getConfiguredProject(configFileName)
            ?.parsedCommandLine.fileNames ?? []) {
            const fileKey = (0, shared_1.getCanonicalFileName)(fileName);
            if (fileProjects.has(fileKey)) {
                continue;
            }
            const nearestConfig = findNearestConfig(node_path_1.default.dirname(fileName));
            if (nearestConfig &&
                (0, shared_1.getCanonicalFileName)(toCompilerPath(nearestConfig)) === configKey) {
                fileProjects.set(fileKey, configFileName);
                unverifiedFiles.delete(fileKey);
            }
            else {
                unverifiedFiles.set(fileKey, fileName);
            }
        }
    }
    function replaceSnapshot(params) {
        const previousSnapshot = snapshot;
        let nextSnapshot;
        try {
            nextSnapshot = previousSnapshot
                ? previousSnapshot.update(params)
                : api.createSnapshot(params);
        }
        catch (error) {
            if (!previousSnapshot) {
                throw startupError(error);
            }
            throw error;
        }
        snapshot = nextSnapshot;
        fileContexts.clear();
        if (previousSnapshot !== nextSnapshot) {
            previousSnapshot?.dispose();
        }
        return nextSnapshot;
    }
    function contextFor(nextSnapshot, configFileName, compilerPath) {
        const project = nextSnapshot.getConfiguredProject(configFileName);
        const sourceFile = project?.program.getSourceFile(compilerPath);
        if (!project || !sourceFile) {
            throw new Error(`The tsgo project did not contain '${compilerPath}'.`);
        }
        const context = { api, configFileName, project, sourceFile };
        fileContexts.set((0, shared_1.getCanonicalFileName)(compilerPath), context);
        return context;
    }
    function withCode(context, compilerPath, code) {
        return context.sourceFile.text === code
            ? context
            : contextFor(replaceSnapshot({
                ensurePrograms: true,
                fileSystem: (0, fs_1.createFileSystemLayer)([[compilerPath, code]]),
            }), context.configFileName, compilerPath);
    }
    function openFileInSnapshot(filePath, code) {
        const compilerPath = toCompilerPath(filePath);
        const cacheKey = (0, shared_1.getCanonicalFileName)(compilerPath);
        const cachedContext = fileContexts.get(cacheKey);
        if (cachedContext) {
            return withCode(cachedContext, compilerPath, code);
        }
        const knownConfigFileName = fileProjects.get(cacheKey);
        if (knownConfigFileName && snapshot) {
            return withCode(contextFor(snapshot, knownConfigFileName, compilerPath), compilerPath, code);
        }
        const verifyingFiles = [...unverifiedFiles.values()].filter(fileName => (0, shared_1.getCanonicalFileName)(fileName) !== cacheKey);
        const openedFiles = [compilerPath, ...verifyingFiles];
        const discoverySnapshot = replaceSnapshot({
            fileNotifications: { created: [compilerPath] },
            fileSystem: (0, fs_1.createFileSystemLayer)([[compilerPath, code]]),
            openFiles: openedFiles,
        });
        let configFileName;
        let verifiedConfigFileNames;
        let nextSnapshot;
        try {
            configFileName =
                discoverySnapshot.getDefaultProjectForFile(compilerPath)?.configFileName;
            if (!configFileName) {
                throw notFoundError(filePath);
            }
            verifiedConfigFileNames = verifyingFiles.map((_, index) => discoverySnapshot.operation.openedFiles?.[index + 1]?.project
                .configFileName);
            nextSnapshot = replaceSnapshot({
                closeFiles: openedFiles,
                ensurePrograms: true,
                openProjects: openProjects.has(configFileName)
                    ? undefined
                    : [configFileName],
            });
        }
        catch (error) {
            try {
                replaceSnapshot({ closeFiles: openedFiles });
            }
            catch {
                // Intentionally ignored.
            }
            throw error;
        }
        for (const [index, fileName] of verifyingFiles.entries()) {
            const fileKey = (0, shared_1.getCanonicalFileName)(fileName);
            const verifiedConfigFileName = verifiedConfigFileNames[index];
            unverifiedFiles.delete(fileKey);
            if (verifiedConfigFileName &&
                (verifiedConfigFileName === configFileName ||
                    openProjects.has(verifiedConfigFileName))) {
                fileProjects.set(fileKey, verifiedConfigFileName);
            }
        }
        if (!openProjects.has(configFileName)) {
            addProject(nextSnapshot, configFileName);
        }
        fileProjects.set(cacheKey, configFileName);
        unverifiedFiles.delete(cacheKey);
        return withCode(contextFor(nextSnapshot, configFileName, compilerPath), compilerPath, code);
    }
    return {
        close() {
            if (!closed) {
                closed = true;
                reset();
            }
        },
        openFile(filePath, code) {
            if (closed) {
                throw new Error(CLOSED_ERROR);
            }
            try {
                return openFileInSnapshot(filePath, code);
            }
            catch (error) {
                if (!isNativeProcessFailure(error)) {
                    throw error;
                }
                reset();
                api = startAPI();
                return openFileInSnapshot(filePath, code);
            }
        },
    };
}
let nativeProjectService;
function clearNativeProjectService() {
    const service = nativeProjectService;
    nativeProjectService = undefined;
    service?.close();
}
function getNativeProjectService(cwd) {
    return (nativeProjectService ??= createNativeProjectService(cwd));
}
//# sourceMappingURL=createNativeProjectService.js.map