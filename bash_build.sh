echo "Running TypeScript build..."
npx tsc

echo "Restarting Docker container..."
docker restart "$CONTAINER_NAME"

echo "Deployment completed successfully."