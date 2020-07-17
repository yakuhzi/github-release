import { setFailed } from '@actions/core/lib/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import { lstatSync, readFileSync } from 'fs'
import { getType } from 'mime'
import { basename } from 'path'
import { Asset } from './asset'
import { Release } from './release'

const octokit = github.getOctokit(process.env.GITHUB_TOKEN!)
run()

async function run(): Promise<void> {
  try {
    if (!process.env.GITHUB_REF?.startsWith('refs/tags/')) {
      throw new Error('A tag is required for GitHub Releases')
    }

    let changelog: string | undefined
    const changelogPath = process.env.INPUT_CHANGELOG

    if (changelogPath) {
      changelog = fs.readFileSync(replaceEnvVariables(changelogPath), 'utf8')
    }

    const release = await createGithubRelease(changelog)
    const assetPath = process.env.INPUT_FILE

    if (assetPath) {
      const asset = getAsset(replaceEnvVariables(assetPath))
      await uploadAsset(release, asset)
    }

    console.log(`Release uploaded to ${release.html_url}`)
  } catch (error) {
    setFailed(error.message)
  }
}

async function createGithubRelease(changelog?: string): Promise<Release> {
  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')
  const tag = process.env.GITHUB_REF!.split('/')[2]

  const response = await octokit.repos.createRelease({
    owner,
    repo,
    tag_name: tag,
    name: tag,
    body: changelog,
    draft: false,
    prerelease: false,
  })

  return response.data
}

function getAsset(path: string): Asset {
  return {
    name: basename(path),
    mime: getType(path) || 'application/octet-stream',
    size: lstatSync(path).size,
    file: readFileSync(path),
  }
}

async function uploadAsset(release: Release, asset: Asset): Promise<any> {
  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')

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
    data: asset.file as unknown as string,
  })
}

function replaceEnvVariables(path: string): string {
  return path
    .replace(/\$GITHUB_WORKSPACE/g, process.env.GITHUB_WORKSPACE!)
    .replace(/\$HOME/g, process.env.HOME!)
}
