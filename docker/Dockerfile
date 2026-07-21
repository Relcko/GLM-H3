FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9 --activate

FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --offline
RUN pnpm build:packages

FROM base AS development
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "dev"]
