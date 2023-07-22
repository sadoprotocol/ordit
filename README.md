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
$ npm start
```

### Indexing

Indexer runs through all the blocks and pulls out the vins and vouts of each transaction and ties them to the block and transactions they originate in. It also mutates custom states based on new incoming data with each block processed.

```sh
$ npm run indexer
```
