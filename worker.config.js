const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  apps: [
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
