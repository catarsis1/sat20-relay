import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { randomUUID } from "crypto";

const app = express();
app.use(express.json());

const sessions = new Map();

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
    activeSessions: sessions.size
  });
});

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId).handleRequest(req, res);
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  const server = createServer();
  await server.connect(transport);

  sessions.set(transport.sessionId, transport);

  transport.on("close", () => {
    sessions.delete(transport.sessionId);
  });

  await transport.handleRequest(req, res);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId).handleRequest(req, res);
  } else {
    res.status(400).json({ error: "No session. POST first." });
  }
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId).handleRequest(req, res);
    sessions.delete(sessionId);
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SAT-20 Ping Test (Streamable HTTP) running on port ${PORT}`);
});
