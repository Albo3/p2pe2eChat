#!/bin/bash

# Function to check if Redis is running
check_redis() {
    if ! docker service ls | grep -q "redis_redis"; then
        echo "Redis not running, deploying..."
        docker stack deploy -c ../redis-service.yaml redis
        sleep 10
    else
        echo "Redis already running..."
    fi
}

# Stop any existing Deno dev container
if docker ps | grep -q "deno_dev"; then
    echo "Stopping existing Deno dev container..."
    docker stop deno_dev
fi



# Run Deno in development mode in the background
echo "Starting Deno development server..."
docker run -d --rm \
  --name deno_dev \
  --network traefik-public \
  -v "$(pwd):/deno/app" \
  -w /deno/app \
  -p 3000:3000 \
  -e PORT=3000 \
  -e HOST=0.0.0.0 \
  -e REDIS_URL=redis://redis:6379 \
  -e REDIS_PASSWORD=redispass \
  -e GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID} \
  -e GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET} \
  -e GITHUB_REDIRECT_URI=${GITHUB_REDIRECT_URI} \
  -e GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID} \
  -e GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET} \
  -e GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI} \
  --user "$(id -u):$(id -g)" \
  denoland/deno:ubuntu \
  bash -c "mkdir -p /deno/app/db && \
  chmod 777 /deno/app/db && \
  deno run \
  --watch \
  --allow-net \
  --allow-read \
  --allow-env \
  --allow-write \
  --allow-ffi \
  --unstable-kv \
  --unstable-broadcast-channel \
  src/main.ts"

# Follow the logs
echo "Following Deno development logs..."
docker logs -f deno_dev 