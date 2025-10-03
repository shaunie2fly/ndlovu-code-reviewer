# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server that provides code review capabilities by wrapping the Gemini CLI tool. The server exposes a single MCP tool called "review-local-changes" that executes `gemini /reviewhybrid` and returns the results through the MCP protocol.

## Development Commands

```bash
# Development with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run the built server
npm run start

# Test with MCP Inspector (for debugging)
npx @modelcontextprotocol/inspector node dist/index.js
```

## Architecture

### Core Components

- **Single Entry Point**: `src/index.ts` contains the entire server implementation
- **MCP Server**: Uses `@modelcontextprotocol/sdk` with StdioServerTransport for communication
- **Tool Provider**: Exposes one tool "review-local-changes" that takes no parameters
- **External Integration**: Executes `gemini /reviewhybrid` command via Node.js child_process

### Key Design Decisions

- **Wrapper Approach**: Rather than reimplementing code review logic, the server acts as a simple wrapper around the existing Gemini CLI tool
- **ES Modules**: Project configured with `"type": "module"` and modern TypeScript settings
- **Async/Await**: Uses promisify'd child_process for clean async command execution
- **Error Handling**: Basic try-catch blocks with console error logging for debugging

### Dependencies

- **External Requirement**: The `gemini` CLI tool must be installed and available in PATH
- **MCP SDK**: `@modelcontextprotocol/sdk` for protocol implementation
- **Zod**: Currently imported but not used (could be used for future input validation)

## Project Configuration

- **TypeScript**: Strict mode enabled with NodeNext module resolution
- **Build Output**: Compiled to `dist/` directory with source maps
- **Module System**: ES modules with verbatimModuleSyntax
- **Target**: ESNext for modern Node.js environments

## Testing Infrastructure

**Note**: No test suite is currently implemented. The package.json test script is a placeholder that exits with an error.