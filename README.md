# Ordit

Ordit is a server and api solution for indexing, resolving and providing blockchain transaction, ordinal and inscriptions information.

## Setup

### Prerequisites

Make sure you have the following services installed in your local environment.

| Service | Instructions                              |
| ------- | ----------------------------------------- |
| Docker  | https://docs.docker.com/engine/install    |
| Git     | https://github.com/git-guides/install-git |
| Ord     | https://github.com/sadoprotocol/ord       |

### Configuration

Create `.env` environment file by copying the `dotenv` file from the project directory.

```sh
$ cp dotenv .env
```

Open the `.env` file and adjust configuration as needed for your local setup. By default the values in the base file should work out of the box unless you manually adjust the environment.

### Install Dependencies

```sh
$ npm install
```

### Build Ord

Follow the instructions in the [ord](https://github.com/sadoprotocol/ord) repository and build an executable for the operating system you are hosting on. Once built update the configuration and set the absolute path to the `ord` executable under the `ORD` key.

## Server

When you want to host ordit simply pull the repository to the server you want to run it on, follow the above install process, and run the setup script.

```sh
$ npm run setup
```

This will start the process of initating the ord requirements for the server by starting ord indexing process against your first snapshot, then generating the blue/green indexes that is targeted by the running server.

Indexing can be a time consuming process, so its recommended to pre-index the initial snapshot before starting the setup process.

```sh
/path/to/ord -t --bitcoin-data-dir=/path/to/.bitcoin --bitcoin-rpc-user=<username> --bitcoin-rpc-pass=<password> --rpc-url=<rpc-url> --data-dir=/path/to/ordit/.ord --index-sats index run
```

The `-t` option is for testnet, `-r` for regtest or omit the value for mainnet.

Estimated indexing times for ord on a large server:

```
testnet: ~1 day
mainnet: ~5 days
```

### Workers

Ordit provides a configuration file for [PM2](https://pm2.keymetrics.io/) which sets up the two pre-mentioned indexer and snapshot workers. It is recommended that you either run the setup process or manually provide ready made indexes before assigning the workers to PM2.

You can start the workers with the following command.

```sh
$ pm2 start worker.config.js
```

### Starting Server

To spin up the server simply use one of the two commands.

```sh
$ npm start
```

Or if you want to run with PM2

```sh
$ pm2 start npm --name ordit -- start
```

## Local Development

Running the solution locally for development purposes we use docker to spin up our required services.

### Bitcoin Core

If you do not have your own bitcoin core instance running you can use the provided docker compose file to spin up a new bitcoin core vm in a docker container.

```sh
$ npm run bitcoin:start
```

To shut it down you can run the opposite command

```sh
$ npm run bitcoin:stop
```

### MongoDB

If you do not have your own mongodb instance running you can use the provided docker compose file to spin up a new mongodb vm in a docker container.

```sh
$ npm run mongodb:start
```

To shut it down you can run the opposite command

```sh
$ npm run mongodb:stop
```

### Run API

Once the docker containers are up and running we can start the API.

```sh
$ npm run dev
```

### Indexing

Ordit comes with two indexing commands for `bitcoin` and `ord`.

Bitcoin indexer runs against the local bitcoin core instance and indexes data against the local mongodb instance. You can start the indexer with the following command.

```sh
$ npm run btc:indexer
```

Ord indexer is set up with a blue/green switcher during indexing to avoid write locking a single entry point to ord data. This is done automatically when running the indexer.

In the event of a reorg the indexer will attempt to automatically recover from stored snapshots. If no valid snapshot is present the indexer will start rebuilding the ord index from scratch.

You can start the ord indexer with the following command.

```sh
$ npm run ord:indexer
```

### Snapshot

To recover from reorg events we retain periodic snapshots of the ord index. The number of snapshots retained can be set in the .env configuration. Once a reorg is identified the system will attempt to return to a non reorg index.

You can run a snapshot using the following command.

```sh
$ npm run ord:snapshot
```
