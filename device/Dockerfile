FROM alpine:3.11

WORKDIR /app

RUN apk --update --no-cache add curl python pkgconfig\
 libusb libusb-dev curl build-base linux-headers eudev-dev\
 nodejs nodejs-npm

COPY package.json .
RUN npm install

FROM alpine:3.11

WORKDIR /app

RUN apk add --update nodejs nodejs-npm eudev-dev

COPY --from=0 /app/ .
COPY . .

ENTRYPOINT ["node", "index.js"]