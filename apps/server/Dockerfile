FROM node:20-alpine
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @ruoyi-modern/server prisma:generate
RUN pnpm --filter @ruoyi-modern/server build

WORKDIR /app/apps/server
EXPOSE 3000
CMD ["pnpm", "start"]