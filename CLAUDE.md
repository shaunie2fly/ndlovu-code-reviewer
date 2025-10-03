# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a sophisticated Model Context Protocol (MCP) server that provides hybrid code review capabilities by combining static analysis with AI-powered review. The server exposes a single MCP tool called "review-local-changes" that performs comprehensive analysis of local, uncommitted code changes by:

1. **Static Analysis Integration**: Automatically detects and runs the best available linter (ESLint, JSHint, or TypeScript compiler)
2. **Git Diff Analysis**: Processes local changes to understand context and modifications
3. **AI-Powered Review**: Leverages Gemini CLI for intelligent code analysis and recommendations
4. **Structured Output**: Returns actionable findings in a standardized JSON format

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

- **Single Entry Point**: [`src/index.ts`](src/index.ts) contains the entire server implementation with comprehensive hybrid analysis
- **MCP Server**: Uses `@modelcontextprotocol/sdk` with StdioServerTransport for communication
- **Tool Provider**: Exposes one tool "review-local-changes" that performs automated hybrid analysis
- **Hybrid Analysis Engine**: Combines static analysis with AI-powered review for comprehensive code assessment
- **External Integration**: Executes Gemini CLI with sophisticated prompt engineering and context management

### Key Design Decisions

- **Hybrid Analysis Approach**: Combines deterministic static analysis with contextual AI review for maximum coverage
- **Multi-Linter Support**: Automatically detects and uses ESLint, JSHint, or TypeScript compiler based on project configuration
- **Robust Process Management**: Uses spawn-based execution with proper timeout handling and error recovery
- **Smart Prompt Handling**: Implements fallback mechanisms for long prompts and various edge cases
- **ES Modules**: Project configured with `"type": "module"` and modern TypeScript settings
- **Async/Await**: Uses promisified child_process for clean async command execution with proper error handling

### Hybrid Analysis Workflow

1. **Git Integration**: Identifies modified/added JS/TS/Vue files using `git diff HEAD --name-only --diff-filter=AM`
2. **Linter Detection**: Automatically discovers project's preferred linter configuration
3. **Static Analysis Execution**: Runs detected linter with JSON output parsing
4. **Context Preparation**: Combines git diff and linter report into structured context
5. **AI Review**: Sends comprehensive context to Gemini CLI with detailed review instructions
6. **Result Synthesis**: Returns structured JSON with summary, assessment, and actionable findings

### Dependencies

- **External Requirements**:
  - `gemini` CLI tool must be installed and available in PATH
  - `git` for diff analysis and change detection
  - Node.js 18+ for modern JavaScript features
- **MCP SDK**: `@modelcontextprotocol/sdk` for protocol implementation
- **Type Safety**: TypeScript with strict mode for reliable development
- **Development Tools**: ESLint, ts-node for development workflow

## Static Analysis Integration

### Linter Detection and Fallback Strategy

The server implements a sophisticated linter detection system that automatically adapts to different project configurations:

1. **Primary Linter (ESLint)**:
   - Detects configuration files: `eslint.config.js`, `.eslintrc.js`, `.eslintrc.json`, `.eslintrc.yml`, `.eslintrc.yaml`, `.eslintrc`
   - Executes with JSON output format for structured parsing
   - 30-second timeout with proper error handling

2. **Fallback Linter (JSHint)**:
   - Automatically used when ESLint is not available
   - Parses stderr output into structured format
   - Individual file processing with 10-second timeout per file

3. **TypeScript Compiler Check**:
   - Engaged for TypeScript projects with `tsconfig.json`
   - Runs `tsc --noEmit` for type checking
   - Parses compiler errors into standardized format

4. **Graceful Degradation**:
   - If no linter is available, proceeds with AI-only analysis
   - Warns appropriately about missing static analysis capabilities

### Security Considerations

- **Shell Injection Prevention**: Uses `spawn` instead of `exec` for ESLint to prevent shell injection
- **Argument Length Handling**: Implements fallback to stdin when prompt arguments exceed system limits
- **Timeout Management**: All external processes have configurable timeouts to prevent hanging
- **Process Isolation**: Each external tool runs in isolated process contexts

## Project Configuration

- **TypeScript**: Strict mode enabled with NodeNext module resolution
- **Build Output**: Compiled to `dist/` directory with source maps
- **Module System**: ES modules with verbatimModuleSyntax
- **Target**: ESNext for modern Node.js environments
- **Development Tools**: ESLint configuration for code quality

## Testing Infrastructure

**Note**: No formal test suite is currently implemented. The package.json test script is a placeholder that exits with an error. Testing is primarily done through:

- Manual MCP client integration testing
- Local development with `npm run dev`
- MCP Inspector debugging with `npx @modelcontextprotocol/inspector node dist/index.js`

## Key Implementation Details

### Error Handling Strategy
- Comprehensive try-catch blocks throughout the codebase
- Graceful fallbacks when external tools fail
- Detailed console logging for debugging MCP communication
- Structured error responses for client consumption

### Performance Optimizations
- Efficient git diff processing with file filtering
- Parallel execution of static analysis where possible
- Caching of linter detection results
- Timeout-based resource management

### Output Format
The server returns structured JSON with the following schema:
```json
{
  "summary": "High-level overview of changes",
  "assessment": "Overall code quality evaluation and positive feedback",
  "findings": [
    {
      "filePath": "path/to/file.js",
      "lineNumber": 42,
      "severity": "error|warning|info",
      "category": "style|logic|performance|security",
      "comment": "Detailed explanation of the issue",
      "suggestion": "Specific recommendation for improvement"
    }
  ]
}
```

## Troubleshooting

### Common Issues and Solutions

1. **"Gemini CLI not found" Error**:
   - Ensure `gemini` CLI is installed and available in PATH
   - Run `which gemini` to verify installation
   - Install from https://ai.google.dev/docs/tools/gemini_cli

2. **"No relevant files changed" Response**:
   - This is normal behavior when no JS/TS/Vue files have been modified
   - Check that you have uncommitted changes with `git status`
   - Verify that changed files have appropriate extensions (`.js`, `.ts`, `.tsx`, `.vue`)

3. **Linter Detection Issues**:
   - Server will warn if no suitable linter is found
   - AI-only analysis will still proceed
   - Consider adding ESLint configuration to enable static analysis

4. **Timeout Errors**:
   - Default Gemini CLI timeout is 120 seconds
   - ESLint timeout is 30 seconds
   - Large codebases may require longer timeouts

5. **Argument List Too Long**:
   - Server automatically falls back to stdin streaming
   - This is handled transparently by the `runGeminiPrompt` function

### Debug Mode

Use the MCP Inspector for detailed debugging:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This provides a web interface for testing MCP tool calls and inspecting responses.

### Git Repository Requirements

- Must be a valid git repository with commits
- Requires HEAD to exist (cannot be empty repository)
- Uses `git diff HEAD` to compare against last commit
- Only processes added/modified files (excludes deletions)