import postgres from 'postgres';

// Credentials provided by user
const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

const sql = postgres(connectionString);

async function main() {
    try {
        console.log('🚀 Iniciando Correção Final (Schema + Storage)...');

        // 1. Adicionar Colunas Faltantes
        console.log('Verificando colunas na tabela public.profiles...');

        await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;`;
        console.log('✅ Coluna avatar_url verificada/adicionada.');

        await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;`;
        console.log('✅ Coluna full_name verificada/adicionada.');

        await sql`ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expiration_date timestamp with time zone;`;
        console.log('✅ Coluna expiration_date verificada/adicionada.');

        // Notificar PostgREST para recarregar o schema cache
        console.log('🔄 Recarregando cache do PostgREST...');
        await sql`NOTIFY pgrst, 'reload config';`;
        console.log('✅ Cache notificado.');

        // 2. Aumentar Limite do Storage e garantir publicidade
        console.log('Ajustando bucket avatars...');
        const bucketUpdate = await sql`
      UPDATE storage.buckets 
      SET file_size_limit = 5242880, public = true 
      WHERE name = 'avatars'
      RETURNING name, file_size_limit, public;
    `;

        if (bucketUpdate.length > 0) {
            console.log(`✅ Bucket atualizado: Limit=${bucketUpdate[0].file_size_limit} bytes (5MB), Public=${bucketUpdate[0].public}`);
        } else {
            console.log('⚠️ Bucket "avatars" não encontrado para atualização? Tente criar primeiro se não existir.');
        }

        // 3. Validação Final
        console.log('\n🔍 Validando Estrutura Final...');
        const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles';
    `;

        console.log('Colunas atuais na tabela profiles:');
        if (columns.length === 0) {
            console.error('❌ Tabela profiles parece não existir ou não tem colunas!');
        } else {
            columns.forEach(col => {
                console.log(` - ${col.column_name} (${col.data_type})`);
            });
        }

        // Verificar uma policy só pra ter certeza
        const policies = await sql`SELECT policyname FROM pg_policies WHERE tablename = 'profiles'`;
        console.log(`\nTotal de Policies na tabela: ${policies.length}`);

        console.log('\n🎉 Correção Final concluída com sucesso!');

    } catch (error) {
        console.error('❌ Erro durante a correção final:', error);
        // Mostrar detalhes se for erro do Postgres
        if (error.code) {
            console.error(`PG Code: ${error.code}, Message: ${error.message}`);
        }
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
