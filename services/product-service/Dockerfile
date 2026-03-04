FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY tsconfig.base.json ./
RUN npm ci
RUN npm run build -w @delivro/product-service

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY tsconfig.base.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/services/product-service/dist ./services/product-service/dist
EXPOSE 4002
CMD ["node", "services/product-service/dist/server.js"]
