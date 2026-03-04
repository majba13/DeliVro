FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY tsconfig.base.json ./
RUN npm ci
RUN npm run build -w @delivro/delivery-service

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY tsconfig.base.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/services/delivery-service/dist ./services/delivery-service/dist
EXPOSE 4005
CMD ["node", "services/delivery-service/dist/server.js"]
