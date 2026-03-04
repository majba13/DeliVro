FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY tsconfig.base.json ./
RUN npm ci
RUN npm run build -w @delivro/api-gateway

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY tsconfig.base.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/services/api-gateway/dist ./services/api-gateway/dist
EXPOSE 4000
CMD ["node", "services/api-gateway/dist/server.js"]
