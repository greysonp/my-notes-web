#!/bin/bash
git checkout gh-pages
git merge master
rm .gitignore
bower install
git add -A
git commit -m "Deploy"
git push origin gh-pages
git checkout master
