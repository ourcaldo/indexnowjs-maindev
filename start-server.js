#!/usr/bin/env node

// Custom server launcher for IndexNow Pro with WebSocket support
// This script ensures the WebSocket server is properly initialized

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting IndexNow Pro with WebSocket support...');

// Start the custom server with tsx
const serverProcess = spawn('npx', ['tsx', 'server/custom-server.ts'], {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: process.cwd()
});

serverProcess.on('error', (err) => {
  console.error('❌ Failed to start custom server:', err);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Custom server process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  serverProcess.kill();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  serverProcess.kill();
});