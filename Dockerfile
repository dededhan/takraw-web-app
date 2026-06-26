# Stage 1: Build React/Vite assets
FROM node:20-alpine AS assets-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build the PHP runtime
FROM php:8.3-fpm-alpine
WORKDIR /var/www/html

# Install system dependencies and PHP extensions
RUN apk add --no-cache \
    nginx \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    zip \
    libzip-dev \
    unzip \
    git \
    curl \
    oniguruma-dev \
    postgresql-dev

RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        pdo_pgsql \
        mbstring \
        zip \
        opcache \
        gd \
        bcmath

# Install Composer
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Copy application code
COPY . .

# Copy built assets from Stage 1
COPY --from=assets-builder /app/public/build ./public/build
COPY --from=assets-builder /app/public/build/manifest.json ./public/build/manifest.json

# Install composer dependencies
ENV COMPOSER_ALLOW_SUPERUSER=1
RUN composer install --no-dev --optimize-autoloader --no-interaction

# ==========================================
# PERBAIKAN STRATEGIS UNTUK RAILWAY
# ==========================================

# 1. Copy konfigurasi dari folder docker/ ke sistem lokal container
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini

# Trik cerdas: Mengubah port 80 di nginx.conf secara dinamis menggunakan variabel ${PORT} dari Railway
RUN sed -i 's/listen 80 default_server;/listen ${PORT} default_server;/g' /etc/nginx/nginx.conf
RUN sed -i 's/listen \[::\]:80 default_server;/listen \[::\]:${PORT} default_server;/g' /etc/nginx/nginx.conf

# Fix directories and permissions for Laravel storage/cache
RUN mkdir -p storage/framework/cache/data \
    && mkdir -p storage/framework/app/cache \
    && mkdir -p storage/framework/sessions \
    && mkdir -p storage/framework/views \
    && mkdir -p storage/logs \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Copy dan konfigurasikan entrypoint agar bisa dieksekusi oleh Railway
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]