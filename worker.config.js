const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  apps: [
    {
      name: "btc:indexer",
      script: "npm",
      args: "run btc:indexer",
      instances: 1,
      cron_restart: `0/${process.env.UTXO_PARSER_INTERVAL} * * * *`,
      exec_mode: "fork",
      watch: false,
      autorestart: false,
      env: {
        DEBUG: "bitcoin-*",
      },
    },
    {
      name: "ord:indexer",
      script: "npm",
      args: "run ord:indexer",
      instances: 1,
      cron_restart: `0/${process.env.ORD_INDEXER_INTERVAL} * * * *`,
      exec_mode: "fork",
      watch: false,
      autorestart: false,
      env: {
        DEBUG: "ord-*",
      },
    },
    {
      name: "ord:snapshot",
      script: "npm",
      args: "run ord:snapshot",
      instances: 1,
      exec_mode: "fork",
      cron_restart: `0 0/${process.env.ORD_SNAPSHOT_INTERVAL} * * *`,
      watch: false,
      autorestart: false,
      env: {
        DEBUG: "ord-*",
      },
    },
  ],
};
