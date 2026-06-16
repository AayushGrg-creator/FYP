#!/bin/bash
# server/scripts/check-env.sh
# Ensures the server has the necessary configuration before attempting to boot.

echo "--- Task Tide: Environment Integrity Check ---"

# List of required variables
REQUIRED_VARS=("MONGODB_URI" "JWT_SECRET" "PORT" "NODE_ENV")

MISSING=0

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: $var is not set."
    MISSING=1
  fi
done

if [ $MISSING -eq 1 ]; then
  echo "--- Environment validation failed. Please check your .env file. ---"
  exit 1
fi

echo " All required environment variables are set. Booting server..."
exit 0