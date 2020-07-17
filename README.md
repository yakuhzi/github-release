# Release Asset

A GitHub Action that creates a GitHub release with a changelog and uploads an asset file to it.

## Deprecated
This action is deprecated, as there are now "official" alternatives to this action:  

https://github.com/actions/create-release  
https://github.com/actions/upload-release-asset

## Usage
Here is an example how to use this action:

```yaml  
- name: Upload release
  uses: yakuhzi/action-release@v1
  with:
    file: /path/to/asset.ext
    changelog: /path/to/CHANGELOG.txt
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
