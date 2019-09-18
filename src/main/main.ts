import { GitHub } from '@actions/github'
import { setFailed } from '@actions/core/lib/core'
import { Asset } from './asset'
import { basename } from 'path'
import { getType } from 'mime'
import * as fs from 'fs'
import { lstatSync, readFileSync } from 'fs'
import { Release } from './release'

const github = new GitHub(process.env.GITHUB_TOKEN!)
run()

async function run(): Promise<void> {
  try {
    if (!process.env.GITHUB_REF!.startsWith('refs/tags/')) {
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
      await uploadAsset(release.upload_url, asset)
    }

    console.log(`Release uploaded to ${release.html_url}`)
  } catch (error) {
    console.log(error)
    setFailed(error.message)
  }
}

async function createGithubRelease(changelog?: string): Promise<Release> {
  const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')
  const tag = process.env.GITHUB_REF!.split('/')[2]

  const response = await github.repos.createRelease({
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
    file: readFileSync(path)
  }
}

async function uploadAsset(url: string, asset: Asset): Promise<any> {
  return github.repos.uploadReleaseAsset({
    url,
    headers: {
      'content-length': asset.size,
      'content-type': asset.mime
    },
    name: asset.name,
    file: asset.file
  })
}

function replaceEnvVariables(path: string): string {
  return path
    .replace(/\$GITHUB_WORKSPACE/g, process.env.GITHUB_WORKSPACE!)
    .replace(/\$HOME/g, process.env.HOME!)
}