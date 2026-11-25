import * as github from '@actions/github';
import * as core from '@actions/core';
import fs, { readFileSync } from 'fs';
import { basename } from 'path';
import axios from 'axios';
import mime from 'mime';
import { cert, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import * as semver from 'semver';
const githubToken = process.env['GITHUB_TOKEN'];
const octokit = github.getOctokit(githubToken ?? '');
const tag = process.env['GITHUB_REF_NAME'] ?? '';
const prefixMapping = {
    feat: 'Features',
    fix: 'Bug Fixes',
    perf: 'Performance',
    security: 'Security',
    revert: 'Reverts',
    docs: 'Documentation',
    refactor: 'Refactoring',
    style: 'Code Style',
    test: 'Tests',
    build: 'Build',
    ci: 'Continuous Integration',
    chore: 'Chores',
    misc: 'Miscellaneous',
};
export async function run() {
    try {
        if (!githubToken) {
            core.setFailed('⚠️ GitHub Releases requires a GitHub token');
            return;
        }
        if (!tag) {
            core.setFailed('⚠️ GitHub Releases requires a tag');
            return;
        }
        const release = await createGithubRelease();
        await uploadAsset(release);
        await sendAssetOverTelegram(release);
        await sendFirebaseMessage();
        core.info(`🚀 Release ready at ${release.html_url}`);
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error);
        }
        else {
            core.setFailed(`⚠️ Unexpected error: '${error}'`);
        }
    }
}
async function createGithubRelease() {
    const [owner, repo] = getRepositoryOwnerAndName();
    const releaseNotes = await generateReleaseNotes();
    core.info(`👨‍🏭 Creating new GitHub release for tag '${tag}'`);
    const response = await octokit.rest.repos.createRelease({
        owner,
        repo,
        tag_name: tag,
        name: tag,
        body: releaseNotes,
        draft: false,
        prerelease: false,
    });
    return response.data;
}
async function uploadAsset(release) {
    const filePath = core.getInput('file');
    const assetName = core.getInput('asset-name');
    if (!filePath || !assetName) {
        return;
    }
    const asset = getAsset(filePath, assetName);
    const [owner, repo] = getRepositoryOwnerAndName();
    core.info(`⬆️ Uploading asset '${asset.name}'`);
    await octokit.rest.repos.uploadReleaseAsset({
        owner,
        repo,
        url: release.upload_url,
        release_id: release.id,
        headers: { 'content-type': asset.mime },
        name: asset.name,
        data: asset.file,
    });
}
async function sendAssetOverTelegram(release) {
    const filePath = core.getInput('file');
    const assetName = core.getInput('asset-name');
    const botToken = core.getInput('bot-token');
    const chatId = core.getInput('chat-id');
    if (!filePath || !botToken || !chatId) {
        return;
    }
    core.info(`📧️ Sending asset to Telegram chat '${chatId}'`);
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: `*Release ${release.name ?? release.tag_name}*\n\n${release.body ?? '- No release notes'}`,
        parse_mode: 'markdown',
    });
    const form = new FormData();
    const buffer = fs.readFileSync(filePath);
    form.append('chat_id', chatId);
    form.append('document', new Blob([buffer]), assetName || filePath.split('/').pop());
    await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, form);
}
async function sendFirebaseMessage() {
    const firebaseServiceAccountKeyBase64 = core.getInput('firebase-service-account-key');
    const firebaseTopic = core.getInput('firebase-topic');
    const appName = core.getInput('app-name');
    if (!firebaseServiceAccountKeyBase64 || !firebaseTopic || !appName || !tag) {
        return;
    }
    core.info(`🔔 Sending Firebase message to topic '${firebaseTopic}'`);
    const firebaseServiceAccountKey = JSON.parse(Buffer.from(firebaseServiceAccountKeyBase64, 'base64').toString('utf-8'));
    const firebaseApp = initializeApp({ credential: cert(firebaseServiceAccountKey) });
    await getMessaging(firebaseApp).send({
        topic: firebaseTopic,
        data: {
            name: appName,
            version: tag.replace('v', ''),
        },
    });
}
function getRepositoryOwnerAndName() {
    const repository = process.env['GITHUB_REPOSITORY'];
    if (!repository) {
        throw new Error('⚠️ GitHub Releases requires a repository');
    }
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
        throw new Error(`⚠️ Invalid repository '${repository}'`);
    }
    return [owner, repo];
}
async function generateReleaseNotes() {
    const [owner, repo] = getRepositoryOwnerAndName();
    const { newVersion, oldVersion } = await fetchTagsFromGitHub(owner, repo);
    const commitMessages = await fetchCommitMessages(owner, repo, newVersion, oldVersion);
    const groupedCommits = groupCommitsByPrefix(commitMessages);
    return formatReleaseNotes(groupedCommits);
}
async function fetchTagsFromGitHub(owner, repo) {
    core.info('🔍 Fetching tags from GitHub API');
    const tags = await octokit.paginate(octokit.rest.repos.listTags, {
        owner,
        repo,
        per_page: 100,
    });
    if (tags.length === 0) {
        throw new Error('⚠️ No tags found in repository');
    }
    const sortedTags = tags
        .map((tagItem) => tagItem.name)
        .filter((version) => semver.valid(version))
        .sort((a, b) => semver.rcompare(a, b));
    if (sortedTags.length === 0) {
        throw new Error('⚠️ No valid semver tags found in repository');
    }
    const newVersion = sortedTags[0];
    const oldVersion = sortedTags.length > 1 ? sortedTags[1] : null;
    core.info(`✅ Found recent tags: '${newVersion}' (latest), '${oldVersion ?? 'none'}' (previous)`);
    if (newVersion !== tag) {
        throw new Error(`⚠️ Latest tag '${newVersion}' does not match with current tag '${tag}'`);
    }
    return { newVersion, oldVersion };
}
async function fetchCommitMessages(owner, repo, newVersion, oldVersion) {
    let commits;
    if (oldVersion) {
        core.info(`📝 Fetching commits between '${oldVersion}' and '${newVersion}'`);
        const { data: comparison } = await octokit.rest.repos.compareCommitsWithBasehead({
            owner,
            repo,
            basehead: `${oldVersion}...${newVersion}`,
        });
        commits = comparison.commits;
    }
    else {
        core.info(`📝 Fetching all commits for tag '${newVersion}'`);
        const { data: commitList } = await octokit.rest.repos.listCommits({
            owner,
            repo,
            sha: newVersion,
            per_page: 100,
        });
        commits = commitList;
    }
    const commitMessages = commits.map((commit) => commit.commit.message.split('\n')[0]);
    return commitMessages
        .filter((commitMessage, index) => commitMessages.indexOf(commitMessage) === index)
        .filter((commitMessage) => !commitMessage.startsWith('Chore: Release'));
}
function groupCommitsByPrefix(commitMessages) {
    return commitMessages.reduce((acc, commit) => {
        let [prefix, message] = commit.split(':').map((str) => str.trim());
        prefix = prefix.toLowerCase();
        if (!message) {
            message = prefix;
            prefix = 'misc';
        }
        if (!prefixMapping[prefix]) {
            prefix = 'misc';
        }
        acc[prefix] = [...(acc[prefix] ?? []), `- ${message}`];
        return acc;
    }, {});
}
function formatReleaseNotes(groupedCommits) {
    return Object.entries(groupedCommits)
        .sort(([prefixA], [prefixB]) => {
        const semanticPrefixes = Object.keys(prefixMapping);
        return semanticPrefixes.indexOf(prefixA) - semanticPrefixes.indexOf(prefixB);
    })
        .map(([prefix, commits]) => `**${prefixMapping[prefix]}:**\n${commits.join('\n')}`)
        .join('\n\n');
}
function getAsset(path, name) {
    return {
        name: name ?? basename(path),
        mime: mime.getType(path) ?? 'application/octet-stream',
        file: readFileSync(path),
    };
}
//# sourceMappingURL=main.js.map