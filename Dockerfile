FROM node:22.16.0-alpine3.21 AS base
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV DATA_DIR=/app/data

CMD ["npm", "run", "start"]
