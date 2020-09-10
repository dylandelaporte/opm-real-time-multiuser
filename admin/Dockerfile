FROM node:14.10.0-stretch

RUN curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add -
RUN add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable"

RUN apt-get update && apt-get install docker-ce

WORKDIR /app

COPY . .

RUN mkdir -p data/database && mkdir -p data/instances
RUN npm install

CMD ["npm", "start"]
