import postgres from 'postgres';

// Credentials provided by user
const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

const sql = postgres(connectionString);

async function main() {
    try {
        console.log('🚀 Iniciando correção de permissões (RLS)...');

        // 1. Correção Storage (O erro principal provavelmente é aqui)
        console.log('Configurando policies para Storage (avatars)...');

        // STORAGE POLICIES
        // Primeiro, vamos permitir INSERT para autenticados no bucket avatars
        await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload avatars'
        ) THEN
          CREATE POLICY "Authenticated users can upload avatars" 
          ON storage.objects FOR INSERT 
          TO authenticated 
          WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can update their own avatars'
        ) THEN
          CREATE POLICY "Users can update their own avatars" 
          ON storage.objects FOR UPDATE
          TO authenticated 
          USING (bucket_id = 'avatars' AND auth.uid() = owner);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can select their own avatars'
        ) THEN
          CREATE POLICY "Users can select their own avatars" 
          ON storage.objects FOR SELECT
          TO authenticated 
          USING (bucket_id = 'avatars');
          -- Nota: Como o bucket é public, qualquer um pode baixar pela URL pública, mas isso ajuda no client.from('avatars').list()
        END IF;
      END
      $$;
    `;
        console.log('✅ Policies de Storage criadas.');

        // 2. Reforço Tabela Profiles (Garantir que não é aqui o erro)
        console.log('Reforçando policies da tabela Profiles...');
        await sql`
      DO $$
      BEGIN
        -- Garantir Policy de Update correta (usando CHECK e USING)
        IF EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile.'
        ) THEN
            -- Vamos dropar e recriar para garantir que está certa
            DROP POLICY "Users can update their own profile." ON public.profiles;
        END IF;
        
        CREATE POLICY "Users can update their own profile." 
        ON public.profiles FOR UPDATE 
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
        
        -- Garantir Policy de Insert (caso o trigger não tenha funcionado e o front tente criar)
        -- OBS: O front atual usa UPDATE e o trigger cria. Mas vamos deixar um INSERT permissivo apenas por segurança (UPSERT)
         IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile.'
        ) THEN
            CREATE POLICY "Users can insert their own profile." 
            ON public.profiles FOR INSERT 
            WITH CHECK (auth.uid() = id);
        END IF;

      END
      $$;
    `;
        console.log('✅ Policies de Profiles reforçadas.');

        console.log('\n🎉 Correções aplicadas com sucesso!');

    } catch (error) {
        console.error('❌ Erro durante a correção:', error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
