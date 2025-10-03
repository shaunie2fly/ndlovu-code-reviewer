export interface CliArgs {
  enableLogging: boolean;
}

/**
 * Parse command line arguments
 * @returns Parsed command line arguments
 */
export function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  return {
    enableLogging: args.includes('--enable-logging') || args.includes('-l'),
  };
}

/**
 * Display help information
 */
export function showHelp(): void {
  console.log(`
Ndlovu Code Reviewer MCP Server

Usage:
  node dist/index.js [options]

Options:
  -l, --enable-logging    Enable file logging to ./logs/ directory
  -h, --help             Show this help message

Examples:
  node dist/index.js                          # Run without logging
  node dist/index.js --enable-logging         # Run with logging enabled
  npm run start -- --enable-logging           # Run via npm with logging
  `);
}