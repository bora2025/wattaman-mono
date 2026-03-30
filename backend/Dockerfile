FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (--ignore-scripts to skip postinstall prisma generate before schema is copied)
RUN npm install --ignore-scripts --legacy-peer-deps

# Copy source code and prisma schema
COPY . ./

# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

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
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

ENV NODE_ENV=production

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss || true; node prisma/seed-prod.js; node dist/main"]
