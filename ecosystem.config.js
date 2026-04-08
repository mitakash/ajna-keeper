module.exports = {
  apps: [
    {
      name: 'ajna-keeper-v4',
      script: './node_modules/ts-node/dist/bin.js',
      args: 'src/index.ts --config "example-uniswapV4-config copy.ts"',
      cwd: __dirname,

      // Environment - KEEPER_PASSWORD is read by the patched utils.ts
      env: {
        KEEPER_PASSWORD: 'Kristopher07',
        NODE_ENV: 'production',
      },

      // Auto-restart on crash, but back off if crashing repeatedly
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',         // must run 30s before considered "started"
      restart_delay: 5000,       // 5s between restart attempts

      // Logs - separate files for stdout and stderr
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,

      // Memory guard - restart if the bot leaks past 512MB
      max_memory_restart: '512M',

      // Watch for config changes (optional - restart on config edit)
      watch: false,
    },
  ],
};
