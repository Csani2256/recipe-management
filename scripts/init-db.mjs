import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL hiányzik!');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function run() {
  const drizzleDir = './drizzle';
  if (!fs.existsSync(drizzleDir)) {
    console.error('A ./drizzle mappa nem létezik.');
    process.exit(1);
  }
  const files = fs.readdirSync(drizzleDir).filter(f => f.endsWith('.sql'));
  for (const file of files) {
    console.log('Migráció futtatása:', file);
    const content = fs.readFileSync(path.join(drizzleDir, file), 'utf8');
    const statements = content.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      await sql.query(stmt);
    }
  }
  console.log('Sikeresen létrehozva az összes tábla az adatbázisban!');
}

run().catch(console.error);
