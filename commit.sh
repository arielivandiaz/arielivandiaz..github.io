#!/bin/sh 
# Run: > sh commit.sh 'This is a commit description/message' 
# Autor: Ariel Ivan Diaz 
# URL: www.arielivandiaz.com
# Gist URL: https://gist.github.com/arielivandiaz/9eeb8e1537c0bdc64ed2d9656dc28612
git status 
git add -A
git commit -m '$1'
git push  origin master

