#!/bin/bash

IMAGE_NAME=opre-software-gui/gui
CONTAINER_NAME=$IMAGE_NAME

docker build -t "$IMAGE_NAME" .
docker stop "$CONTAINER_NAME" || true && docker rm "$CONTAINER_NAME" || true
docker run --name "$CONTAINER_NAME" -v "$(pwd)"/content:/usr/share/nginx/html:ro -p 80:80 "$IMAGE_NAME"