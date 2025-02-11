# ajna-keeper

## Purpose

A bot to automate liquidations on the Ajna platform.

## Design

- Each instance of the keeper connects to exactly one chain using a single RPC endpoint. The same keeper instance may interact with multiple pools on that chain.
- Pool addresses must be explicitly configured.
- Each instance of the keeper may unlock only a single wallet using a JSON keystore file. As such, if running multiple keepers on the same chain, different accounts should be used for each keeper to avoid nonce conflicts.

## Requirements

For each desired chain:

- A JSON-RPC endpoint is needed to query pool data and submit transactions.
- A subgraph connection is needed to iterate through buckets/borrowers/liquidations within a configured pool.
- Funds used to pay gas on that chain.
- Funds (quote token) to post liquidation bonds in each pool configured to kick.

## Features

### Kick

Starts a liquidation when a loan's threshold price exceeds the lowest utilized price in the pool by a configurable percentage.

### Arbtake

When auction price drops a configurable percentage below the highest price bucket, exchanges quote token in that bucket for collateral, earning a share of that bucket.

### Collect Liquidation Bond

Collects liquidation bonds (which were used to kick loans) once they are fully claimable. Note: This does not settle auctions.

### Collect Reward LP

Redeems rewarded LP for either Quote or Collateral based on config. Note: This will only collect LP rewarded while the bot is running and will not collect deposits.

## Installation and Prerequisites

You'll need `node` and related tools (`npm`, `yarn`). This was developed with node v22 but should work with later versions.

```bash
yarn --frozen-lockfile
```

## Configuration

### Configuration file

While `*.json` config files are supported, it is recommended to use `*.ts` config files so that you get the benefits of type checking.
See `example-config.ts` for reference.

### Price sources

- [coingecko](https://www.coingecko.com/) - using their [simple price](https://docs.coingecko.com/v3.0.1/reference/simple-price) API
- **fixed** - hardcoded number, useful for stable pools
- **pool** - can use _lup_ or _htp_

If the price source only has quote token priced in collateral, you may add `"invert": true` to `price` config to invert the configured price.

## Execution

```bash
yarn start --config my-config.ts
```

## Testing

### Running tests

In one terminal run:

```bash
npx hardhat node
```

In a second terminal run:

```bash
npx hardhat test
```

## Disclaimer

User assumes all risk of data presented and transactions placed by this keeper.
