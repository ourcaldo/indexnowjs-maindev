module.exports = {
  apps: [{
    name: 'indexnow-studio',
    script: 'npm',
    args: 'run start',
    cwd: './',
    env: {
      NODE_ENV: 'production',
      PORT: 8081
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8081
    }
  }]
}