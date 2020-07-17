"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core/lib/core");
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const fs_1 = require("fs");
const mime_1 = require("mime");
const path_1 = require("path");
const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
run();
function run() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!((_a = process.env.GITHUB_REF) === null || _a === void 0 ? void 0 : _a.startsWith('refs/tags/'))) {
                throw new Error('A tag is required for GitHub Releases');
            }
            let changelog;
            const changelogPath = process.env.INPUT_CHANGELOG;
            if (changelogPath) {
                changelog = fs.readFileSync(replaceEnvVariables(changelogPath), 'utf8');
            }
            const release = yield createGithubRelease(changelog);
            const assetPath = process.env.INPUT_FILE;
            if (assetPath) {
                const asset = getAsset(replaceEnvVariables(assetPath));
                yield uploadAsset(release, asset);
            }
            console.log(`Release uploaded to ${release.html_url}`);
        }
        catch (error) {
            core_1.setFailed(error.message);
        }
    });
}
function createGithubRelease(changelog) {
    return __awaiter(this, void 0, void 0, function* () {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        const tag = process.env.GITHUB_REF.split('/')[2];
        const response = yield octokit.repos.createRelease({
            owner,
            repo,
            tag_name: tag,
            name: tag,
            body: changelog,
            draft: false,
            prerelease: false,
        });
        return response.data;
    });
}
function getAsset(path) {
    return {
        name: path_1.basename(path),
        mime: mime_1.getType(path) || 'application/octet-stream',
        size: fs_1.lstatSync(path).size,
        file: fs_1.readFileSync(path),
    };
}
function uploadAsset(release, asset) {
    return __awaiter(this, void 0, void 0, function* () {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        return octokit.repos.uploadReleaseAsset({
            owner,
            repo,
            url: release.upload_url,
            release_id: release.id,
            headers: {
                'content-length': asset.size,
                'content-type': asset.mime,
            },
            name: asset.name,
            data: asset.file,
        });
    });
}
function replaceEnvVariables(path) {
    return path
        .replace(/\$GITHUB_WORKSPACE/g, process.env.GITHUB_WORKSPACE)
        .replace(/\$HOME/g, process.env.HOME);
}
//# sourceMappingURL=main.js.map