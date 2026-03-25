# Attendance System

A modernized school attendance system using QR codes.

## Project Structure

- `apps/web`: Next.js frontend for admin and student portals
- `apps/mobile`: React Native app for teacher scanning
- `apps/api`: NestJS backend
- `packages/shared`: Common types, utils, validation schemas
- `packages/database`: Prisma ORM models and migrations

## Tech Stack

- Frontend: Next.js + TypeScript + Tailwind CSS
- Mobile: React Native (Expo)
- Backend: NestJS + TypeScript
- Database: PostgreSQL + Redis
- Authentication: NextAuth.js
- Real-time: Socket.io
- Deployment: Docker + Kubernetes

## Features

- Teacher dashboard with QR scanning
- Offline support
- Real-time updates
- Admin analytics
- Student portal
- Parent notifications

## Getting Started

1. Set up the monorepo with Turborepo.
2. Design the database schema using Prisma.
3. Build authentication with NextAuth.js.
4. Develop mobile scanner with React Native.
5. Create dashboards with Next.js.
6. Implement real-time sync.
7. Add notifications and analytics.