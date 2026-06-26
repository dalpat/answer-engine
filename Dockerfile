# Build the standalone Node server (adapter-node), then run it.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json bun.lock* package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/drizzle ./drizzle
COPY package.json ./
EXPOSE 3000
# Migrations auto-apply on boot (see src/hooks.server.ts → runMigrations()).
CMD ["node", "build"]
