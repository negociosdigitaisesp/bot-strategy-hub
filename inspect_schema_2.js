import postgres from 'postgres';

const rawConnectionString = "postgresql://postgres:[aoidaoqidowqidowq]@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres";
const connectionString = rawConnectionString.replace(':[', ':').replace(']@', '@');

const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    max: 1
});

async function run() {
    try {
        console.log("Inspecting 'profiles' table columns...");
        const profilesCols = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'profiles'
        `;
        console.log("Profiles Columns:", profilesCols);

        console.log("Inspecting 'user_profiles' table columns...");
        const userProfilesCols = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user_profiles'
        `;
        console.log("User Profiles Columns:", userProfilesCols);

    } catch (err) {
        console.error("Inspection failed:", err);
    } finally {
        await sql.end();
    }
}

run();
