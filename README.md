# GitHub Release Action

A GitHub Action that creates a GitHub release with automatically generated release notes from semantic commit messages.
Also an asset can be uploaded and attached to the newly created GitHub release.

## Usage

Here is an example how to use this action:

```yaml  
- name: Upload release
  uses: yakuhzi/github-release@v2
  with:
    file: /path/to/asset.ext
    changelog: /path/to/CHANGELOG.txt
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
