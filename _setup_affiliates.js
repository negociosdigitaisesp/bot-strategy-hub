import postgres from 'postgres'

const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres'

const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false }
})

async function run() {
    try {
        console.log('Connected to database...')

        // 1. Alter profiles
        console.log('Altering profiles table...')
        await sql`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS affiliate_code text UNIQUE,
      ADD COLUMN IF NOT EXISTS affiliate_balance numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_earnings numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);
    `

        // 2. Create referral_transactions
        console.log('Creating referral_transactions table...')
        await sql`
      CREATE TABLE IF NOT EXISTS public.referral_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES public.profiles(id),
        source_user_id uuid REFERENCES public.profiles(id),
        amount numeric NOT NULL,
        currency text DEFAULT 'USD',
        status text CHECK (status IN ('pending', 'paid', 'canceled')) DEFAULT 'pending',
        origin text CHECK (origin IN ('hotmart', 'crypto', 'manual')),
        created_at timestamptz DEFAULT now()
      );
    `

        // Enable RLS
        await sql`ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;`

        // Policy
        console.log('Setting up RLS policies...')
        await sql`DROP POLICY IF EXISTS "Users can view own transactions" ON public.referral_transactions`
        await sql`
      CREATE POLICY "Users can view own transactions" ON public.referral_transactions
      FOR SELECT USING (auth.uid() = user_id);
    `

        // 3. Trigger for affiliate_code
        console.log('Setting up code generation trigger...')

        // Create Function
        await sql`
      CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
      RETURNS TRIGGER AS $$
      DECLARE
        new_code text;
        exists_code boolean;
      BEGIN
        LOOP
            -- Generate 6 char random string (using md5 of random)
            new_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
            
            SELECT EXISTS (SELECT 1 FROM public.profiles WHERE affiliate_code = new_code) INTO exists_code;
            
            IF NOT exists_code THEN
                NEW.affiliate_code := new_code;
                EXIT;
            END IF;
        END LOOP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql security definer;
    `

        // Create Trigger
        await sql`DROP TRIGGER IF EXISTS on_profile_created_generate_code ON public.profiles`
        await sql`
      CREATE TRIGGER on_profile_created_generate_code
      BEFORE INSERT ON public.profiles
      FOR EACH ROW
      WHEN (NEW.affiliate_code IS NULL)
      EXECUTE FUNCTION public.generate_affiliate_code();
    `

        // Backfill
        console.log('Backfilling existing profiles...')
        await sql`
      DO $$
      DECLARE 
        r RECORD;
        new_code text;
        exists_code boolean;
      BEGIN
        FOR r IN SELECT id FROM public.profiles WHERE affiliate_code IS NULL LOOP
            LOOP
                new_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
                SELECT EXISTS (SELECT 1 FROM public.profiles WHERE affiliate_code = new_code) INTO exists_code;
                IF NOT exists_code THEN
                    UPDATE public.profiles SET affiliate_code = new_code WHERE id = r.id;
                    EXIT;
                END IF;
            END LOOP;
        END LOOP;
      END $$;
    `

        console.log('Affiliate system setup completed successfully!')
    } catch (err) {
        console.error('Error setting up affiliate system:', err)
    } finally {
        await sql.end()
    }
}

run()
