#!/bin/bash

# Set your commit message
COMMIT_MESSAGE="Your custom commit message here"

# Add all changes
git add -A

# Commit with the specified message
git commit -m "$COMMIT_MESSAGE"

# Push to the main branch
git push origin main
