#!/bin/bash
# Actions requires a node_modules dir https://github.com/actions/toolkit/blob/master/docs/javascript-action.md#publish-a-releasesv1-action
# It is recommended not to check these in https://github.com/actions/toolkit/blob/master/docs/action-versioning.md#recommendations

git checkout -b releases/v1
rm -rf node_modules
npm install --production
git add -f node_modules
npm run build
git add -f dist
git commit -m "update node_modules & dist"
git push -f origin releases/v1

git push origin :refs/tags/v1
git tag -fa v1
git push origin v1
git checkout master
git branch -D releases/v1
