import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the TypeScript file
const tsScriptPath = path.resolve(__dirname, 'generate-fake-data.ts');

// Spawn a new node process with esbuild-register using the package name
const child = spawn('node', [
  '-r', 'esbuild-register',
  tsScriptPath
], {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: __dirname // Set current working directory to script directory
});

child.on('error', (err) => {
  console.error('Failed to start subprocess:', err);
});

child.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
});