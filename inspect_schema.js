import postgres from 'postgres';

const rawConnectionString = "postgresql://postgres:[aoidaoqidowqidowq]@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres";
const connectionString = rawConnectionString.replace(':[', ':').replace(']@', '@');

const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    max: 1
});

async function run() {
    try {
        console.log("Inspecting 'operacoes' table columns...");
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'operacoes'
        `;

        console.log("Columns found:", columns);

    } catch (err) {
        console.error("Inspection failed:", err);
    } finally {
        await sql.end();
    }
}

run();
