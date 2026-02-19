import postgres from 'postgres'

const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres'

const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false }
})

async function run() {
    try {
        console.log('Connected to database...')

        // Create withdrawals table
        console.log('Creating withdrawals table...')
        await sql`
      CREATE TABLE IF NOT EXISTS public.withdrawals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES public.profiles(id) NOT NULL,
        amount numeric NOT NULL,
        wallet_address text NOT NULL,
        network text DEFAULT 'TRC20',
        status text CHECK (status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
        created_at timestamptz DEFAULT now(),
        processed_at timestamptz,
        notes text
      );
    `

        // Enable RLS
        await sql`ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;`

        // Policy: Users can view own withdrawals
        await sql`DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals`
        await sql`
      CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
      FOR SELECT USING (auth.uid() = user_id);
    `

        // Policy: Users can insert own withdrawals
        await sql`DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.withdrawals`
        await sql`
      CREATE POLICY "Users can insert own withdrawals" ON public.withdrawals
      FOR INSERT WITH CHECK (auth.uid() = user_id);
    `

        console.log('Withdrawals table setup completed successfully!')
    } catch (err) {
        console.error('Error setting up withdrawals table:', err)
    } finally {
        await sql.end()
    }
}

run()
