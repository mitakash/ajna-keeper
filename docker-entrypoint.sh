#!/bin/sh
set -e

# Create keystore file from environment variable if provided
if [ -n "$KEEPER_KEYSTORE" ] && [ -n "$KEYSTORE_FILE" ]; then
    echo "Creating keystore file from parameter store..."
    mkdir -p "$(dirname "$KEEPER_KEYSTORE")"
    echo "$KEYSTORE_FILE" > "$KEEPER_KEYSTORE"
    echo "Keystore file created at $KEEPER_KEYSTORE"
fi

# Set default values for environment variables
DRY_RUN=${DRY_RUN:-false}
ETH_RPC_URL=${ETH_RPC_URL:-""}
SUBGRAPH_URL=${SUBGRAPH_URL:-""}
COINGECKO_API_KEY=${COINGECKO_API_KEY:-""}
POOLS_CONF=${POOLS_CONF:-"[]"}
MULTICALL_ADDRESS=${MULTICALL_ADDRESS:-"0xcA11bde05977b3631167028862bE2a173976CA11"}
WETH_ADDRESS=${WETH_ADDRESS:-"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"}
UNISWAP_V3_ROUTER=${UNISWAP_V3_ROUTER:-"0x2626664c2603336E57B271c5C0b26F421741e481"}
MULTICALL_BLOCK=${MULTICALL_BLOCK:-5022}
DELAY_BETWEEN_RUNS=${DELAY_BETWEEN_RUNS:-15}
DELAY_BETWEEN_ACTIONS=${DELAY_BETWEEN_ACTIONS:-1}
AJNA_ERC20_POOL_FACTORY=${AJNA_ERC20_POOL_FACTORY:-"0x214f62B5836D83f3D6c4f71F174209097B1A779C"}
AJNA_ERC721_POOL_FACTORY=${AJNA_ERC721_POOL_FACTORY:-"0xeefEC5d1Cc4bde97279d01D88eFf9e0fEe981769"}
AJNA_POOL_UTILS=${AJNA_POOL_UTILS:-"0x97fa9b0909C238D170C1ab3B5c728A3a45BBEcBa"}
AJNA_POSITION_MANAGER=${AJNA_POSITION_MANAGER:-"0x59710a4149A27585f1841b5783ac704a08274e64"}
AJNA_TOKEN=${AJNA_TOKEN:-"0xf0f326af3b1Ed943ab95C29470730CC8Cf66ae47"}
AJNA_GRANT_FUND=${AJNA_GRANT_FUND:-""}
AJNA_BURN_WRAPPER=${AJNA_BURN_WRAPPER:-""}
AJNA_LENDER_HELPER=${AJNA_LENDER_HELPER:-""}

# Create a temporary file for the pools JSON
POOLS_JSON_FILE=$(mktemp)
echo "$POOLS_CONF" > "$POOLS_JSON_FILE"

# Generate config.ts file from template
echo "Generating configuration file..."
cat /app/conf.template.ts | \
    sed "s|\$DRY_RUN|${DRY_RUN}|g" | \
    sed "s|\$ETH_RPC_URL|${ETH_RPC_URL}|g" | \
    sed "s|\$SUBGRAPH_URL|${SUBGRAPH_URL}|g" | \
    sed "s|\$KEEPER_KEYSTORE|${KEEPER_KEYSTORE}|g" | \
    sed "s|\$MULTICALL_ADDRESS|${MULTICALL_ADDRESS}|g" | \
    sed "s|\$WETH_ADDRESS|${WETH_ADDRESS}|g" | \
    sed "s|\$UNISWAP_V3_ROUTER|${UNISWAP_V3_ROUTER}|g" | \
    sed "s|\$MULTICALL_BLOCK|${MULTICALL_BLOCK}|g" | \
    sed "s|\$DELAY_BETWEEN_RUNS|${DELAY_BETWEEN_RUNS}|g" | \
    sed "s|\$DELAY_BETWEEN_ACTIONS|${DELAY_BETWEEN_ACTIONS}|g" | \
    sed "s|\$AJNA_ERC20_POOL_FACTORY|${AJNA_ERC20_POOL_FACTORY}|g" | \
    sed "s|\$AJNA_ERC721_POOL_FACTORY|${AJNA_ERC721_POOL_FACTORY}|g" | \
    sed "s|\$AJNA_POOL_UTILS|${AJNA_POOL_UTILS}|g" | \
    sed "s|\$AJNA_POSITION_MANAGER|${AJNA_POSITION_MANAGER}|g" | \
    sed "s|\$AJNA_TOKEN|${AJNA_TOKEN}|g" | \
    sed "s|\$AJNA_GRANT_FUND|${AJNA_GRANT_FUND}|g" | \
    sed "s|\$AJNA_BURN_WRAPPER|${AJNA_BURN_WRAPPER}|g" | \
    sed "s|\$AJNA_LENDER_HELPER|${AJNA_LENDER_HELPER}|g" | \
    sed "s|\$COINGECKO_API_KEY|${COINGECKO_API_KEY}|g" > /app/conf.ts.tmp

# Replace the pools JSON placeholder with the actual content
sed -e "/\$POOLS_JSON/ {
    r $POOLS_JSON_FILE
    d
}" /app/conf.ts.tmp > /app/conf.ts

# Clean up temporary files
rm -f "$POOLS_JSON_FILE" /app/conf.ts.tmp

echo "Configuration file generated at /app/conf.ts"

# Check if KEYSTORE_PASSWORD is set (even if empty)
if [ "${KEYSTORE_PASSWORD+x}" = "x" ]; then
    # Pipe the password (which might be empty) to the application
    echo "$KEYSTORE_PASSWORD" | yarn start --config conf.ts
else
    # No password variable set, run normally
    yarn start --config conf.ts
fi
