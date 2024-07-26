import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { Server } from "socket.io";
import { getDb, initDb } from "./db";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

io.on("connection", async (socket) => {
  socket.on("chat message", async (msg) => {
    let result;
    try {
      const db = getDb();
      // store the message in the database
      result = await db.run("INSERT INTO messages (content) VALUES (?)", msg);
    } catch (e) {
      // TODO handle the failure
      return;
    }
    // include the offset with the message
    io.emit("chat message", msg, result.lastID);
  });

  if (!socket.recovered) {
    // if the connection state recovery was not successful
    try {
      const db = getDb();
      await db.each(
        "SELECT id, content FROM messages WHERE id > ?",
        [socket.handshake.auth.serverOffset || 0],
        (_err, row) => {
          socket.emit("chat message", row.content, row.id);
        }
      );
    } catch (e) {
      // something went wrong
    }
  }
});

initDb()
  .then(() => {
    server.listen(3000, () => {
      console.log("Server running at http://localhost:3000");
    });
  })
  .catch((err) => {
    console.error("Failed to initialize the database:", err);
  });
