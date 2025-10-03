import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { exec } from "node:child_process";
import { promisify } from "node:util";

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Instantiate the MCP Server
const server = new McpServer({
  name: "Gemini Code Reviewer",
  version: "1.0.0",
});

// Define the Reviewer "Tool"
server.tool(
  "review-local-changes", // The unique name of our tool
  "Performs a hybrid AI + static analysis review of local, uncommitted code changes.",
  {}, // No input parameters are needed
  async () => {
    try {
      // 1. Define the command to execute
      const command = "gemini /reviewhybrid";

      // 2. Execute the Gemini CLI command
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        // If there's an error, log it and throw
        console.error(`Error executing Gemini CLI: ${stderr}`);
        throw new Error(`Failed to run review: ${stderr}`);
      }

      // 3. Return the successful JSON output from stdout
      return {
        content: [
          {
            type: "text",
            text: stdout,
          },
        ],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Execution failed: ${errorMessage}`);
      throw new Error(`An unexpected error occurred: ${errorMessage}`);
    }
  }
);

// Start the Server
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gemini Code Reviewer is running.");
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});