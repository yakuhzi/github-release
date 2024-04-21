import { setFailed } from '@actions/core/lib/core'
import * as github from '@actions/github'
import * as core from '@actions/core'
import { Release } from './release'
import { Asset } from './asset'
import fs, { lstatSync, readFileSync } from 'fs'
import { basename } from 'path'
import * as util from 'util'
import { exec } from 'child_process'
import axios from 'axios'
import { getType } from 'mime'

const octokit = github.getOctokit(process.env.GITHUB_TOKEN!)
run()

async function run(): Promise<void> {
  try {
    if (!process.env.GITHUB_REF?.startsWith('refs/tags/')) {
      throw new Error('⚠️ GitHub Releases requires a tag')
    }

    const release = await createGithubRelease()
    await uploadAsset(release)
    await sendAssetOverTelegram(release)
    await sendFirebaseMessage()

    console.log(`🚀 Release ready at ${release.html_url}`)
  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message)
    } else {
      setFailed(`⚠️ Unexpected error: '${error}'`)
    }
  }
}

async function createGithubRelease(): Promise<Release> {
  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')
  const tag = process.env.GITHUB_REF!.split('/')[2]
  const releaseNotes = await generateReleaseNotes()
  console.log(`👨‍🏭 Creating new GitHub release for tag '${tag}'`)

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
  const filePath = core.getInput('file') || process.env.INPUT_FILE
  const assetName = core.getInput('asset-name') || process.env.INPUT_ASSET_NAME

  if (!filePath || !assetName) {
    return
  }

  const asset = getAsset(filePath, assetName)
  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')

  console.log(`⬆️ Uploading asset '${asset.name}'`)
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
  const filePath = core.getInput('file') || process.env.INPUT_FILE
  const assetName = core.getInput('asset-name') || process.env.INPUT_ASSET_NAME
  const botToken = core.getInput('bot-token') || process.env.INPUT_BOT_TOKEN
  const chatId = core.getInput('chat-id') || process.env.INPUT_CHAT_ID

  if (!filePath || !botToken || !chatId) {
    return
  }

  console.log(`📧️ Sending asset to Telegram chat '${chatId}'`)

  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: `*Release ${release.name}*\n\n${release.body}`,
    parse_mode: 'markdown',
  })

  const form = new FormData()
  const buffer = fs.readFileSync(filePath)
  form.append('chat_id', chatId)
  form.append('document', new Blob([buffer]), assetName ?? filePath.split('/').pop())

  await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, form)
}

async function sendFirebaseMessage(): Promise<void> {
  const firebaseServerKey = core.getInput('firebase-server-key') || process.env.INPUT_FIREBASE_SERVER_KEY
  const firebaseTopic = core.getInput('firebase-topic') || process.env.INPUT_FIREBASE_TOPIC
  const appName = core.getInput('app-name') || process.env.INPUT_APP_NAME
  const tag = process.env.GITHUB_REF!.split('/')[2]

  if (!firebaseServerKey || !firebaseTopic || !appName || !tag) {
    return
  }

  console.log(`🔔 Sending Firebase message to topic '${firebaseTopic}'`)
  await axios.post('https://fcm.googleapis.com/fcm/send', {
    to: `/topics/${firebaseTopic}`,
    data: {
      name: appName,
      version: tag.replace('v', ''),
    },
  }, {
    headers: {
      'Authorization': `key=${firebaseServerKey}`,
      'Content-Type': 'application/json',
    },
  })
}

async function generateReleaseNotes(): Promise<string> {
  const execAsync = util.promisify(exec)

  // Get old and new version tag or commit
  const { stdout: tags } = await execAsync(
    'git for-each-ref --sort=-authordate --format \'%(refname:short)\' --count 2 refs/tags',
  )
  const { stdout: initialCommit } = await execAsync('git rev-list --max-parents=0 HEAD')
  const [newVersion, oldVersion = initialCommit.trim()] = tags.trim().split('\n')

  if (newVersion !== process.env.GITHUB_REF!.split('/')[2]) {
    throw new Error('⚠️ Latest tag does not match with current tag')
  }

  // Get commit messages until old version
  const { stdout: commitMessagesString } = await execAsync(
    `git --no-pager log ${oldVersion}...${newVersion} --pretty=format:%s`,
  )
  let commitMessages = commitMessagesString.split('\n').reverse()

  // Filter duplicate and release commit messages
  commitMessages = commitMessages
    .filter((commitMessage, index) => commitMessages.indexOf(commitMessage) == index)
    .filter(commitMessage => !commitMessage.startsWith('Chore: Release'))

  // Define order and replacement of semantic prefixes
  const commitPrefixMapping: { [key: string]: string } = {
    'Feat': 'Features',
    'Fix': 'Fixes',
    'Docs': 'Documentation',
    'Test': 'Tests',
    'Refactor': 'Refactoring',
    'Style': 'Style',
    'Chore': 'Chore',
    'Misc': 'Miscellaneous',
  }

  // Group commits by their semantic prefix
  const groupedCommits = commitMessages
    .reduce((acc: { [key: string]: string[] }, commit: string) => {
      let [prefix, message]: string[] = commit.split(':').map(str => str.trim())

      if (!message) {
        message = prefix
        prefix = 'Miscellaneous'
      }

      if (!commitPrefixMapping[prefix]) {
        prefix = 'Misc'
      }

      acc[prefix] = [...(acc[prefix] || []), `- ${message}`]
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
  if (!name || name.length == 0) {
    name = basename(path)
  }

  return {
    name,
    mime: getType(path) || 'application/octet-stream',
    size: lstatSync(path).size,
    file: readFileSync(path),
  }
}
