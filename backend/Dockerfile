FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install

COPY prisma ./prisma/
RUN pnpm exec prisma generate

COPY . .
RUN pnpm run build

EXPOSE 3001
CMD ["pnpm", "run", "start:prod"]
