# Multi-stage build compatible with linux/amd64 and linux/arm64 (Raspberry Pi 3/4/5)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/build ./build

RUN mkdir -p /data/static-sites

ENV PORT=5500
ENV HOST=0.0.0.0
ENV DATA_DIR=/data/static-sites

EXPOSE 5500

CMD ["node", "build"]
