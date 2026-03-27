FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* turbo.json ./

# Copy workspace package.json files
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/

# Install all dependencies (--ignore-scripts to skip postinstall prisma generate before schema is copied)
RUN npm install --ignore-scripts

# Copy source code
COPY packages/database/ packages/database/
COPY apps/api/ apps/api/

# Now run postinstall scripts (e.g. esbuild binary setup)
RUN npm rebuild

# Generate Prisma client
RUN npx prisma generate --schema=packages/database/schema.prisma

# Build database package then API
RUN npm run --workspace=packages/database build
RUN npm run --workspace=apps/api build

# --- Production stage ---
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json* /app/turbo.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

ENV NODE_ENV=production

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --schema=packages/database/schema.prisma --skip-generate --accept-data-loss && node apps/api/dist/main"]
