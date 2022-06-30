FROM node:16.10.0-alpine

COPY ./ ./app
WORKDIR /app


RUN apk add --no-cache git bash curl openssl py-pip make g++ && \
  curl -sfL https://install.goreleaser.com/github.com/tuananh/node-prune.sh | sh && \
  npm install node-dev -g && npm cache clean --force

COPY package*.json ./
COPY docker ./docker

RUN chmod +x ./docker/node-modules-clean.sh

RUN npm ci && npm cache clean --force && \
  ./docker/node-modules-clean.sh && \
  npm dedupe && \
  rm -f .npmrc

ENTRYPOINT npm run start:dev
