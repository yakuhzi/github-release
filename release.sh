#!/bin/bash

# Major tag version
VERSION="v4"

# Install
git checkout -b releases/$VERSION
rm -rf node_modules dist
npm install
npm run build

# Push tag
git add -f node_modules dist
git commit -m "Chore: Update $VERSION"
git push -f origin releases/$VERSION
git push origin :refs/tags/$VERSION
git tag -f $VERSION
git push origin $VERSION

# Cleanup
git checkout main
git branch -D releases/$VERSION
npm install
