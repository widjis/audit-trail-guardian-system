import { spawn } from 'child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

const startProcess = (name, command, args) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit'
  });

  children.push(child);

  child.on('error', (error) => {
    console.error(`[dev:full] Failed to start ${name}:`, error.message);
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal) {
      console.error(`[dev:full] ${name} stopped by signal ${signal}`);
    } else if (code !== 0) {
      console.error(`[dev:full] ${name} exited with code ${code}`);
    } else {
      console.log(`[dev:full] ${name} stopped`);
    }

    shutdown(code || 0);
  });

  return child;
};

const shutdown = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    }
    process.exit(exitCode);
  }, 3000);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[dev:full] Starting backend on http://localhost:3001');
startProcess('backend', process.execPath, ['src/server/start.js']);

console.log('[dev:full] Starting frontend on http://localhost:8080');
startProcess('frontend', npmCommand, ['run', 'dev']);
