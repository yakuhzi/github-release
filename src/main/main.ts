import { setFailed } from '@actions/core/lib/core'
import * as github from '@actions/github'
import { Release } from './release'
import { Asset } from './asset'
import { lstatSync, readFileSync } from 'fs'
import { getType } from 'mime'
import { basename } from 'path'
import * as util from 'util'
import { exec } from 'child_process'

const octokit = github.getOctokit(process.env.GITHUB_TOKEN!)
run()

async function run(): Promise<void> {
  try {
    if (!process.env.GITHUB_REF?.startsWith('refs/tags/')) {
      throw new Error('⚠️ GitHub Releases requires a tag')
    }

    const release = await createGithubRelease()
    const filePath = process.env.INPUT_FILE

    if (filePath) {
      const asset = getAsset(replaceEnvVariables(filePath))
      console.log(`⬆️ Uploading asset '${asset.name}'`)
      await uploadAsset(release, asset)
    }

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

async function generateReleaseNotes(): Promise<string> {
  const execAsync = util.promisify(exec)

  // Get old and new version tag or commit
  const { stdout: tags } = await execAsync(
    'git for-each-ref --sort=-authordate --format \'%(refname:short)\' --count 2 refs/tags'
  )
  const { stdout: initialCommit } = await execAsync('git rev-list --max-parents=0 HEAD')
  const [newVersion, oldVersion = initialCommit.trim()] = tags.trim().split('\n')

  if (newVersion !== process.env.GITHUB_REF!.split('/')[2]) {
    throw new Error('⚠️ Latest tag does not match with current tag')
  }

  // Get commit messages until old version
  const { stdout: commitMessages } = await execAsync(
    `git --no-pager log ${oldVersion}...${newVersion} --pretty=format:%s`
  )

  // Group commits by their semantic prefix
  const groupedCommits = commitMessages
    .split('\n')
    .reverse()
    .filter(commit => !commit.startsWith('Chore: Release'))
    .reduce((acc: { [key: string]: string[] }, commit: string) => {
      let [prefix, message]: string[] = commit.split(':').map(str => str.trim())

      if (!message) {
        message = prefix
        prefix = 'Miscellaneous'
      }

      acc[prefix] = [...(acc[prefix] || []), `- ${message}`]
      return acc
    }, {})

  // Define order and replacement of semantic prefixes
  const commitPrefixMapping: { [key: string]: string } = {
    'Feat': 'Features',
    'Fix': 'Fixes',
    'Docs': 'Documentation',
    'Test': 'Tests',
    'Refactor': 'Refactoring',
    'Style': 'Style',
    'Chore': 'Chore',
    'Miscellaneous': 'Miscellaneous'
  }

  // Sort groups, map to strings and join to final output
  return Object.entries(groupedCommits)
    .sort(([prefixA], [prefixB]) => {
      const semanticPrefixes = Object.keys(commitPrefixMapping)
      return semanticPrefixes.indexOf(prefixA) - semanticPrefixes.indexOf(prefixB)
    })
    .map(([prefix, commits]) => `**${commitPrefixMapping[prefix]}:**\n${commits.join('\n')}`)
    .join('\n\n')
}

function getAsset(path: string): Asset {
  return {
    name: basename(path),
    mime: getType(path) || 'application/octet-stream',
    size: lstatSync(path).size,
    file: readFileSync(path),
  }
}

async function uploadAsset(release: Release, asset: Asset): Promise<void> {
  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')

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

function replaceEnvVariables(path: string): string {
  return path
    .replace(/\$GITHUB_WORKSPACE/g, process.env.GITHUB_WORKSPACE!)
    .replace(/\$HOME/g, process.env.HOME!)
}
