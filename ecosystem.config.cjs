// PM2 config — start with:  npx pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "oracle",
      script: "server/src/index.ts",
      interpreter: "node",
      interpreter_args: "--import tsx", // runs the TypeScript server directly
      env: { NODE_ENV: "production", PORT: 8787 },
      max_memory_restart: "400M",
    },
  ],
};
