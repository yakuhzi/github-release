#!/bin/bash
# Actions requires a node_modules dir https://github.com/actions/toolkit/blob/master/docs/javascript-action.md#publish-a-releasesv1-action
# It is recommended not to check these in https://github.com/actions/toolkit/blob/master/docs/action-versioning.md#recommendations

git checkout -b releases/v1 # If this branch already exists, omit the -b flag
rm -rf node_modules
sed -i '/node_modules/d' .gitignore # Bash command that removes node_modules from .gitignore
npm install --production
git add node_modules .gitignore
git commit -m node_modules
git push origin releases/v1

git push origin :refs/tags/v1
git tag -fa v1 -m "Update v1 tag"
git push origin v1
