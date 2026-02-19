import postgres from 'postgres'

const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres'

const sql = postgres(connectionString, {
    ssl: { rejectUnauthorized: false }
})

async function run() {
    try {
        console.log('Connected to database...')
        console.log('Updating handle_new_user trigger function...')

        // Drop old function if exists and create new one
        await sql`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      DECLARE
        referrer_id uuid;
        code_used text;
      BEGIN
        -- 1. Tenta pegar o código de afiliado dos metadados (se houver)
        code_used := new.raw_user_meta_data->>'referral_code';
        
        -- 2. Se tiver código, busca quem é o dono (O Pai)
        IF code_used IS NOT NULL THEN
          SELECT id INTO referrer_id FROM public.profiles WHERE affiliate_code = code_used;
          RAISE NOTICE 'Referral code % resolved to user %', code_used, referrer_id;
        END IF;

        -- 3. Insere o novo perfil com Email e Indicação
        INSERT INTO public.profiles (id, email, full_name, plan_type, trial_ends_at, referred_by)
        VALUES (
          new.id,
          new.email,
          COALESCE(new.raw_user_meta_data->>'full_name', 'Novo Usuário'),
          'free',
          (NOW() + interval '3 days'),
          referrer_id
        )
        ON CONFLICT (id) DO UPDATE
        SET 
          email = EXCLUDED.email,
          referred_by = COALESCE(public.profiles.referred_by, EXCLUDED.referred_by);
          
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

        console.log('✅ Trigger function updated successfully!')

        // Check if trigger exists
        console.log('Checking if trigger exists on auth.users...')

        const result = await sql`
      SELECT COUNT(*) as count
      FROM information_schema.triggers 
      WHERE event_object_table = 'users' 
      AND event_object_schema = 'auth'
      AND trigger_name = 'on_auth_user_created'
    `

        const triggerExists = result[0].count > 0

        if (!triggerExists) {
            console.log('Creating trigger on auth.users...')
            await sql`
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
      `
            console.log('✅ Trigger created!')
        } else {
            console.log('✅ Trigger already exists')
        }

        console.log('')
        console.log('🎯 Affiliate tracking trigger is now active!')
        console.log('   - Email will be saved to profiles table')
        console.log('   - referral_code from auth metadata will be resolved')
        console.log('   - referred_by will be set automatically on signup')
        console.log('')
        console.log('Next signup will include affiliate tracking!')
    } catch (err) {
        console.error('❌ Error:', err.message || err)
    } finally {
        await sql.end()
    }
}

run()
