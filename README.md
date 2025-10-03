<p align="center">
  <img src="assets/codendlovulogo.png" alt="Code Review MCP Server logo" width="160">
</p>

# Code Review MCP Server

A Gemini-CLI (for now), powered code review assistant that runs as a Model Context Protocol (MCP) server.



## Why this project exists

Manual code reviews are time-consuming and often miss the opportunity to combine static analysis with contextual, human-friendly feedback. This project was created to experiment with MCP tooling that gives AI assistants access to a purpose-built reviewer:

- Automates the busywork of gathering diffs and lint results from local, uncommitted changes.
- Streams that context into the Gemini CLI so the model can focus on actionable insights.
- Returns a structured JSON review that fits naturally into MCP-compatible clients.

## What it does

- Connects to MCP clients over stdio using the official `@modelcontextprotocol/sdk`.
- Runs a "hybrid" review workflow that gathers `git diff` output and linter findings.
- Falls back between ESLint, JSHint, and TypeScript to maximise coverage across projects.
- Safely invokes the Gemini CLI, handling long prompts and timeouts.
- Ships as TypeScript with Zod-backed types for predictable MCP responses.

## Requirements

- Node.js 18 or later (ES modules and AbortSignals are used throughout).
- npm (installed with Node.js).
- Git (used to collect local diffs).
- Google Gemini CLI (`gemini`) installed and authenticated. See [the Gemini quickstart](https://ai.google.dev/docs/tools/gemini_cli) for setup instructions.

## Installation

```bash
git clone https://github.com/<your-org>/ndlovu-code-reviewer.git
cd ndlovu-code-reviewer
npm install
npm run build
```

If you plan to iterate on the TypeScript source, you can skip `npm run build` and rely on the dev script described below.

## Usage

### Start the MCP server

```bash
npm start
```

The server communicates over stdio, so it is ready to be registered with any MCP-compatible client (e.g. IDE integrations or assistant sandboxes). Once connected, call the `review-local-changes` tool to trigger the hybrid analysis and receive the JSON review.

### How to call the MCP tool

The server exposes a single tool called `review-local-changes` that performs comprehensive analysis of your local, uncommitted code changes.

**Prerequisites:**
- You must have uncommitted changes in your git repository
- Changed files should be JavaScript, TypeScript, or Vue files (`.js`, `.ts`, `.tsx`, `.vue`)
- The Gemini CLI must be installed and authenticated

**Using the tool:**

Once your MCP client is connected to the server, you can call the `review-local-changes` tool. The tool:

1. **Automatically detects changes** - Finds all modified/added JS/TS/Vue files using `git diff`
2. **Runs static analysis** - Executes the best available linter (ESLint, JSHint, or TypeScript compiler)
3. **Performs AI review** - Sends the combined context to Gemini CLI for intelligent analysis
4. **Returns structured results** - Provides a JSON response with findings and recommendations

**How to use it with Claude Code:**

For best results, be explicit about using the code review functionality. While natural language requests sometimes work, the most reliable approach is to use specific keywords:

**Most reliable requests (recommended):**
- "Use the code review tool to analyze my changes"
- "Run code review on my local changes"
- "Perform a comprehensive code review of my uncommitted changes"
- "Analyze my code changes with static analysis"

**Natural language requests (may work but less reliable):**
- "Please review my local changes"
- "Can you analyze the code changes I've made?"

**Explicit tool invocation (most reliable):**
- "Use the review-local-changes tool"
- "Call the review-local-changes tool to check my modifications"

The tool has been enhanced with better descriptions to help Claude recognize when to use it, but being specific about "code review," "analyze changes," or mentioning the tool name directly will give you the most consistent results.

**Example output format:**
```json
{
  "summary": "Overview of changes made",
  "assessment": "Overall code quality evaluation",
  "findings": [
    {
      "filePath": "src/example.js",
      "lineNumber": 42,
      "severity": "warning",
      "category": "style",
      "comment": "Detailed explanation of the issue",
      "suggestion": "Specific recommendation for improvement"
    }
  ]
}
```

**Note:** If no relevant files have been changed, the tool will return a "No relevant files changed" message, which is normal behavior.

### Local development

- `npm run dev` – Launches the server with `ts-node` for rapid iteration.
- `npm run build` – Produces the compiled JavaScript output in `dist/`.

The project structure is intentionally small:

- `src/` – TypeScript source for the MCP server.
- `dist/` – Compiled JavaScript created by `npm run build`.
- `assets/` – Static assets, including the logo used above.

## Connect from MCP clients

Before wiring the server into any client, make sure you have run `npm run build` so `dist/index.js` exists. The commands below assume you execute the client from the repository root so the server can read your git workspace.

### Claude Code (VS Code extension)

1. In VS Code, open the command palette (`Cmd/Ctrl+Shift+P`) and run `Claude: Edit Config File`.
2. Locate the `mcpServers` section (create it if needed) and add an entry similar to:

   ```json
   {
     "mcpServers": {
       "ndlovu-code-reviewer": {
         "command": "node",
         "args": ["/absolute/path/to/ndlovu-code-reviewer/dist/index.js"],
         "cwd": "/absolute/path/to/ndlovu-code-reviewer"
       }
     }
   }
   ```

3. Save the file and run `Claude: Restart Claude Code` (or reload VS Code) so the server appears under **Tools**.
4. Enable the tool for a conversation; Claude Code will stream `review-local-changes` results directly in the sidebar.

### Gemini CLI

1. From the project root run:

   ```bash
   gemini mcp add ndlovu-code-reviewer node $(pwd)/dist/index.js
   ```

2. Verify the registration with `gemini mcp list`.
3. Launch `gemini` from the same repository directory and use the `review-local-changes` tool (e.g., run `:tools` in the CLI and select it). The CLI spawns the server and forwards stdout back as the review JSON.

### Roo Code

1. Open Roo Code and click the server icon in the top of the Roo panel.
2. Choose **Add MCP Server → STDIO** and fill in:
   - **Name**: `ndlovu-code-reviewer`
   - **Command**: `node`
   - **Arguments**: `/absolute/path/to/ndlovu-code-reviewer/dist/index.js`
   - **Working Directory**: `/absolute/path/to/ndlovu-code-reviewer`
3. Save the configuration and enable the server for your workspace. Roo stores it in either the global `mcp_settings.json` or the project `.roo/mcp.json` file.
4. To share with teammates, commit a `.roo/mcp.json` that contains your preferred launch command, for example:

   ```json
   {
     "mcpServers": {
       "ndlovu-code-reviewer": {
         "command": "npm",
         "args": ["run", "start"],
         "cwd": "."
       }
     }
   }
   ```

   Roo resolves the working directory relative to the project root, so the `npm run start` script builds on the repository’s own package scripts.

### Codex CLI

1. Register the server once:

   ```bash
   codex mcp add ndlovu-code-reviewer node $(pwd)/dist/index.js
   ```

2. Use `codex mcp list` to confirm the entry, then start Codex from the repository root. The CLI exposes `review-local-changes` as a tool you can call inside interactive runs.

## Contributing

Contributions are very welcome. If you have ideas for new tools, better linters, or improved prompts:

1. Open an issue or discussion so we can align on scope.
2. Fork the repository and create a feature branch.
3. Add or update documentation/tests where it helps future contributors.
4. Submit a pull request describing the change and how you validated it.

If you're unsure where to start, feel free to reach out—there is plenty of room to expand the reviewer’s capabilities, add client examples, and tighten the prompts.

## License

This project is licensed under the ISC License. See `LICENSE` (if present) for details.
