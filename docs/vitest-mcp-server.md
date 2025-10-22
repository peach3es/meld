# Vitest MCP Server Integration

Use the published [`@madrus/vitest-mcp-server`](https://www.npmjs.com/package/@madrus/vitest-mcp-server) package instead of the custom `mcp/test-writer` script.

## Running the Server Locally

```bash
npm run mcp:vitest
```

The script simply executes `npx -y @madrus/vitest-mcp-server`. The server needs to know where your project lives:

```bash
VITEST_PROJECT_DIR=/absolute/path/to/meld npm run mcp:vitest
```

Set this environment variable in whatever MCP host you are using (Cursor, Claude Desktop, MCP Inspector, etc.). The directory should be the root of this repo (the folder that contains `package.json` and `vitest.config.ts`).

### Example Cursor configuration

```json
{
  "mcpServers": {
    "vitest-runner": {
      "command": "npx",
      "args": ["-y", "@madrus/vitest-mcp-server@latest"],
      "env": {
        "VITEST_PROJECT_DIR": "C:/Users/Peter/Documents/GitHub/meld"
      }
    }
  }
}
```

Restart your MCP client after updating the config. You can verify the connection with the server’s built‑in `ping` tool.

## Available Tools

The server exposes three tools:

| Tool                  | Description                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `ping`                | Health check                                                                                 |
| `run-vitest`          | Runs tests (`vitest run`) and streams the result summary                                     |
| `run-vitest-coverage` | Runs tests with coverage (`vitest --coverage`) and exposes the coverage report as a resource |

Two resource URIs are provided for the most recent run: `vitest://test-summary` and `vitest://coverage-report`.
