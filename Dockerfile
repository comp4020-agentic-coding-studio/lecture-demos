# syntax = docker/dockerfile:1

# The image Fly builds and runs: build the SvelteKit app with adapter-node,
# then keep the server bundle, its migrations and its one native dependency.

# NODE_VERSION and the pnpm version mirror mise.toml, which Docker cannot
# read: bump them together
ARG NODE_VERSION=24.21.0

FROM node:${NODE_VERSION}-trixie-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.9.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# the /readme/ page bundles README.md at build time
COPY . .
RUN pnpm build && pnpm prune --prod

FROM node:${NODE_VERSION}-trixie-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/build build
# applied at boot (src/lib/server/db/index.ts)
COPY --from=build /app/drizzle drizzle

# no `USER node`: Fly mounts the /data volume owned by root, and the SQLite
# file lives there

# fly.toml's internal_port
ENV PORT=4321
EXPOSE 4321
CMD ["node", "build"]
