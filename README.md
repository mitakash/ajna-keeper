# ajna-keeper

## Purpose

A bot to automate liquidations on the Ajna platform.

## Design

- Each instance of the keeper connects to exactly one chain using a single RPC endpoint. The same keeper instance may interact with multiple pools on that chain.
- Pool addresses must be explicitly configured.
- Each instance of the keeper may unlock only a single wallet using a JSON keystore file. As such, if running multiple keepers on the same chain, different accounts should be used for each keeper to avoid nonce conflicts.
- Kick, ArbTake, Bond Colelction, Reward LP Collection - can all be enabled/disabled per pool through the provided config.

## Quick Setup

You must setup one bot per-chain, per-signer.

### Installation and Prerequisites

You'll need `node` and related tools (`npm`, `yarn`). This was developed with node v22 but should work with later versions.

Download node here: https://nodejs.org/en Downloading `node` also installs `npm`.

Install `yarn`

```bash
npm install --global yarn
```

Install node dependencies.

```bash
yarn --frozen-lockfile
```

### Create a new config file

Create a new `config.ts` file in the `ajna-keeper/` folder and copy the contents from `example-config.ts`.

### Get Alchemy URL with API token.

(Any RPC endpoint can be used. But, these instructions are for Alchemy.)
Go to your acount on Alchemy.
Make sure you have an app with your L2 network enabled.
Navigate to the Apps > Networks tab and copy the url under your network. It will look something like: `https://avax-mainnet.g.alchemy.com/v2/asf...`
Replace the `ethRpcUrl` in your `config.ts` file with the url you got from alchemy.

### Get Coingecko token

Create an account on Coingecko and go to the URL https://www.coingecko.com/en/developers/dashboard
Here you will click "Add New Key" to add a new key.
In your `config.ts` file replace `coinGeckoApiKey` with the key you just created.

### Configure ajna

In `config.ts` for the section `ajna`, you will need to provide addresses for all the ajna specific contracts. These addresses can be found here: https://faqs.ajna.finance/info/deployment-addresses-and-bridges

### Configure multicall

In `config.ts` you may need to provide an address for `multicallAddress` for your specific chain. These addresses can be found here https://www.multicall3.com/deployments
If you add `multicallAddress`, then you will also need to add `multicallBlock` which is the block that multicall was added.

### Setup Ajna-Subgraph

In a different folder clone the ajna-finance repo. It is recommended that you checkout the develop branch so that you have the latests networks settings for L2s.

```bash
git clone https://github.com/ajna-finance/subgraph.git
cd subgraph
git checkout develop
```

Update your `ajna-subgraph/.env` file to contain your alchemy key.

`ajna-subgraph/.env`

```.env
ETH_RPC_URL=https://avax-mainnet.g.alchemy.com/v2/asf.....
ETH_NETWORK=avalanche:https://avax-mainnet.g.alchemy.com/v2/asf.....
```

[Install docker](https://www.docker.com/).

Follow the setup instructions in ajna-subgraph/README.

### Setting up a keystore.

Keeper uses ethers [Encrypted JSON Wallet](hhttps://docs.ethers.org/v5/api/signer/#Wallet-fromEncryptedJson), which is encrypted using a password.

The easiest way to create an encrypted JSON wallet is to use the create-keystore script provided in keeper:
Run the script with `yarn create-keystore`. Then follow the onscreen prompts.

### Execution

```bash
yarn start --config config.ts
```

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

## Configuration

### Configuration file

While `*.json` config files are supported, it is recommended to use `*.ts` config files so that you get the benefits of type checking.
See `example-config.ts` for reference.

### Price sources

- [coingecko](https://www.coingecko.com/) - using their [simple price](https://docs.coingecko.com/v3.0.1/reference/simple-price) API
- **fixed** - hardcoded number, useful for stable pools
- **pool** - can use _lup_ or _htp_

If the price source only has quote token priced in collateral, you may add `"invert": true` to `price` config to invert the configured price.

## Testing

### Add Alchemy API key and Coingecko API to .env

Add your alchemy API key and coingecko API key to .env

```.env
ALCHEMY_API_KEY="<api_key>"
COINGECKO_API_KEY="<api_key>"
```

Note: You will need to enable mainnet in Alchemy since hardhat queries from mainnet.

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
