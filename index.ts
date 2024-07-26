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
  socket.on("chat message", async (msg, clientOffset, callback) => {
    let result;
    try {
      const db = getDb();
      // Store the message in the database
      result = await db.run(
        "INSERT INTO messages (content, client_offset) VALUES (?, ?)",
        msg,
        clientOffset
      );
    } catch (e) {
      if (
        e instanceof Error &&
        (e as any).errno === 19 /* SQLITE_CONSTRAINT */
      ) {
        // The message was already inserted, so we notify the client
        callback();
      } else {
        console.error("Database error: ", e);
        // Nothing to do, just let the client retry
      }
      return;
    }
    // Include the offset with the message
    io.emit("chat message", msg, result.lastID);
    // Acknowledge the event
    callback();
  });

  if (!socket.recovered) {
    // If the connection state recovery was not successful
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
      console.error("Database query error: ", e);
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
