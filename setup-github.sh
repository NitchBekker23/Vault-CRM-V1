#!/bin/bash

# Force remove Git lock
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock

# Check if we already have a remote
if git remote get-url origin 2>/dev/null; then
    echo "GitHub remote already exists"
    git remote -v
else
    echo "Please provide your GitHub repository URL (e.g., https://github.com/username/repo.git):"
    read REPO_URL
    git remote add origin "$REPO_URL"
fi

# Stage all files
git add .

# Commit changes
git commit -m "The Vault - Complete inventory management system with normalized database"

# Push to GitHub
git push -u origin main

echo "Successfully pushed to GitHub!"