#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npm run seed

echo "Starting application..."
exec node server.js
