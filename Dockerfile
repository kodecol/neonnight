# syntax=docker/dockerfile:1
# Imagen de producción multi-stage (output: "standalone").
# La imagen es independiente del entorno: dominio, base de datos y secretos
# llegan en runtime por variables de entorno (ver deploy/.env.example).
# Se construye en CI (GitHub Actions) o en la máquina de desarrollo, nunca en el VPS.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# El standalone arrastra paquetes que en runtime sobran: los binarios de sharp para glibc
# (Alpine usa musl) y TypeScript (solo sirve para compilar next.config.ts en el build).
RUN npm run build \
 && cd .next/standalone/node_modules \
 && rm -rf @img/sharp-libvips-linux-x64 @img/sharp-linux-x64 @img/sharp-wasm32 typescript

FROM node:22-alpine AS runner
WORKDIR /app
ARG BUILD_SHA=dev
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_VERSION=$BUILD_SHA
LABEL org.opencontainers.image.title="neonnight-web" \
      org.opencontainers.image.revision=$BUILD_SHA
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Caché de next/image (optimización de fotos): debe ser escribible por el usuario de la app.
RUN mkdir -p .next/cache && chown nextjs:nodejs .next/cache
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
