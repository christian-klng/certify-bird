FROM node:24-alpine AS base
RUN npm install -g pnpm@12.6.0
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Einmal-Container: spielt Datenbank-Migrationen ein und legt bei gesetztem
# ORG_NAME den ersten Bildungsanbieter an.
FROM builder AS migrate
CMD ["sh", "-c", "pnpm db:deploy && pnpm db:seed"]

FROM node:24-alpine AS app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
