import postgres from 'postgres'

const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres'

const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false }
})

async function run() {
    try {
        console.log('Connected to database...')
        console.log('Setting up pending balance system (20 days hold)...')

        // 1. Add pending_balance column to profiles
        console.log('Adding pending_balance column to profiles...')
        await sql`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS pending_balance numeric DEFAULT 0.00;
    `
        console.log('✅ pending_balance column added')

        // 2. Create release function (20 days)
        console.log('Creating release_pending_commissions function...')
        await sql`
      CREATE OR REPLACE FUNCTION release_pending_commissions()
      RETURNS void AS $$
      BEGIN
        -- A) Update user balances (Pending -> Available)
        UPDATE public.profiles p
        SET 
            affiliate_balance = affiliate_balance + t.amount,
            pending_balance = pending_balance - t.amount
        FROM public.referral_transactions t
        WHERE p.id = t.user_id
        AND t.status = 'pending'
        AND t.created_at < (NOW() - interval '20 days');

        -- B) Mark transactions as 'available' (Released)
        UPDATE public.referral_transactions
        SET status = 'available'
        WHERE status = 'pending'
        AND created_at < (NOW() - interval '20 days');
        
        RAISE NOTICE 'Pending commissions released successfully';
      END;
      $$ LANGUAGE plpgsql;
    `
        console.log('✅ Release function created (20 day hold period)')

        // 3. Update withdrawal status options
        console.log('Updating withdrawal status options...')
        await sql`
      DO $$ 
      BEGIN
        ALTER TABLE public.withdrawals 
        DROP CONSTRAINT IF EXISTS withdrawals_status_check;
        
        ALTER TABLE public.withdrawals 
        ADD CONSTRAINT withdrawals_status_check 
        CHECK (status IN ('pending', 'processing', 'completed', 'rejected'));
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `
        console.log('✅ Withdrawal constraints updated')

        console.log('')
        console.log('🎯 Pending balance system activated!')
        console.log('   ├─ pending_balance column created')
        console.log('   ├─ 20-day hold period configured')
        console.log('   └─ Release function ready')
        console.log('')
        console.log('📋 Next steps:')
        console.log('   1. Update hotmart-webhook to use pending_balance')
        console.log('   2. Update frontend to show pending vs available')
        console.log('   3. Setup cron job: SELECT release_pending_commissions();')
        console.log('')
        console.log('⏰ Run daily: SELECT release_pending_commissions();')

    } catch (err) {
        console.error('❌ Error:', err.message || err)
    } finally {
        await sql.end()
    }
}

run()
