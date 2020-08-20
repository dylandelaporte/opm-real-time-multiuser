opre-software-device
====================

## Production environment
The ip address let the service connect to the core of the project.

### Foreground
```$bash
docker pull dyde/opre-software-gui
docker run --rm --name opre-software-device --privileged -v /dev:/dev --network="host" -i -t dyde/opre-software-device:latest <SERVER_ADDRESS> <PORT>
```

### Background
```$bash
docker pull dyde/opre-software-gui
docker run --rm --name opre-software-device --privileged -v /dev:/dev --network="host" -d dyde/opre-software-device:latest <SERVER_ADDRESS> <PORT>
docker logs -f opre-software-device
```

### service
```$bash
sudo cp opre-software-device.service /etc/systemd/system
sudo systectmctl enable opre-software-service
```

## Development environment
This image might be used on different architectures, I used the experimental feature of Docker: buildx which handles cross-building using qemu.
Please feature enable experimental features on your Docker CLI.

```$bash
#When your builder does not exist yet
docker buildx create --name opre-software-builder --use
docker buildx inspect --bootstrap

#When your builder is already created and you want to switch on it
docker buildx use opre-software-builder
```

The command to build and push to the repository a new image is as follow for amd64, arm64 and armv7 architecture.
```$bash
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t dyde/opre-software-device:latest --push .
```

For basic tests and modifications on the code it is possible to mount a specific file or directory
```$bash
docker run --rm --name opre-software-device --privileged -v /dev:/dev -v ${PWD}/index.js:/app/index.js --network="host" --entrypoint="sh" -i -t dyde/opre-software-device:latest
```