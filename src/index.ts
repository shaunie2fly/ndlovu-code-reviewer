import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";

// Promisify exec for async/await usage
const execAsync = promisify(exec);

// Minimal result object for Gemini CLI responses
type GeminiResult = { stdout: string; stderr: string };

function isArgumentTooLongError(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return (error as NodeJS.ErrnoException).code === "E2BIG";
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("argument list too long");
  }

  return false;
}

async function spawnGemini(args: string[], input: string | null, timeoutMs: number): Promise<GeminiResult> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn("gemini", args, { stdio: ["pipe", "pipe", "pipe"] });
    } catch (spawnError) {
      reject(spawnError);
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer: NodeJS.Timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`Gemini CLI timed out after ${timeoutMs} ms`));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (data) => {
      stdout += data;
    });

    child.stderr.on("data", (data) => {
      stderr += data;
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(`Gemini CLI exited with code ${code}${stderr ? `: ${stderr}` : ""}`));
        return;
      }

      if (stderr.trim()) {
        console.warn(`Gemini CLI output on stderr: ${stderr}`);
      }

      resolve({ stdout, stderr });
    });

    if (child.stdin) {
      if (input !== null) {
        child.stdin.end(input.endsWith("\n") ? input : `${input}\n`);
      } else {
        child.stdin.end();
      }
    }
  });
}

// Safely invoke the Gemini CLI, falling back to stdin if necessary
async function runGeminiPrompt(prompt: string, timeoutMs = 120_000): Promise<GeminiResult> {
  try {
    return await spawnGemini([prompt], null, timeoutMs);
  } catch (error) {
    if (isArgumentTooLongError(error)) {
      console.warn("Gemini prompt exceeded argument length; streaming via stdin instead.");
      return spawnGemini([], prompt, timeoutMs);
    }

    throw error;
  }
}


// Secure ESLint execution using spawn to prevent shell injection
async function spawnEslint(files: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn("npx", ["eslint", "--format", "json", ...files], {
        stdio: ["pipe", "pipe", "pipe"],
        shell: true // Keep shell: true for npx to work properly
      });
    } catch (spawnError) {
      reject(spawnError);
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer: NodeJS.Timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGTERM");
      reject(new Error(`ESLint timed out after ${timeoutMs} ms`));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (data) => {
      stdout += data;
    });

    child.stderr.on("data", (data) => {
      stderr += data;
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (_code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);

      resolve({ stdout, stderr });
    });

    if (child.stdin) {
      child.stdin.end();
    }
  });
}

// Helper function to detect and run the best available linter for the project
async function runProjectLinter(changedFiles: string[]): Promise<any[]> {
  try {
    // Check if project has ESLint configuration
    const hasEslintConfig = await checkFileExists(['eslint.config.js', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml', '.eslintrc']);

    if (hasEslintConfig) {
      try {
        const { stdout: linterJson } = await spawnEslint(changedFiles, 30000);
        return linterJson.trim() ? JSON.parse(linterJson) : [];
      } catch (eslintError) {
        console.warn('ESLint execution failed, trying fallback linter:', eslintError instanceof Error ? eslintError.message : String(eslintError));
      }
    }

    // Fallback 1: Try JSHint if available
    if (await checkCommandExists('jshint')) {
      try {
        const results = [];
        for (const file of changedFiles) {
          const { stderr } = await execAsync(`jshint ${file}`, { timeout: 10000 });
          if (stderr) {
            const issues = parseJshintOutput(stderr, file);
            results.push(...issues);
          }
        }
        return results;
      } catch (jshintError) {
        console.warn('JSHint execution failed:', jshintError instanceof Error ? jshintError.message : String(jshintError));
      }
    }

    // Fallback 2: Try basic TypeScript compiler checking
    const hasTsConfig = await checkFileExists(['tsconfig.json']);
    if (hasTsConfig && changedFiles.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
      try {
        const { stderr } = await execAsync('npx tsc --noEmit', { timeout: 30000 });
        if (stderr) {
          return parseTypeScriptErrors(stderr);
        }
      } catch (tscError) {
        console.warn('TypeScript compilation check failed:', tscError instanceof Error ? tscError.message : String(tscError));
      }
    }

    // If no linter is available, return empty array
    console.warn('No suitable linter found in project, proceeding without static analysis');
    return [];
  } catch (error) {
    console.warn('Linter detection failed:', error);
    return [];
  }
}

// Helper function to check if files exist
async function checkFileExists(files: string[]): Promise<boolean> {
  for (const file of files) {
    try {
      await execAsync(`test -f ${file}`);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

// Helper function to check if a command exists
async function checkCommandExists(command: string): Promise<boolean> {
  try {
    await execAsync(`which ${command}`);
    return true;
  } catch {
    return false;
  }
}

// Helper function to parse JSHint output
function parseJshintOutput(output: string, filePath: string): any[] {
  const issues: any[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/^(.+): line (\d+), col (\d+), (.+)$/);
    if (match) {
      issues.push({
        filePath,
        line: parseInt(match[2] || '0'),
        column: parseInt(match[3] || '0'),
        message: match[4] || 'Unknown error',
        severity: 'warning',
        rule: 'jshint',
        source: 'jshint'
      });
    }
  }

  return issues;
}

// Helper function to parse TypeScript compiler errors
function parseTypeScriptErrors(output: string): any[] {
  const issues: any[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/^([^(]+)\((\d+),(\d+)\):\s+(error|warning)\s+(.+)$/);
    if (match) {
      issues.push({
        filePath: (match[1] || '').trim(),
        line: parseInt(match[2] || '0'),
        column: parseInt(match[3] || '0'),
        message: match[5] || 'Unknown error',
        severity: match[4] || 'error',
        rule: 'typescript',
        source: 'typescript'
      });
    }
  }

  return issues;
}

// Helper function to run the hybrid analysis directly in Node.js
async function runHybridAnalysis(): Promise<string> {
  try {
    // 1. Find all modified and added JS/TS/Vue files, excluding deleted files
    const { stdout: gitFiles } = await execAsync("git diff HEAD --name-only --diff-filter=AM");
    const changedFiles = gitFiles
      .split('\n')
      .filter(file => file.trim() !== '')
      .filter(file => /\.(js|ts|tsx|vue)$/.test(file));

    // 2. If no relevant files have changed, return empty JSON object
    if (changedFiles.length === 0) {
      return '{}';
    }

    // 3. Run the project's preferred linter
    const linterReport = await runProjectLinter(changedFiles);

    // 4. Get the raw git diff
    const { stdout: gitDiff } = await execAsync("git diff HEAD");

    // 5. Combine the git diff and linter report into JSON
    const result = {
      diff: gitDiff,
      linterReport: linterReport
    };

    return JSON.stringify(result, null, 2);
  } catch (error) {
    console.error('Error in hybrid analysis:', error);
    throw error;
  }
}

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
      // 1. Run the hybrid analysis directly in Node.js
      const analysisData = await runHybridAnalysis();

      // 2. Short-circuit if no relevant files have changed
      if (analysisData === '{}') {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                summary: 'No relevant files changed.',
                assessment: '',
                findings: []
              }, null, 2),
            },
          ],
        };
      }

      // 3. Create a simplified prompt for Gemini CLI with the analysis data
      const prompt = `You are an expert-level AI code reviewer, acting as a synthesis engine. Your primary function is to interpret results from a static analysis tool and combine them with your own deep code analysis to provide a single, comprehensive, and human-friendly review.

Your entire response MUST be a single, valid JSON object. Do not include any text outside of the JSON structure.

**CONTEXT GATHERING:**
You will be provided with a JSON object containing two key pieces of information:
1.  \`diff\`: The raw output of \`git diff HEAD\`.
2.  \`linterReport\`: A JSON array of deterministic issues found by a static analysis tool (ESLint).

The full context is as follows:
--- CONTEXT START ---
${analysisData}
--- CONTEXT END ---

**REVIEW INSTRUCTIONS & OUTPUT SCHEMA:**
Follow these steps meticulously to construct the final JSON object:

1.  **Synthesize Linter Findings:** First, analyze the \`linterReport\`. For each issue found by the linter, translate its technical message into an empathetic, educational comment. Explain *why* the rule is important. These findings are your ground truth for style and common errors.

2.  **Perform Deeper Analysis:** Next, analyze the \`diff\` to identify higher-level issues that static analysis tools typically miss. Focus on:
    - Logic errors, incorrect algorithms, or missed edge cases.
    - Architectural inconsistencies or violations of design patterns.
    - Performance bottlenecks or inefficient code.
    - Unclear naming or lack of necessary comments for complex logic.

3.  **De-duplicate and Merge:** Combine the findings from both steps into a single, de-duplicated list of actionable issues. If an issue is flagged by both the linter and your own analysis, prioritize the linter's finding but enrich its \`comment\` with your deeper contextual explanation.

4.  **Summarize and Assess:** Based on your complete analysis, write a concise \`summary\` of the changes and a high-level \`assessment\` of the code quality. This is the correct place for all positive feedback, praise for good architectural decisions, and other high-level, non-actionable observations.

5.  **CRITICAL RULE FOR \`findings\`:** The \`findings\` array must ONLY contain actionable issues that require a developer to make a code change. Do NOT include positive feedback, praise for good architecture, or general observations in the \`findings\` array. Any finding with a suggestion of "No change needed" must be excluded from this array and its content moved to the \`assessment\` field.

6.  **Format Output:** Assemble everything into the final JSON object according to the schema below.

**JSON SCHEMA:**
{
  "summary": "...",
  "assessment": "...",
  "findings": [
    {
      "filePath": "...",
      "lineNumber": "...",
      "severity": "...",
      "category": "...",
      "comment": "...",
      "suggestion": "..."
    }
  ]
}`;

      // 3. Execute Gemini CLI with the prepared prompt without shell quoting
      const { stdout } = await runGeminiPrompt(prompt);

      // 4. Return the successful JSON output from stdout
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