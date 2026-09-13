FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install -g pnpm && pnpm install

COPY . .

# Assume Prisma client is already generated in the shared volume or we generate it here
CMD npx prisma generate --schema=/usr/src/app/backend-data/schema.prisma && pnpm run start
