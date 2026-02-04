import postgres from 'postgres';

// Credentials provided by user
const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

const sql = postgres(connectionString);

async function main() {
    try {
        console.log('🔍 Checking for Users Who Should Be PRO...\n');

        // Check for users who might need plan correction
        // This looks for users who have "Vitalicio" or similar indicators but are marked as free
        console.log('📊 Looking for users with PRO indicators but free plan_type...');

        const suspectUsers = await sql`
            SELECT 
                id, 
                email, 
                full_name,
                plan_type,
                subscription_status,
                created_at
            FROM public.profiles
            WHERE 
                (
                    full_name ILIKE '%vitalicio%' 
                    OR full_name ILIKE '%diamante%'
                    OR full_name ILIKE '%pro%'
                    OR full_name ILIKE '%premium%'
                )
                AND (plan_type = 'free' OR plan_type IS NULL)
            ORDER BY created_at DESC
            LIMIT 20;
        `;

        if (suspectUsers.length === 0) {
            console.log('✅ No suspicious cases found.');
        } else {
            console.log(`⚠️ Found ${suspectUsers.length} users who might need plan correction:`);
            console.table(suspectUsers.map(u => ({
                full_name: u.full_name,
                email: u.email || 'N/A',
                plan_type: u.plan_type || 'null',
                subscription_status: u.subscription_status
            })));

            console.log('\n💡 If these users should be PRO, update them manually or contact support.');
        }

        // Summary of all plan types
        console.log('\n📋 Current Plan Distribution:');
        const distribution = await sql`
            SELECT 
                COALESCE(plan_type, 'null') as plan_type,
                COUNT(*) as count
            FROM public.profiles
            GROUP BY plan_type
            ORDER BY count DESC;
        `;
        console.table(distribution);

        console.log('\n✅ Check completed.');

    } catch (error) {
        console.error('❌ Error during check:', error);
        if (error.code) {
            console.error(`PG Code: ${error.code}, Message: ${error.message}`);
        }
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
