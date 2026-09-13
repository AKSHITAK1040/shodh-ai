FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9 && pnpm install

COPY prisma ./prisma/
RUN pnpm exec prisma generate

COPY . .
RUN pnpm run build

EXPOSE 3000
CMD ["pnpm", "run", "start:prod"]
