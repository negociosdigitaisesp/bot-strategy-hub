import postgres from 'postgres';

// Credentials provided by user (reusing form previous context)
const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

const sql = postgres(connectionString);

async function main() {
    try {
        console.log('🚀 Iniciando Configuração de Planos (DB)...');

        // 1. ALTERAÇÃO NA TABELA public.profiles
        console.log('📦 Atualizando estrutura da tabela profiles...');

        await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'free';`;
        console.log('  - Coluna plan_type adicionada.');

        await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;`;
        console.log('  - Coluna trial_ends_at adicionada.');

        await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';`;
        console.log('  - Coluna subscription_status adicionada.');

        // 2. CRIAÇÃO DE TRIGGER (Automação de Trial)
        console.log('⚡ Configurando Trigger de Automação...');

        // Primeiro, vamos criar/atualizar a função que a trigger vai chamar.
        // Estamos substituindo a lógica anterior para incluir os campos de plano.
        await sql`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (
            id, 
            full_name, 
            avatar_url, 
            email, -- Tentativa de pegar email se a coluna existir, mas o Trigger auth.users tem o campo email
            plan_type,
            trial_ends_at,
            subscription_status
        )
        VALUES (
            new.id, 
            new.raw_user_meta_data->>'full_name', 
            new.raw_user_meta_data->>'avatar_url',
            new.email, -- auth.users tem email
            'free',
            NOW() + INTERVAL '3 days',
            'active'
        )
        ON CONFLICT (id) DO UPDATE SET
            plan_type = EXCLUDED.plan_type,
            trial_ends_at = EXCLUDED.trial_ends_at;
            
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
        console.log('  - Função handle_new_user atualizada.');

        // Agora a Trigger.
        // Vamos remover a trigger antiga (se tiver outro nome) e garantir a nova ou manter a consistência.
        // O usuário pediu o nome `on_auth_user_created_set_trial`.

        // Remove triggers antigos para evitar duplicidade
        await sql`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;`;
        await sql`DROP TRIGGER IF EXISTS on_auth_user_created_set_trial ON auth.users;`;

        await sql`
      CREATE TRIGGER on_auth_user_created_set_trial
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    `;
        console.log('  - Trigger on_auth_user_created_set_trial criada com sucesso.');

        // 3. MIGRAÇÃO DE USUÁRIOS ANTIGOS (Backfill)
        console.log('🔄 Migrando usuários existentes (Backfill)...');

        // Antes de atualizar, vamos garantir que a coluna email exista na tabela profiles, 
        // pois usei no trigger acima. Se não existir, crio agora, pois é útil.
        await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;`;

        // Agora o Backfill
        const result = await sql`
        UPDATE public.profiles
        SET 
            plan_type = 'free',
            trial_ends_at = NOW() + INTERVAL '3 days',
            subscription_status = 'active'
        WHERE plan_type IS NULL OR plan_type = '';
    `;

        console.log(`  - Backfill concluído. ${result.count} usuários atualizados com 3 dias de cortesia.`);

        // Recarregar schema cache
        await sql`NOTIFY pgrst, 'reload config';`;
        console.log('✅ Schema Cache recarregado.');

        console.log('\n🎉 Setup de Planos concluído!');

    } catch (error) {
        console.error('❌ Erro crítico no setup de planos:', error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
