<p align="center">
  <img src="assets/codendlovulogo.png" alt="Code Review MCP Server logo" width="160">
</p>

# Code Review MCP Server

A minimal Model Context Protocol (MCP) server for code review workflows.

## Features

- Connects to MCP-compatible clients using the official SDK.
- Provides scaffolding for reviewing code with structured prompts.
- Written in TypeScript with strict typing via Zod schemas.

## Getting Started

```bash
npm install
npm run build
npm start
```

For development with hot reloading, use `npm run dev` instead.

## Project Structure

- `src/`: TypeScript source files for the MCP server implementation.
- `dist/`: Compiled JavaScript output.
- `assets/`: Project assets, including the logo used above.

## License

This project is licensed under the ISC License. See `LICENSE` (if present) for details.
