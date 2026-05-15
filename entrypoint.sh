#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npm run seed

echo ""
echo "=========================================="
echo "  App running at: http://localhost:3000"
echo "  Dashboard:       http://localhost:3000/dashboard"
echo "  Reminder engine: http://localhost:3000/api/reminders?today=2026-05-15"
echo "=========================================="
echo ""
exec node server.js
