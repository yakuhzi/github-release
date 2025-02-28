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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core/lib/core");
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const fs_1 = __importStar(require("fs"));
const path_1 = require("path");
const util = __importStar(require("util"));
const child_process_1 = require("child_process");
const axios_1 = __importDefault(require("axios"));
const mime_1 = __importDefault(require("mime"));
const admin = __importStar(require("firebase-admin"));
const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
run();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            if (!((_a = process.env.GITHUB_REF) === null || _a === void 0 ? void 0 : _a.startsWith('refs/tags/'))) {
                throw new Error('⚠️ GitHub Releases requires a tag');
            }
            const release = yield createGithubRelease();
            yield uploadAsset(release);
            yield sendAssetOverTelegram(release);
            yield sendFirebaseMessage();
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
function uploadAsset(release) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = core.getInput('file') || process.env.INPUT_FILE;
        const assetName = core.getInput('asset-name') || process.env.INPUT_ASSET_NAME;
        if (!filePath || !assetName) {
            return;
        }
        const asset = getAsset(filePath, assetName);
        const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
        console.log(`⬆️ Uploading asset '${asset.name}'`);
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
function sendAssetOverTelegram(release) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = core.getInput('file') || process.env.INPUT_FILE;
        const assetName = core.getInput('asset-name') || process.env.INPUT_ASSET_NAME;
        const botToken = core.getInput('bot-token') || process.env.INPUT_BOT_TOKEN;
        const chatId = core.getInput('chat-id') || process.env.INPUT_CHAT_ID;
        if (!filePath || !botToken || !chatId) {
            return;
        }
        console.log(`📧️ Sending asset to Telegram chat '${chatId}'`);
        yield axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: `*Release ${release.name}*\n\n${release.body}`,
            parse_mode: 'markdown',
        });
        const form = new FormData();
        const buffer = fs_1.default.readFileSync(filePath);
        form.append('chat_id', chatId);
        form.append('document', new Blob([buffer]), assetName !== null && assetName !== void 0 ? assetName : filePath.split('/').pop());
        yield axios_1.default.post(`https://api.telegram.org/bot${botToken}/sendDocument`, form);
    });
}
function sendFirebaseMessage() {
    return __awaiter(this, void 0, void 0, function* () {
        const firebaseServiceAccountKeyBase64 = core.getInput('firebase-service-account-key')
            || process.env.INPUT_FIREBASE_SERVICE_ACCOUNT_KEY;
        const firebaseTopic = core.getInput('firebase-topic') || process.env.INPUT_FIREBASE_TOPIC;
        const appName = core.getInput('app-name') || process.env.INPUT_APP_NAME;
        const tag = process.env.GITHUB_REF.split('/')[2];
        if (!firebaseServiceAccountKeyBase64 || !firebaseTopic || !appName || !tag) {
            return;
        }
        console.log(`🔔 Sending Firebase message to topic '${firebaseTopic}'`);
        const firebaseServiceAccountKey = JSON.parse(Buffer.from(firebaseServiceAccountKeyBase64, 'base64').toString('utf-8'));
        const firebaseAdmin = admin.initializeApp({
            credential: admin.credential.cert(firebaseServiceAccountKey),
        });
        yield firebaseAdmin.messaging().send({
            topic: firebaseTopic,
            data: {
                name: appName,
                version: tag.replace('v', ''),
            },
        });
    });
}
function generateReleaseNotes() {
    return __awaiter(this, void 0, void 0, function* () {
        const execAsync = util.promisify(child_process_1.exec);
        // Get old and new version tag or commit
        const { stdout: tags } = yield execAsync('git for-each-ref --sort=-authordate --format \'%(refname:short)\' --count 2 refs/tags');
        const { stdout: initialCommit } = yield execAsync('git rev-list --max-parents=0 HEAD');
        const [newVersion, oldVersion = initialCommit.trim()] = tags.trim().split('\n');
        if (newVersion !== process.env.GITHUB_REF.split('/')[2]) {
            throw new Error('⚠️ Latest tag does not match with current tag');
        }
        // Get commit messages until old version
        const { stdout: commitMessagesString } = yield execAsync(`git --no-pager log ${oldVersion}...${newVersion} --pretty=format:%s`);
        let commitMessages = commitMessagesString.split('\n').reverse();
        // Filter duplicate and release commit messages
        commitMessages = commitMessages
            .filter((commitMessage, index) => commitMessages.indexOf(commitMessage) == index)
            .filter(commitMessage => !commitMessage.startsWith('Chore: Release'));
        // Define order and replacement of semantic prefixes
        const commitPrefixMapping = {
            'Feat': 'Features',
            'Fix': 'Fixes',
            'Docs': 'Documentation',
            'Test': 'Tests',
            'Refactor': 'Refactoring',
            'Style': 'Style',
            'Chore': 'Chore',
            'Misc': 'Miscellaneous',
        };
        // Group commits by their semantic prefix
        const groupedCommits = commitMessages
            .reduce((acc, commit) => {
            let [prefix, message] = commit.split(':').map(str => str.trim());
            if (!message) {
                message = prefix;
                prefix = 'Miscellaneous';
            }
            if (!commitPrefixMapping[prefix]) {
                prefix = 'Misc';
            }
            acc[prefix] = [...(acc[prefix] || []), `- ${message}`];
            return acc;
        }, {});
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
function getAsset(path, name) {
    if (!name || name.length == 0) {
        name = (0, path_1.basename)(path);
    }
    return {
        name,
        mime: mime_1.default.getType(path) || 'application/octet-stream',
        size: (0, fs_1.lstatSync)(path).size,
        file: (0, fs_1.readFileSync)(path),
    };
}
//# sourceMappingURL=main.js.map