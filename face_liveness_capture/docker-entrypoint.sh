#!/bin/bash
set -e

# Function to wait for database
wait_for_postgres() {
    local db_host=${DATABASE_HOST:-db}
    local db_port=${DATABASE_PORT:-5432}
    
    echo "Waiting for PostgreSQL at ${db_host}:${db_port}..."
    while ! nc -z "${db_host}" "${db_port}"; do
        sleep 1
    done
    echo "PostgreSQL is ready!"
}

# Wait for database if configured
if [ "${DATABASE_ENGINE}" = "django.db.backends.postgresql" ]; then
    wait_for_postgres
fi

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Create superuser if not exists (optional)
if [ "${CREATE_SUPERUSER}" = "true" ]; then
    python manage.py shell << END
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print("Superuser created successfully")
else:
    print("Superuser already exists")
END
fi

# Execute the main command
echo "Starting application..."
exec "$@"
