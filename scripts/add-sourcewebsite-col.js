// One-shot migration: add sourceWebsite column to NewsItem table
// Works by opening the SQLite file directly with better-sqlite3 or the built-in
// Node.js sqlite module (available Node 22+)
const path = require('path')
const dbPath = path.resolve(__dirname, '../db/custom.db')

async function main() {
  // Node 22+ has built-in sqlite
  let db
  try {
    const { DatabaseSync } = require('node:sqlite')
    db = new DatabaseSync(dbPath)
    db.exec(`ALTER TABLE "NewsItem" ADD COLUMN "sourceWebsite" TEXT NOT NULL DEFAULT '';`)
    console.log('OK: sourceWebsite column added via node:sqlite')
    db.close()
  } catch (e) {
    // Column already exists — that's fine
    if (String(e).includes('duplicate column')) {
      console.log('SKIP: sourceWebsite column already exists')
    } else {
      throw e
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

