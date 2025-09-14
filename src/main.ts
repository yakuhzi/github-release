import * as github from '@actions/github'
import * as core from '@actions/core'
import type { Release } from './release.js'
import type { Asset } from './asset.js'
import fs, { lstatSync, readFileSync } from 'fs'
import { basename } from 'path'
import * as util from 'util'
import { exec } from 'child_process'
import axios from 'axios'
import mime from 'mime'
import admin from 'firebase-admin'

const octokit = github.getOctokit(process.env['GITHUB_TOKEN']!)
const tag = process.env['GITHUB_REF_NAME'] ?? ''

export async function run(): Promise<void> {
  try {
    if (!tag) {
      core.setFailed('⚠️ GitHub Releases requires a tag')
      return
    }

    const release = await createGithubRelease()
    await uploadAsset(release)
    await sendAssetOverTelegram(release)
    await sendFirebaseMessage()

    core.info(`🚀 Release ready at ${release.html_url}`)
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error)
    } else {
      core.setFailed(`⚠️ Unexpected error: '${error as string}'`)
    }
  }
}

async function createGithubRelease(): Promise<Release> {
  const [owner, repo] = process.env['GITHUB_REPOSITORY']!.split('/')
  const releaseNotes = await generateReleaseNotes()
  core.info(`👨‍🏭 Creating new GitHub release for tag '${tag}'`)

  const response = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: tag,
    name: tag,
    body: releaseNotes,
    draft: false,
    prerelease: false,
  })

  return response.data
}

async function uploadAsset(release: Release): Promise<void> {
  const filePath = core.getInput('file')
  const assetName = core.getInput('asset-name')

  if (!filePath || !assetName) {
    return
  }

  const asset = getAsset(filePath, assetName)
  const [owner, repo] = process.env['GITHUB_REPOSITORY']!.split('/')

  core.info(`⬆️ Uploading asset '${asset.name}'`)
  await octokit.rest.repos.uploadReleaseAsset({
    owner,
    repo,
    url: release.upload_url,
    release_id: release.id,
    headers: {
      'content-length': asset.size,
      'content-type': asset.mime,
    },
    name: asset.name,
    data: asset.file as unknown as string,
  })
}

async function sendAssetOverTelegram(release: Release): Promise<void> {
  const filePath = core.getInput('file')
  const assetName = core.getInput('asset-name')
  const botToken = core.getInput('bot-token')
  const chatId = core.getInput('chat-id')

  if (!filePath || !botToken || !chatId) {
    return
  }

  core.info(`📧️ Sending asset to Telegram chat '${chatId}'`)

  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: `*Release ${release.name ?? release.tag_name}*\n\n${release.body ?? '- No release notes'}`,
    parse_mode: 'markdown',
  })

  const form = new FormData()
  const buffer = fs.readFileSync(filePath)
  form.append('chat_id', chatId)
  form.append('document', new Blob([buffer]), assetName || filePath.split('/').pop())

  await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, form)
}

async function sendFirebaseMessage(): Promise<void> {
  const firebaseServiceAccountKeyBase64 = core.getInput('firebase-service-account-key')
  const firebaseTopic = core.getInput('firebase-topic')
  const appName = core.getInput('app-name')

  if (!firebaseServiceAccountKeyBase64 || !firebaseTopic || !appName || !tag) {
    return
  }

  core.info(`🔔 Sending Firebase message to topic '${firebaseTopic}'`)

  const firebaseServiceAccountKey = JSON.parse(
    Buffer.from(firebaseServiceAccountKeyBase64, 'base64').toString('utf-8'),
  ) as string

  const firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(firebaseServiceAccountKey as admin.ServiceAccount),
  })

  await firebaseAdmin.messaging().send({
    topic: firebaseTopic,
    data: {
      name: appName,
      version: tag.replace('v', ''),
    },
  })
}

async function generateReleaseNotes(): Promise<string> {
  const execAsync = util.promisify(exec)

  // Get old and new version tag or commit
  const { stdout: tags } = await execAsync(
    "git for-each-ref --sort=-creatordate --format '%(refname:short)' --count 2 refs/tags",
  )

  const { stdout: initialCommit } = await execAsync('git rev-list --max-parents=0 HEAD')
  const [newVersion, oldVersion = initialCommit.trim()] = tags.trim().split('\n')
  core.info(`Found recent tags: '${newVersion}' (latest), '${oldVersion}' (previous)`)

  if (newVersion !== tag) {
    throw new Error(`⚠️ Latest tag '${newVersion}' does not match with current tag '${tag}'`)
  }

  // Get commit messages until old version
  const { stdout: commitMessagesString } = await execAsync(
    `git --no-pager log ${oldVersion}...${newVersion} --pretty=format:%s`,
  )

  let commitMessages = commitMessagesString.split('\n').reverse()

  // Filter duplicate and release commit messages
  commitMessages = commitMessages
    .filter((commitMessage, index) => commitMessages.indexOf(commitMessage) === index)
    .filter((commitMessage) => !commitMessage.startsWith('Chore: Release'))

  // Define order and replacement of semantic prefixes
  const commitPrefixMapping: Record<string, string> = {
    Feat: 'Features',
    Fix: 'Fixes',
    Docs: 'Documentation',
    Test: 'Tests',
    Refactor: 'Refactoring',
    Style: 'Style',
    Chore: 'Chore',
    Misc: 'Miscellaneous',
  }

  // Group commits by their semantic prefix
  const groupedCommits = commitMessages.reduce((acc: Record<string, string[]>, commit: string) => {
    let [prefix, message]: string[] = commit.split(':').map((str) => str.trim())

    if (!message) {
      message = prefix
      prefix = 'Miscellaneous'
    }

    if (!commitPrefixMapping[prefix]) {
      prefix = 'Misc'
    }

    acc[prefix] = [...(acc[prefix] ?? []), `- ${message}`]
    return acc
  }, {})

  // Sort groups, map to strings and join to final output
  return Object.entries(groupedCommits)
    .sort(([prefixA], [prefixB]) => {
      const semanticPrefixes = Object.keys(commitPrefixMapping)
      return semanticPrefixes.indexOf(prefixA) - semanticPrefixes.indexOf(prefixB)
    })
    .map(([prefix, commits]) => `**${commitPrefixMapping[prefix]}:**\n${commits.join('\n')}`)
    .join('\n\n')
}

function getAsset(path: string, name?: string): Asset {
  return {
    name: name ?? basename(path),
    mime: mime.getType(path) ?? 'application/octet-stream',
    size: lstatSync(path).size,
    file: readFileSync(path),
  }
}
