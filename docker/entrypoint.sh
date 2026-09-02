#!/bin/sh
set -e

echo "Running entrypoint tasks..."

# Ensure /run/nginx directory exists
mkdir -p /run/nginx /var/run /var/log/nginx

# Ensure database directory and sqlite exist if using default sqlite
mkdir -p /var/www/html/database
if [ ! -f "/var/www/html/database/database.sqlite" ]; then
    touch /var/www/html/database/database.sqlite
fi
chmod 666 /var/www/html/database/database.sqlite 2>/dev/null || true

# Ensure proper storage & cache permissions
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache /var/www/html/database 2>/dev/null || true
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

# Cache configuration, routes, and views for production performance
echo "Caching Laravel bootstrap..."
php artisan config:cache || echo "Config caching skipped/failed."
php artisan route:cache || echo "Route caching skipped/failed."
php artisan view:cache || echo "View caching skipped/failed."
php artisan event:cache || echo "Event caching skipped/failed."

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force || echo "Migration warning: could not run migrations immediately."

# Start PHP-FPM in background
echo "Starting PHP-FPM..."
php-fpm -D

# Start Nginx in foreground
echo "Starting Nginx..."
exec nginx -g "daemon off;"
