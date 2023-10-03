# GitHub Release Action

A GitHub Action that creates a GitHub release with automatically generated release notes from semantic commit messages.
Also, a file can be uploaded and attached to the newly created GitHub release.

## Usage

Here is an example how to use this action:

```yaml  
- name: Create GitHub release
  uses: yakuhzi/github-release@v2
  with:
    file: /path/to/file.ext
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
