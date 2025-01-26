# ajna-keeper

## Purpose
A console application for automating interactions with the Ajna decentralized lending protocol.

## Design
- Each instance of the keeper connects to exactly one chain using a single RPC endpoint.  The same keeper instance may interact with multiple pools on that chain.
- Pool addresses must be configured.  Allowing them to be configured via token name (via subgraph) introduces risk, as a bad actor could create a pool using fake tokens with the same name.
- Each instance of the keeper may unlock only a single wallet using a JSON keystore file.  As such, if running multiple keepers on the same chain, different accounts should be used for each keeper to avoid nonce conflicts.
- For simplicity, price sources are configured per-pool, not separately for each action.  This means if you will `kick` and `arbtake` the same pool, both actions must be based upon the same configured price.

## Requirements
For each desired chain:
- A JSON-RPC endpoint is needed to query pool data and submit transactions.
- A subgraph connection is needed to iterate through buckets/borrowers/liquidations within a configured pool.
- Funds used to pay gas on that chain.
- Funds (quote token) to post liquidation bonds in each pool configured to kick.

## Features
### TODO: kick
Starts a liquidation when a loan's threshold price exceeds the lowest utilized price in the pool by a configurable percentage.

### TODO: arbtake
When auction price drops a configurable percentage below the highest price bucket, exchanges quote token in that bucket for collateral, earning a share of that bucket.

## Installation and Prerequisites
You'll need `node` and related tools (`npm`, `yarn`).  This was developed with node v18.20.x but should work with later versions.
```
yarn --frozen-lockfile
```

## Configuration
### Price sources
- [coingecko](https://www.coingecko.com/) - using their [simple price](https://docs.coingecko.com/v3.0.1/reference/simple-price) API
- **fixed** - hardcoded number, useful for stable pools
- **pool** - can use _lup_ or _htp_

If the price source only has quote token priced in collateral, you may add `"invert": true` to `price` config to invert the configured price.

## Execution
```
yarn start --config my-config.json
```

## Disclaimer
User assumes all risk of data presented and transactions placed by this keeper.
