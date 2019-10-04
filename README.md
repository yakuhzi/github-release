# Action Releases

A GitHub Action to upload an asset file and changelog to a GitHub release.

Usage
-------
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
