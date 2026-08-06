#!/bin/sh
set -e

python <<'EOF'
import os
import sys
import time

import psycopg2

host = os.environ["DB_HOST"]
port = os.environ.get("DB_PORT", "5432")
name = os.environ["DB_NAME"]
user = os.environ["DB_USER"]
password = os.environ["DB_PASSWORD"]

for attempt in range(30):
    try:
        psycopg2.connect(host=host, port=port, dbname=name, user=user, password=password).close()
        break
    except psycopg2.OperationalError:
        print(f"Waiting for database at {host}:{port}... ({attempt + 1}/30)")
        time.sleep(1)
else:
    sys.exit("Database not reachable, giving up.")
EOF

if [ "$DJANGO_SETTINGS_MODULE" = "config.settings.prod" ]; then
    python manage.py check --deploy --tag security --fail-level WARNING
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
