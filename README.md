# GitHub Release Action

A GitHub Action that creates a GitHub release with automatically generated release notes from semantic commit messages.
Also, a file can be uploaded and attached to the newly created GitHub release and send over Telegram.

## Usage

Here is an example how to use this action:

```yaml  
- name: Create GitHub release
  uses: yakuhzi/github-release@v3
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

To also send the asset file over Telegram, add the following environment variables:

```yaml  
bot-token: /path/to/file.ext
chat-id: 123456
```

If you also want to send the released app name and version in a Firebase message, add the following environment
variables:

```yaml
firebase-server-key: ${{ secrets.FIREBASE_SERVER_KEY }}
firebase-topic: ${{ secrets.FIREBASE_TOPIC }}
app-name: ${{ secrets.APP_NAME }}
```
