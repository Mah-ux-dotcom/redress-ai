# REDRESS × Apertus — one container: the built web app plus the Apertus proxy.
# Build time needs npm packages; runtime needs only Node and the LLM endpoint.

ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY src/package.json src/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY src/ ./
# mock = in-browser stand-in, apertus = real Apertus through the proxy, off = rules only
ARG APERTUS_MODE=apertus
RUN npm test && VITE_APERTUS_MODE=${APERTUS_MODE} npm run build

FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production \
    STATIC_DIR=/app/dist \
    APERTUS_PROXY_HOST=0.0.0.0 \
    APERTUS_PROXY_PORT=8080
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/apertus-proxy.mjs ./server/apertus-proxy.mjs
COPY --from=build /app/package.json ./package.json
USER node
EXPOSE 8080
CMD ["node", "server/apertus-proxy.mjs"]
