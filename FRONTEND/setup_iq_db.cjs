const postgres = require('postgres');

const sql = postgres('postgresql://postgres:[8JRDwROj5lc8jDuDXV8W3AZXP]@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres', { ssl: 'require' });

async function setup() {
    try {
        await sql`CREATE TABLE IF NOT EXISTS iq_bots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
        user_id UUID NOT NULL, 
        email TEXT NOT NULL, 
        password TEXT NOT NULL, 
        stake NUMERIC NOT NULL, 
        mode TEXT DEFAULT 'demo', 
        is_active BOOLEAN DEFAULT false, 
        created_at TIMESTAMPTZ DEFAULT NOW(), 
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );`;

        await sql`CREATE TABLE IF NOT EXISTS iq_trade_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
        bot_id UUID REFERENCES iq_bots(id), 
        result TEXT NOT NULL, 
        profit NUMERIC NOT NULL, 
        executed_at TIMESTAMPTZ DEFAULT NOW(), 
        pair TEXT NOT NULL, 
        amount NUMERIC NOT NULL
    );`;

        try {
            await sql`alter publication supabase_realtime add table iq_bots;`;
        } catch (e) {
            console.log('Realtime on iq_bots might already be enabled or another error occurred:', e.message);
        }

        try {
            await sql`alter publication supabase_realtime add table iq_trade_logs;`;
        } catch (e) {
            console.log('Realtime on iq_trade_logs might already be enabled or another error occurred:', e.message);
        }

        console.log('Tables created and realtime enabled successfully');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await sql.end();
    }
}

setup();
