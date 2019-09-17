import { GitHub } from '@actions/github'
import { setFailed } from '@actions/core/lib/core'
import { ReposGetReleaseByTagResponse } from '@octokit/rest'
import { Asset } from './asset'
import { basename } from 'path'
import { getType } from 'mime'
import * as fs from 'fs'
import { lstatSync, readFileSync } from 'fs'

export class Uploader {
  github = new GitHub(process.env.GITHUB_TOKEN!)

  run = async (): Promise<void> => {
    try {
      if (!process.env.GITHUB_REF!.startsWith('refs/tags/')) {
        throw new Error('A tag is required for GitHub Releases')
      }

      const release = await this.getRelease()
      const path = process.env.INPUT_FILE

      if (path) {
        const asset = this.getAsset(this.replaceEnvVariables(path))
        await this.uploadAsset(release.upload_url, asset)
      }

      const changelogPath = process.env.INPUT_CHANGELOG

      if (changelogPath) {
        const changelog = fs.readFileSync(this.replaceEnvVariables(changelogPath), 'utf8')
        this.setChangelog(release, changelog)
      }

      console.log(`Release uploaded to ${release.html_url}`)
    } catch (error) {
      console.log(error)
      setFailed(error.message)
    }
  }

  private getRelease = async (): Promise<ReposGetReleaseByTagResponse> => {
    const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')
    const tag = process.env.GITHUB_REF!.replace('refs/tags/', '')

    const response = await this.github.repos.getReleaseByTag({
      owner,
      repo,
      tag
    })

    return response.data
  }

  private getAsset = (path: string): Asset => {
    return new Asset(
      basename(path),
      getType(path) || 'application/octet-stream',
      lstatSync(path).size,
      readFileSync(path)
    )
  }

  private uploadAsset = async (url: string, asset: Asset): Promise<any> => {
    return this.github.repos.uploadReleaseAsset({
      url,
      headers: {
        'content-length': asset.size,
        'content-type': asset.mime
      },
      name: asset.name,
      file: asset.file
    })
  }

  private setChangelog = async (release: ReposGetReleaseByTagResponse, changelog: string): Promise<any> => {
    const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/')

    return this.github.repos.updateRelease({
      owner,
      repo,
      release_id: release.id,
      body: changelog
    })
  }

  private replaceEnvVariables = (path: string): string => {
    return path
      .replace(/$GITHUB_WORKSPACE/g, process.env.GITHUB_WORKSPACE!)
      .replace(/$HOME/g, process.env.HOME!)
  }
}
