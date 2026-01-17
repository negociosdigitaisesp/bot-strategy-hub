import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// User provided connection string:
// postgresql://postgres:[aoidaoqidowqidowq]@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres
// I will ensure brackets are removed if they are placeholders not part of the password.
// Typically brackets in "[password]" mean "replace this". 
// But "aoidaoqidowqidowq" looks like a password.
// I will assume the password is "aoidaoqidowqidowq".

const rawConnectionString = "postgresql://postgres:[aoidaoqidowqidowq]@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres";
const connectionString = rawConnectionString.replace(':[', ':').replace(']@', '@');

console.log("Attempting to connect to database...");

const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false }, // Supabase often requires SSL
    max: 1
});

async function run() {
    try {
        const migrationPath = path.join(__dirname, 'supabase', 'migrations', 'security_hardening_20260116.sql');
        console.log(`Reading migration file from: ${migrationPath}`);

        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found at ${migrationPath}`);
        }

        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        console.log("Migration file read. Executing SQL...");

        // Using simple exec for the multi-statement SQL
        await sql.unsafe(migrationSql);

        console.log("✅ SOLID SECURITY APPLIED: Migration executed successfully!");
        console.log("RLS enabled on profiles and operacoes. Secure RPC function created.");

    } catch (err) {
        console.error("❌ Migration failed!");
        console.error(err);
    } finally {
        await sql.end();
    }
}

run();
