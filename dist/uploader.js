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
const asset_1 = require("./asset");
const path_1 = require("path");
const mime_1 = require("mime");
const fs = __importStar(require("fs"));
const fs_1 = require("fs");
const release_1 = require("./release");
class Uploader {
    constructor() {
        this.github = new github_1.GitHub(process.env.GITHUB_TOKEN);
        this.run = () => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!process.env.GITHUB_REF.startsWith('refs/tags/')) {
                    throw new Error('A tag is required for GitHub Releases');
                }
                let changelog;
                const changelogPath = process.env.INPUT_CHANGELOG;
                if (changelogPath) {
                    changelog = fs.readFileSync(this.replaceEnvVariables(changelogPath), 'utf8');
                }
                const release = yield this.createGithubRelease(changelog);
                const assetPath = process.env.INPUT_FILE;
                if (assetPath) {
                    const asset = this.getAsset(this.replaceEnvVariables(assetPath));
                    yield this.uploadAsset(release.uploadUrl, asset);
                }
                console.log(`Release uploaded to ${release.htmlUrl}`);
            }
            catch (error) {
                console.log(error);
                core_1.setFailed(error.message);
            }
        });
        this.createGithubRelease = (changelog) => __awaiter(this, void 0, void 0, function* () {
            const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
            const tag = process.env.GITHUB_REF.split('/')[2];
            const response = yield this.github.repos.createRelease({
                owner,
                repo,
                tag_name: tag,
                name: tag,
                body: changelog,
                draft: false,
                prerelease: false,
            });
            return new release_1.Release(response.data.upload_url, response.data.html_url);
        });
        this.getAsset = (path) => {
            return new asset_1.Asset(path_1.basename(path), mime_1.getType(path) || 'application/octet-stream', fs_1.lstatSync(path).size, fs_1.readFileSync(path));
        };
        this.uploadAsset = (url, asset) => __awaiter(this, void 0, void 0, function* () {
            return this.github.repos.uploadReleaseAsset({
                url,
                headers: {
                    'content-length': asset.size,
                    'content-type': asset.mime
                },
                name: asset.name,
                file: asset.file
            });
        });
        this.replaceEnvVariables = (path) => {
            return path
                .replace(/\$GITHUB_WORKSPACE/g, process.env.GITHUB_WORKSPACE)
                .replace(/\$HOME/g, process.env.HOME);
        };
    }
}
exports.Uploader = Uploader;
//# sourceMappingURL=uploader.js.map