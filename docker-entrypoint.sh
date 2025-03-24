#!/bin/sh
set -e

# Create keystore file from environment variable if provided
if [ -n "$KEEPER_KEYSTORE" ] && [ -n "$KEYSTORE_FILE" ]; then
    echo "Creating keystore file from parameter store..."
    mkdir -p "$(dirname "$KEEPER_KEYSTORE")"
    echo "$KEYSTORE_FILE" > "$KEEPER_KEYSTORE"
    echo "Keystore file created at $KEEPER_KEYSTORE"
fi

# Set default values for 1inch API variables
ONEINCH_API=${ONEINCH_API:-"https://api.1inch.io/v6.0"}
ONEINCH_API_KEY=${ONEINCH_API_KEY:-""}

# Generate .env file for dotenv with only ONEINCH_API variables
echo "Generating .env file with ONEINCH_API variables..."
cat > /app/.env << EOF
ONEINCH_API=${ONEINCH_API}
ONEINCH_API_KEY=${ONEINCH_API_KEY}
EOF

echo ".env file generated at /app/.env"

# Generate the conf.ts file from CONF_GENERIC
if [ -z "$CONF_GENERIC" ]; then
    echo "ERROR: CONF_GENERIC is not provided. Cannot continue without configuration."
    exit 1
fi

echo "Generating conf.ts from generic configuration..."
echo "$CONF_GENERIC" > /app/conf.ts
echo "Generic configuration file generated at /app/conf.ts"

# Check if KEYSTORE_PASSWORD is set (even if empty)
if [ "${KEYSTORE_PASSWORD+x}" = "x" ]; then
    # Pipe the password (which might be empty) to the application
    echo "$KEYSTORE_PASSWORD" | yarn start --config conf.ts
else
    # No password variable set, run normally
    yarn start --config conf.ts
fi
