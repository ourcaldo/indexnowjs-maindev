// Replit-compatible Next.js launcher
import { spawn } from 'child_process';

const port = process.env.PORT || '5000';

console.log('Starting Next.js application...');

const nextProcess = spawn('npx', ['next', 'dev', '--port', port, '--hostname', '0.0.0.0'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port },
  cwd: process.cwd()
});

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  nextProcess.kill();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  nextProcess.kill();
});
