/**
 * Executa o schema SQL do IQ Bot diretamente no Supabase via PostgreSQL.
 * Uso: node supabase/run_iq_schema.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = 'postgresql://postgres:8JRDwROj5lc8jDuDXV8W3AZXP@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

const sqlPath = path.join(__dirname, 'iq_bot_schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function main() {
    const client = new Client({
        connectionString: DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🔌 Conectando ao Supabase...');
        await client.connect();
        console.log('✅ Conectado!\n');

        console.log('⚙️  Executando schema IQ Bot...');
        const result = await client.query(sql);

        /* Mostrar resultado da query final (contagem de linhas) */
        const rows = Array.isArray(result) ? result[result.length - 1]?.rows : result.rows;
        if (rows && rows.length > 0) {
            console.log('\n📊 Tabelas criadas:');
            rows.forEach(r => console.log(`   ${r.tabela}: ${r.linhas} linha(s)`));
        }

        console.log('\n✅ Schema aplicado com sucesso!');
        console.log('✅ RLS habilitado');
        console.log('✅ Realtime habilitado para iq_bots e iq_trade_logs');
    } catch (err) {
        console.error('❌ Erro:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
