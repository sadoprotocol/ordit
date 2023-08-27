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

Follow the instructions in the [ord](https://github.com/sadoprotocol/ord) repository and build an executable for the operating system you are hosting on.

## API

Before starting the api make sure that you have configured connectivity to a mongodb, bitcoin node and ord server instance. Once these services are running you can run the following command to spin up the api:

```sh
$ npm start
```

## Indexer

Before starting the indexer make sure that you have configured connectivity to a mongodb, bitcoin node and ord service intance. Once these services are running you can run the follow processes to start indexing.

Also make sure that both bitcoin and ord has caught up to the latest blocks.

### Pre-Indexing

Before starting the index worker we want to run a full index run on the current network.

```sh
$ npm run indexer
```

This will take a very long time, expect ~1 day on testnet and ~6 days on mainnet.

### Active Indexing

To run active indexing of new blocks you can start our worker process which spins up a http service that listens for block events from the bitcoin node.

```sh
$ npm run worker
```
