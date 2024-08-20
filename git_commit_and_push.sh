#!/bin/bash

# Prompt the user for a commit message
read -p "Enter your commit message: " COMMIT_MESSAGE

# Add all changes
git add -A

# Commit with the specified message
git commit -m "$COMMIT_MESSAGE"

# Push to the main branch
git push origin main
