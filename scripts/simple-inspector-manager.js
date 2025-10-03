#!/usr/bin/env node

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

// Function to get project identifier
function getProjectIdentifier() {
  const packageJsonPath = join(process.cwd(), 'package.json');
  try {
    const packageJson = JSON.parse(createReadStream(packageJsonPath, 'utf8'));
    return packageJson.name || process.cwd().split('/').pop();
  } catch {
    return process.cwd().split('/').pop();
  }
}

// Function to kill existing processes on MCP inspector ports
async function cleanupInspectorProcesses() {
  const ports = [6277, 6274]; // Known MCP inspector ports

  console.log('🧹 Cleaning up existing MCP inspector processes...');

  for (const port of ports) {
    try {
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      if (stdout.trim()) {
        const pids = stdout.trim().split('\n');
        for (const pid of pids) {
          try {
            process.kill(parseInt(pid), 'SIGTERM');
            console.log(`✅ Terminated process ${pid} on port ${port}`);
          } catch (error) {
            console.warn(`⚠️  Could not terminate process ${pid}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      // No process found on port, which is fine
      console.log(`✅ Port ${port} is available`);
    }
  }

  // Wait for processes to terminate
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// Function to check if ports are available
async function checkPortsAvailable() {
  const ports = [6277, 6274];

  for (const port of ports) {
    try {
      await execAsync(`lsof -i :${port}`);
      return false; // Port is in use
    } catch {
      // Port is available
    }
  }
  return true;
}

// Main function
async function runSimpleInspectorManager() {
  const args = process.argv.slice(2);
  const enableLogging = args.includes('--enable-logging');
  const forceCleanup = args.includes('--cleanup');
  const project = getProjectIdentifier();

  console.log(`🚀 Ndlovu Code Reviewer Inspector Manager`);
  console.log(`📁 Project: ${project}`);
  console.log(`📍 Working Directory: ${process.cwd()}`);

  try {
    if (forceCleanup) {
      await cleanupInspectorProcesses();
      console.log('✅ Cleanup completed');
      return;
    }

    // Check if ports are available
    const portsAvailable = await checkPortsAvailable();

    if (!portsAvailable) {
      console.log(`⚠️  MCP inspector ports (6277, 6274) are in use`);
      console.log(`💡 Options:`);
      console.log(`   1. Run with --cleanup to terminate existing processes`);
      console.log(`   2. Use a different terminal/work directory`);
      console.log(`   3. Manually terminate the conflicting processes`);

      if (args.includes('--auto-cleanup')) {
        console.log(`🔧 Auto-cleanup enabled, terminating existing processes...`);
        await cleanupInspectorProcesses();
      } else {
        console.log(`\n❌ Cannot start inspector - ports are in use`);
        console.log(`💡 Try: npm run inspector:cleanup`);
        console.log(`💡 Or: npm run inspector:auto`);
        process.exit(1);
      }
    }

    // Prepare inspector command
    const inspectorArgs = ['node', 'dist/index.js'];
    if (enableLogging) {
      inspectorArgs.push('--enable-logging');
    }

    console.log(`🔧 Starting MCP inspector...`);
    console.log(`🌐 Inspector will be available at: http://localhost:6277`);
    console.log(`🔑 Session token will be provided in the output`);
    console.log(`🛑 Press Ctrl+C to stop the inspector\n`);

    // Start the inspector
    const inspectorProcess = spawn('npx', ['@modelcontextprotocol/inspector', ...inspectorArgs], {
      stdio: 'inherit',
      shell: true
    });

    // Handle cleanup on exit
    const cleanup = () => {
      console.log('\n🛑 Shutting down inspector...');
      inspectorProcess.kill('SIGTERM');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    inspectorProcess.on('close', (code) => {
      console.log(`\n📋 Inspector process exited with code ${code}`);
      process.exit(code);
    });

    inspectorProcess.on('error', (error) => {
      console.error('❌ Failed to start inspector:', error.message);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Display usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Ndlovu Code Reviewer Inspector Manager

Usage:
  node scripts/simple-inspector-manager.js [options]

Options:
  --enable-logging    Enable logging for the inspector
  --cleanup          Clean up existing inspector processes and exit
  --auto-cleanup     Automatically clean up existing processes
  --help, -h         Show this help message

NPM Scripts:
  npm run inspector      Start inspector with basic checks
  npm run inspector:log  Start inspector with logging enabled
  npm run inspector:cleanup     Clean up existing processes
  npm run inspector:auto       Start with auto-cleanup

Examples:
  npm run inspector
  npm run inspector:log
  npm run inspector:cleanup
  npm run inspector:auto
  `);
  process.exit(0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

runSimpleInspectorManager();