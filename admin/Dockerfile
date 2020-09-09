FROM node:14.9.0-strech

WORKDIR /app

COPY . .

RUN mkdir -p data/database && mkdir -p data/instances
RUN npm install

CMD ["npm", "start"]
