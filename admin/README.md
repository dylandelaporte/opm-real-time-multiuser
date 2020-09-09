## Deploy
```bash
mkdir -p data
env DATA_DIR=`pwd`/data docker run --name opre-software-admin -v /var/run/docker.sock:/var/run/docker.sock -p 80:80 -d opre-software-admin:latest
docker logs -f opre-software-admin
```
