module.exports = {
  apps: [
    {
      name: "ord:indexer",
      script: "npm",
      args: "run ord:indexer",
      instances: 1,
      cron_restart: "0/10 * * * *",
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
      cron_restart: "0 0/3 * * *",
      watch: false,
      autorestart: false,
      env: {
        DEBUG: "ord-*",
      },
    },
  ],
};
