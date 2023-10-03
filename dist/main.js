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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const fs_1 = require("fs");
const mime_1 = require("mime");
const path_1 = require("path");
const util = __importStar(require("util"));
const child_process_1 = require("child_process");
const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
run();
function run() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!((_a = process.env.GITHUB_REF) === null || _a === void 0 ? void 0 : _a.startsWith('refs/tags/'))) {
                throw new Error('⚠️ GitHub Releases requires a tag');
            }
            const release = yield createGithubRelease();
            const filePath = process.env.INPUT_FILE;
            if (filePath) {
                const asset = getAsset(replaceEnvVariables(filePath));
                console.log(`⬆️ Uploading asset '${asset.name}'`);
                yield uploadAsset(release, asset);
            }
            console.log(`🚀 Release ready at ${release.html_url}`);
        }
        catch (error) {
            if (error instanceof Error) {
                (0, core_1.setFailed)(error.message);
            }
            else {
                (0, core_1.setFailed)(`⚠️ Unexpected error: '${error}'`);
            }
        }
    });
}
function createGithubRelease() {
    return __awaiter(this, void 0, void 0, function* () {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        const tag = process.env.GITHUB_REF.split('/')[2];
        const releaseNotes = yield generateReleaseNotes();
        console.log(`👨‍🏭 Creating new GitHub release for tag '${tag}'`);
        const response = yield octokit.rest.repos.createRelease({
            owner,
            repo,
            tag_name: tag,
            name: tag,
            body: releaseNotes,
            draft: false,
            prerelease: false,
        });
        return response.data;
    });
}
function generateReleaseNotes() {
    return __awaiter(this, void 0, void 0, function* () {
        const execAsync = util.promisify(child_process_1.exec);
        // Get old and new version tag or commit
        const { stdout: tags } = yield execAsync('git tag --sort=-v:refname | head -n 2');
        const { stdout: initialCommit } = yield execAsync('git rev-list --max-parents=0 HEAD');
        const [newVersion, oldVersion = initialCommit.trim()] = tags.trim().split('\n');
        // Get commit messages until old version
        const { stdout: commitMessages } = yield execAsync(`git --no-pager log ${oldVersion}...${newVersion} --pretty=format:%s`);
        // Group commits by their semantic prefix
        const groupedCommits = commitMessages
            .split('\n')
            .reverse()
            .filter(commit => !commit.startsWith('Chore: Release'))
            .reduce((acc, commit) => {
            let [prefix, message] = commit.split(':').map(str => str.trim());
            if (!message) {
                message = prefix;
                prefix = 'Miscellaneous';
            }
            acc[prefix] = [...(acc[prefix] || []), `- ${message}`];
            return acc;
        }, {});
        // Define order and replacement of semantic prefixes
        const commitPrefixMapping = {
            'Feat': 'Features',
            'Fix': 'Fixes',
            'Docs': 'Documentation',
            'Test': 'Tests',
            'Refactor': 'Refactoring',
            'Style': 'Style',
            'Chore': 'Chore',
            'Miscellaneous': 'Miscellaneous'
        };
        // Sort groups, map to strings and join to final output
        return Object.entries(groupedCommits)
            .sort(([prefixA], [prefixB]) => {
            const semanticPrefixes = Object.keys(commitPrefixMapping);
            return semanticPrefixes.indexOf(prefixA) - semanticPrefixes.indexOf(prefixB);
        })
            .map(([prefix, commits]) => `**${commitPrefixMapping[prefix]}:**\n${commits.join('\n')}`)
            .join('\n\n');
    });
}
function getAsset(path) {
    return {
        name: (0, path_1.basename)(path),
        mime: (0, mime_1.getType)(path) || 'application/octet-stream',
        size: (0, fs_1.lstatSync)(path).size,
        file: (0, fs_1.readFileSync)(path),
    };
}
function uploadAsset(release, asset) {
    return __awaiter(this, void 0, void 0, function* () {
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        yield octokit.rest.repos.uploadReleaseAsset({
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