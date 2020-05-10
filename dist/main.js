"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const core_1 = require("@actions/core/lib/core");
const path_1 = require("path");
const mime_1 = require("mime");
const fs = __importStar(require("fs"));
const fs_1 = require("fs");
const github = new github_1.GitHub(process.env.GITHUB_TOKEN);
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!process.env.GITHUB_REF.startsWith('refs/tags/')) {
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
                yield uploadAsset(release.upload_url, asset);
            }
            console.log(`Release uploaded to ${release.html_url}`);
        }
        catch (error) {
            console.log(error);
            core_1.setFailed(error.message);
        }
    });
}
function createGithubRelease(changelog) {
    return __awaiter(this, void 0, void 0, function* () {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        const tag = process.env.GITHUB_REF.split('/')[2];
        const response = yield github.repos.createRelease({
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
        file: fs_1.readFileSync(path)
    };
}
function uploadAsset(url, asset) {
    return __awaiter(this, void 0, void 0, function* () {
        return github.repos.uploadReleaseAsset({
            url,
            headers: {
                'content-length': asset.size,
                'content-type': asset.mime
            },
            name: asset.name,
            data: asset.file
        });
    });
}
function replaceEnvVariables(path) {
    return path
        .replace(/\$GITHUB_WORKSPACE/g, process.env.GITHUB_WORKSPACE)
        .replace(/\$HOME/g, process.env.HOME);
}
//# sourceMappingURL=main.js.map