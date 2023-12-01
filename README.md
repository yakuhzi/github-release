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
    asset_name: file.ext
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Make sure to fetch the whole repository history, otherwise release notes can't be generated properly:

```yaml  
- name: Checkout
  uses: actions/checkout@main
  with:
    fetch-depth: 0
```
