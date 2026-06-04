import pg from "pg";
import fs from "fs";
import path from "path";

// Load .env file manually
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

console.log("DB URL:", process.env.DATABASE_URL);

async function testConnection() {
  // Test with connectionString
  console.log("Testing with connectionString...");
  const pool1 = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool1.query("SELECT current_database(), current_user;");
    console.log("Pool1 Success:", res.rows);
  } catch (e: any) {
    console.error("Pool1 Error:", e.message);
  } finally {
    await pool1.end();
  }

  // Test with structured config
  console.log("Testing with structured config...");
  const pool2 = new pg.Pool({
    user: "mdtanvir",
    host: "localhost",
    database: "mystic",
    port: 5432,
  });
  try {
    const res = await pool2.query("SELECT current_database(), current_user;");
    console.log("Pool2 Success:", res.rows);
  } catch (e: any) {
    console.error("Pool2 Error:", e.message);
  } finally {
    await pool2.end();
  }
}

testConnection();
