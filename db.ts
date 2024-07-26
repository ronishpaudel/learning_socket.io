import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";

let db: Database<sqlite3.Database, sqlite3.Statement>;

export async function initDb() {
  db = await open({
    filename: "chat.db",
    driver: sqlite3.Database,
  });

  // Create our 'messages' table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_offset TEXT UNIQUE,
        content TEXT
    );
  `);

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDb first.");
  }
  return db;
}
