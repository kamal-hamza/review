# frontend.Dockerfile
FROM node:18-alpine AS deps

WORKDIR /app

COPY frontend .

RUN yarn install
RUN yarn run build

EXPOSE 3000
CMD ["yarn", "start"]
