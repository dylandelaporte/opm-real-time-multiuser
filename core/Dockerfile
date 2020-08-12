FROM alpine:3.11

WORKDIR /app

RUN apk add --update nodejs nodejs-npm eudev-dev

COPY package.json .
RUN npm install && mkdir -p projects

COPY . .

VOLUME /app/projects

EXPOSE 5000
EXPOSE 3000

ENTRYPOINT ["node", "index.js"]