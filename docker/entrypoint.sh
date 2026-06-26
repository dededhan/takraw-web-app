#!/bin/sh
set -e

echo "Running entrypoint tasks..."

# Cache configuration, routes, and views for production performance
echo "Caching Laravel bootstrap..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force

# Start PHP-FPM in background
echo "Starting PHP-FPM..."
php-fpm -D

# Start Nginx in foreground
echo "Starting Nginx..."
exec nginx -g "daemon off;"
