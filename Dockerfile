FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY backend/package.json backend/package-lock.json ./

# Install all dependencies (--ignore-scripts to skip postinstall prisma generate before schema is copied)
RUN npm install --ignore-scripts --legacy-peer-deps

# Copy source code and prisma schema
COPY backend/ ./

# Generate Prisma client
RUN ./node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# Build NestJS
RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

ENV NODE_ENV=production

EXPOSE 3001

CMD ["sh", "-c", "./node_modules/.bin/prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss || true; node dist/main"]
