# syntax=docker/dockerfile:1
# Imagen de producción multi-stage (output: "standalone").
# La imagen es independiente del entorno: dominio, base de datos y secretos
# llegan en runtime por variables de entorno (ver .env.example y template.manifest.json).
# Se construye en la máquina de desarrollo o donde lo pida Kode (instancias de la plantilla).

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
 && npm run build:lifecycle \
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
LABEL org.opencontainers.image.title="jewelry-store" \
      org.opencontainers.image.description="Plantilla jewelry-store de Kodecol (ver template.manifest.json)" \
      org.opencontainers.image.revision=$BUILD_SHA
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Ciclo de vida de la plantilla (migrate, brand:apply, seed) y su contrato.
COPY --from=build --chown=nextjs:nodejs /app/dist/lifecycle.mjs ./lifecycle.mjs
COPY --from=build --chown=nextjs:nodejs /app/template.manifest.json /app/brand.schema.json ./
COPY --from=build --chown=nextjs:nodejs /app/examples ./examples
COPY --from=build --chown=nextjs:nodejs /app/brands ./brands
# Caché de next/image (optimización de fotos): debe ser escribible por el usuario de la app.
RUN mkdir -p .next/cache && chown nextjs:nodejs .next/cache
# Fotos subidas sin Cloudinary (MEDIA_DIR): se monta un volumen por instancia.
RUN mkdir -p /data/media && chown nextjs:nodejs /data/media
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
