#!/bin/bash

# Exit immediately if a command fails
set -e

export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

nvm use 18

export PATH=/home/rijal/.nvm/versions/node/v18.18.2/bin/node:$PATH

PROJECT_DIR="/DATA/AppData/browser-script"
CONTAINER_NAME="browser-script"
BRANCH="on-top-of-nodejs"

cd "$PROJECT_DIR"

echo "[$(date)] Starting deployment..."

# ===================== GIT domain ====================================== #

# Ensure SSH host key is accepted automatically (non-interactive)
export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new"

# Fetch latest changes
git fetch origin "$BRANCH"

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/"$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
    echo "No changes detected. Exiting."
    exit 0
fi

# ===================== End of GIT domain ====================================== #

echo "Changes detected. Pulling updates..."
git pull origin "$BRANCH"

echo "Running TypeScript build..."
npx tsc

echo "Restarting Docker container..."
docker restart "$CONTAINER_NAME"

echo "Deployment completed successfully."