import { Client } from 'pg';
import * as fs from 'fs';

async function updateAndVerify() {
    const client = new Client({
        connectionString: "postgresql://postgres:1CIwYGQv09MUQA@db.ypqekkkrfklaqlzhkbwg.supabase.co:5432/postgres" // HFT db
    });

    try {
        await client.connect();
        console.log("Connected to Supabase B");

        const sql = fs.readFileSync('c:/Users/brend/Videos/bot-strategy-hub/bot-strategy-hub/bot-strategy-hub/newimplement/banco de dados/08_view_grade_unificada.sql', 'utf8');
        await client.query(sql);
        console.log("View successfully updated!");

        const res = await client.query("SELECT pg_get_viewdef('hft_lake.vw_grade_unificada');");
        const def = res.rows[0].pg_get_viewdef;
        if (def.includes('rn = 1')) {
            console.log("VERIFIED: rn = 1 is present in the view definition.");
            fs.writeFileSync('c:/Users/brend/Videos/bot-strategy-hub/verify_success.txt', 'OK');
        } else {
            console.log("FAILED to find rn = 1 in view definition.");
        }
    } catch (err) {
        console.error("Error connecting or querying:", err);
    } finally {
        await client.end();
    }
}

updateAndVerify();
