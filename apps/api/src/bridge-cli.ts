import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  const stdioTransport = new StdioServerTransport();
  const sseTransport = new SSEClientTransport(new URL("http://localhost:8001/mcp/sse"));

  sseTransport.onmessage = (message) => {
    stdioTransport.send(message).catch(err => console.error('Error sending to stdio:', err));
  };
  
  stdioTransport.onmessage = (message) => {
    sseTransport.send(message).catch(err => console.error('Error sending to sse:', err));
  };

  sseTransport.onclose = () => {
    process.exit(0);
  };
  stdioTransport.onclose = () => {
    process.exit(0);
  };

  sseTransport.onerror = (err) => {
    console.error('SSE Error:', err);
  };
  stdioTransport.onerror = (err) => {
    console.error('Stdio Error:', err);
  };

  await sseTransport.start();
  await stdioTransport.start();
}

main().catch(err => {
  console.error("Fatal error starting bridge:", err);
  process.exit(1);
});
