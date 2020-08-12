# opre-software-core

## Production environment
```$bash
docker pull dyde/opre-software-core:latest
docker volume create opre-software
docker run --rm --name opre-software-core -p 3000:3000 -p 5000:5000 -v opre-software:/app/projects -d dyde/opre-software-core:latest
docker logs -f opre-software-core
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
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t dyde/opre-software-core:latest --push .
```

For basic tests and modifications on the code it is possible to mount a specific file or directory
```$bash
docker volume create opre-software-dev
docker run --rm --name opre-software-core -p 3000:3000 -p 5000:5000 -v opre-software:/app/projects -v ${PWD}:/app dyde/opre-software-core:latest
```

## Upcoming features
- OPM model standards
- Systems dynamic diagram