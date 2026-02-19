import postgres from 'postgres';

const connectionString = 'postgresql://postgres:8JRDwROj5lc8jDuDXV8W3AZXP@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

async function setupRLS() {
    const sql = postgres(connectionString);

    try {
        console.log('🔒 Setting up RLS policies...');

        // Enable RLS
        await sql`ALTER TABLE strategy_performance ENABLE ROW LEVEL SECURITY`;
        console.log('✅ RLS enabled');

        // Drop existing policies
        await sql`DROP POLICY IF EXISTS "Enable read access for all users" ON strategy_performance`;
        await sql`DROP POLICY IF EXISTS "Enable insert for service role" ON strategy_performance`;
        await sql`DROP POLICY IF EXISTS "Enable update for service role" ON strategy_performance`;
        console.log('✅ Dropped old policies');

        // Create public read policy
        await sql`
            CREATE POLICY "Enable read access for all users" 
            ON strategy_performance 
            FOR SELECT 
            USING (true)
        `;
        console.log('✅ Created public read policy');

        // Create service role policies
        await sql`
            CREATE POLICY "Enable insert for service role" 
            ON strategy_performance 
            FOR INSERT 
            WITH CHECK (true)
        `;

        await sql`
            CREATE POLICY "Enable update for service role" 
            ON strategy_performance 
            FOR UPDATE 
            USING (true)
        `;
        console.log('✅ Created service role policies');

        // Verify
        const policies = await sql`
            SELECT schemaname, tablename, policyname, permissive, roles, cmd
            FROM pg_policies
            WHERE tablename = 'strategy_performance'
        `;

        console.log('\n📋 Current policies:');
        console.table(policies);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sql.end();
    }
}

setupRLS();
