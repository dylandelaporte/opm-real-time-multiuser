opre-software-gui
=================

This project consists of the graphical user interface to configure and use the OPRE (OPM Real-time Edition) system.
It is independent from the core and device project.

After installation, when reaching the interface, an form will ask to enter the address on the server executing the core module.

## Production environment
```$bash
docker pull dyde/opre-software-gui
docker run --rm --name opre-software-gui -p 80:80 -d dyde/opre-software-gui
docker logs -f opre-software-gui
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
docker buildx build --platform linux/amd64,linux/arm64,linux/arm/v7 -t dyde/opre-software-gui:latest --push .
```

For basic tests and modifications on the code it is possible to mount a specific file or directory
```$bash
docker run --rm --name opre-software-gui -p 80:80 -v ${PWD}/content:/usr/share/nginx/html -i -t dyde/opre-software-gui:latest
```