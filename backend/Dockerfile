FROM node:22-slim

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm@9 && pnpm install

COPY prisma ./prisma/
RUN pnpm exec prisma generate

COPY . .
RUN pnpm run build

EXPOSE 3000
CMD ["pnpm", "run", "start:prod"]
