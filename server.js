import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";

const app = express();
app.use(express.json());

const transports = {};

function createServer() {
  const server = new McpServer({
    name: "sat20-ping-test",
    version: "1.0.0"
  });

  server.tool("ping", "Responde pong para verificar conectividad", {}, async () => {
    return {
      content: [{ type: "text", text: "pong" }]
    };
  });

  return server;
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    tool: "ping",
    activeSessions: Object.keys(transports).length
  });
});

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  const server = createServer();

  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SAT-20 Ping Test running on port ${PORT}`);
});
