FROM alpine:3.11

WORKDIR /app

# Install python/pip
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 build-base && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools

RUN apk add --update nodejs nodejs-npm eudev-dev bash

COPY package.json .
RUN npm install && mkdir -p projects

COPY . .

VOLUME /app/projects

EXPOSE 5000
EXPOSE 3000

ENTRYPOINT ["node", "index.js"]