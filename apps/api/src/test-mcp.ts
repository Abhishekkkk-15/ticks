import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  console.log("Connecting to MCP server at http://localhost:8001/mcp/sse...");
  const transport = new SSEClientTransport(new URL("http://localhost:8001/mcp/sse"));
  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("✅ Successfully connected to MCP server!");
  
  const toolsResponse = await client.listTools();
  console.log("✅ Tools available:", toolsResponse.tools.map(t => t.name));

  console.log("Testing list_workspaces tool...");
  try {
    const response = await client.callTool({ name: "list_workspaces", arguments: {} });
    console.log("✅ list_workspaces response:", JSON.stringify(response, null, 2));
  } catch (err: any) {
    console.error("❌ Error calling tool:", err.message || err);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
