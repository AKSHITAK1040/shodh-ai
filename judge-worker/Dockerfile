FROM node:22-slim

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9 && pnpm install

COPY . .

CMD ["node", "index.js"]
