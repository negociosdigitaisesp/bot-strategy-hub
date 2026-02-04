import postgres from 'postgres';

// Credentials provided by user
const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

const sql = postgres(connectionString);

// User ID from the console logs
const USER_ID = '66be291b-99c3-4c25-b8d3-2cecb2eb8333';

async function main() {
    try {
        console.log('🔧 Fixing User Plan Type...\n');

        // 1. Check current user data
        console.log('📊 Current user data:');
        const currentData = await sql`
            SELECT id, email, full_name, plan_type, subscription_status, trial_ends_at
            FROM public.profiles
            WHERE id = ${USER_ID};
        `;

        if (currentData.length === 0) {
            console.error('❌ User not found!');
            process.exit(1);
        }

        console.table(currentData[0]);

        // 2. Update user to PRO
        console.log('\n🔄 Updating user to PRO plan...');
        const updated = await sql`
            UPDATE public.profiles
            SET 
                plan_type = 'pro',
                subscription_status = 'active'
            WHERE id = ${USER_ID}
            RETURNING id, email, plan_type, subscription_status;
        `;

        console.log('\n✅ User updated successfully:');
        console.table(updated[0]);

        // 3. Verify the update
        console.log('\n🔍 Verifying update...');
        const verified = await sql`
            SELECT id, email, plan_type, subscription_status
            FROM public.profiles
            WHERE id = ${USER_ID};
        `;

        if (verified[0].plan_type === 'pro') {
            console.log('✅ VERIFICATION PASSED: User is now PRO');
        } else {
            console.error('❌ VERIFICATION FAILED: Update did not persist');
        }

        console.log('\n📝 Next Steps:');
        console.log('1. Ask user to refresh the page (F5)');
        console.log('2. Ask user to try connecting real account again');
        console.log('3. Check console logs - should show isPaidPlan: true');

    } catch (error) {
        console.error('❌ Error during update:', error);
        if (error.code) {
            console.error(`PG Code: ${error.code}, Message: ${error.message}`);
        }
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
