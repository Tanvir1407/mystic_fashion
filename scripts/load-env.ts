import fs from 'fs';
import path from 'path';

function loadEnv() {
  if (process.env.DATABASE_URL) return; // Already loaded or set in environment
  try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index === -1) return;
        const key = trimmed.slice(0, index).trim();
        const val = trimmed.slice(index + 1).trim();
        const cleanedVal = val.replace(/^["']|["']$/g, '');
        process.env[key] = cleanedVal;
      });
    }
  } catch (err) {
    console.error('Failed to load .env file:', err);
  }
}

loadEnv();
