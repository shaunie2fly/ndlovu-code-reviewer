# MCP Inspector Usage

This document explains how to use the MCP inspector with Ndlovu Code Reviewer, including support for managing multiple instances and port conflicts.

## Quick Start

### Standard Inspector
```bash
npm run inspector
```

### Inspector with Logging
```bash
npm run inspector:log
```

### Auto-Cleanup Inspector (Recommended for Multiple Projects)
```bash
npm run inspector:auto
```

## Managing Port Conflicts

The MCP inspector uses ports 6277 and 6274 by default. When working with multiple projects or instances, use these scripts to manage conflicts:

### Clean Up Existing Instances
```bash
npm run inspector:cleanup
```
This terminates any existing MCP inspector processes on ports 6277 and 6274.

### Auto-Cleanup Mode
```bash
npm run inspector:auto
npm run inspector:auto:log
```
Automatically cleans up existing processes before starting a new instance.

## Available Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run inspector` | Start with basic checks | Single instance usage |
| `npm run inspector:log` | Start with logging enabled | Debugging with logs |
| `npm run inspector:cleanup` | Clean up existing processes | Manual cleanup |
| `npm run inspector:auto` | Start with auto-cleanup | Multiple projects |
| `npm run inspector:auto:log` | Start with auto-cleanup + logs | Debugging multiple projects |

## How It Works

### Port Management
The inspector manager handles two key ports:
- **6277**: Proxy server port
- **6274**: Inspector web interface port

### Auto-Cleanup Process
1. **Detection**: Checks if ports 6277/6274 are in use
2. **Cleanup**: Terminates conflicting processes gracefully
3. **Startup**: Launches fresh inspector instance
4. **Access**: Provides URL and authentication token

### Example Output

```
🚀 Ndlovu Code Reviewer Inspector Manager
📁 Project: ndlovu-code-reviewer
📍 Working Directory: /path/to/project
🔧 Starting MCP inspector...
🌐 Inspector will be available at: http://localhost:6277
🔑 Session token will be provided in the output
🛑 Press Ctrl+C to stop the inspector

Starting MCP inspector...
⚙️ Proxy server listening on localhost:6277
🔑 Session token: abc123...
🚀 MCP Inspector is up and running at:
   http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=abc123...
```

## Multi-Project Workflow

For developers working with multiple MCP servers:

1. **First Project**: `npm run inspector:auto`
2. **Second Project**: `npm run inspector:auto` (auto-cleans first instance)
3. **Switch Between Projects**: Use `npm run inspector:auto` in each project directory

Alternatively:
1. **Stop Current**: Press `Ctrl+C` in the running inspector
2. **Start New**: `npm run inspector` in the new project
3. **Manual Cleanup**: `npm run inspector:cleanup` if needed

## Direct Inspector Usage

If you prefer to use the MCP inspector directly:

```bash
# Standard usage
npx @modelcontextprotocol/inspector node dist/index.js

# With logging enabled
npx @modelcontextprotocol/inspector node dist/index.js --enable-logging
```

## Troubleshooting

### "PORT IS IN USE" Error
**Solution**: Use auto-cleanup mode
```bash
npm run inspector:auto
```

**Manual Solution**:
```bash
npm run inspector:cleanup
npm run inspector
```

### Inspector Not Starting
1. **Build Project**: `npm run build`
2. **Check Dependencies**: `npm install`
3. **Clean Up**: `npm run inspector:cleanup`
4. **Try Auto Mode**: `npm run inspector:auto`

### Process Won't Stop
```bash
# Force cleanup
npm run inspector:cleanup
# Or manually:
pkill -f "mcp-inspector" || pkill -f "@modelcontextprotocol/inspector"
```

## Advanced Configuration

### Environment Variables
The inspector manager respects these environment variables:
- Standard Node.js environment variables
- Project-specific settings from package.json

### Custom Scripts
You can modify the inspector manager script at `scripts/simple-inspector-manager.js` for custom behavior.

### Project Identification
The manager automatically identifies projects using:
1. `package.json` name field (preferred)
2. Directory name as fallback

## Best Practices

1. **Use Auto-Cleanup**: `npm run inspector:auto` for seamless multi-project work
2. **Clean Exit**: Always use `Ctrl+C` to gracefully stop the inspector
3. **One Instance**: Keep only one inspector running per system for best performance
4. **Check Logs**: Use `:log` versions when debugging issues

## Integration with Development Workflow

### During Development
```bash
# Start inspector with auto-cleanup and logging
npm run inspector:auto:log

# Make code changes
# Inspector will automatically refresh the connection
```

### Testing Multiple Projects
```bash
# Project A
cd ~/project-a
npm run inspector:auto

# Project B (in separate terminal)
cd ~/project-b
npm run inspector:auto  # Auto-cleans Project A instance
```

### Code Review Integration
The inspector works seamlessly with the Ndlovu code reviewer:
1. Start inspector: `npm run inspector:auto`
2. Use MCP client to call `review-local-changes` tool
3. View results in the inspector web interface