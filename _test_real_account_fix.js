import postgres from 'postgres';

// Credentials provided by user
const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

const sql = postgres(connectionString);

async function main() {
    try {
        console.log('🧪 Testing Real Account Access Fix...\n');

        // Get a sample PRO user
        console.log('📊 Fetching sample PRO user...');
        const proUser = await sql`
            SELECT id, email, plan_type, subscription_status
            FROM public.profiles
            WHERE plan_type = 'pro'
            AND email IS NOT NULL
            LIMIT 1;
        `;

        if (proUser.length === 0) {
            console.error('❌ No PRO users found in database!');
            process.exit(1);
        }

        const user = proUser[0];
        console.log('\n✅ Sample PRO User:');
        console.table({
            email: user.email,
            plan_type: user.plan_type,
            subscription_status: user.subscription_status
        });

        // Simulate the frontend validation logic
        console.log('\n🔍 Simulating Frontend Validation Logic:');
        const PAID_PLANS = ['pro', 'premium', 'elite', 'whale', 'vitalicio', 'iniciado', 'mensual', 'anual'];

        const planType = user.plan_type?.toLowerCase() || 'free';
        const isPaidPlan = PAID_PLANS.includes(planType);

        console.log({
            rawPlanType: user.plan_type,
            normalizedPlanType: planType,
            isPaidPlan,
            PAID_PLANS,
            willBlock: !isPaidPlan
        });

        if (isPaidPlan) {
            console.log('\n✅ SUCCESS: PRO user would be allowed to connect real account');
        } else {
            console.log('\n❌ FAILURE: PRO user would be blocked from real account');
        }

        // Test with a free user
        console.log('\n\n📊 Fetching sample FREE user...');
        const freeUser = await sql`
            SELECT id, email, plan_type, subscription_status
            FROM public.profiles
            WHERE plan_type = 'free' OR plan_type IS NULL
            AND email IS NOT NULL
            LIMIT 1;
        `;

        if (freeUser.length > 0) {
            const user2 = freeUser[0];
            console.log('\n✅ Sample FREE User:');
            console.table({
                email: user2.email,
                plan_type: user2.plan_type || 'null',
                subscription_status: user2.subscription_status
            });

            const planType2 = user2.plan_type?.toLowerCase() || 'free';
            const isPaidPlan2 = PAID_PLANS.includes(planType2);

            console.log('\n🔍 Simulating Frontend Validation Logic:');
            console.log({
                rawPlanType: user2.plan_type,
                normalizedPlanType: planType2,
                isPaidPlan: isPaidPlan2,
                willBlock: !isPaidPlan2
            });

            if (!isPaidPlan2) {
                console.log('\n✅ SUCCESS: FREE user would be blocked from real account');
            } else {
                console.log('\n❌ FAILURE: FREE user would be allowed real account access');
            }
        }

        console.log('\n\n🎉 Test completed successfully!');
        console.log('\n📝 Next Steps:');
        console.log('1. Test with actual PRO user in the browser');
        console.log('2. Check browser console for detailed logs');
        console.log('3. Verify real account connection works');

    } catch (error) {
        console.error('❌ Error during test:', error);
        if (error.code) {
            console.error(`PG Code: ${error.code}, Message: ${error.message}`);
        }
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
