#!/bin/bash

IMAGE_NAME=opre-software-core/core
CONTAINER_NAME=$IMAGE_NAME

docker build -t "$IMAGE_NAME" .
docker stop "$CONTAINER_NAME" || true && docker rm "$CONTAINER_NAME" || true
docker run --name "$CONTAINER_NAME" -p 3000:3000 -p 5000:5000 "$IMAGE_NAME"