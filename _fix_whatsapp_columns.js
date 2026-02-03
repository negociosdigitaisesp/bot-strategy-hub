/**
 * Emergency Fix: Add WhatsApp columns to profiles table
 * Run with: node _fix_whatsapp_columns.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixWhatsAppColumns() {
    console.log('🔧 Iniciando correção das colunas WhatsApp...\n');

    try {
        // Step 1: Add columns if they don't exist
        console.log('📝 Adicionando colunas whatsapp_number e wa_status...');

        const { error: alterError } = await supabase.rpc('exec_sql', {
            sql: `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS whatsapp_number text,
        ADD COLUMN IF NOT EXISTS wa_status text DEFAULT 'pending_verification';
      `
        });

        if (alterError) {
            // If RPC doesn't exist, try direct SQL execution
            console.log('⚠️  RPC não disponível, tentando via SQL direto...');

            const { error: directError } = await supabase
                .from('profiles')
                .select('whatsapp_number, wa_status')
                .limit(1);

            if (directError && directError.message.includes('column')) {
                console.error('❌ Erro: As colunas não existem e não podem ser criadas via API.');
                console.error('   Você precisa executar este SQL manualmente no Supabase Dashboard:');
                console.log('\n--- COPIE E EXECUTE NO SQL EDITOR ---');
                console.log(`
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS wa_status text DEFAULT 'pending_verification';
        `);
                console.log('--- FIM DO SQL ---\n');
                process.exit(1);
            }
        }

        // Step 2: Verify columns exist
        console.log('✅ Verificando estrutura da tabela...');
        const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('id, whatsapp_number, wa_status')
            .limit(1);

        if (testError) {
            console.error('❌ Erro ao verificar colunas:', testError.message);
            console.log('\n🔍 Execute este SQL no Supabase Dashboard > SQL Editor:');
            console.log(`
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS wa_status text DEFAULT 'pending_verification';
      `);
            process.exit(1);
        }

        console.log('✅ Colunas verificadas com sucesso!');
        console.log('📊 Estrutura atual:', testData);

        // Step 3: Check RLS policies
        console.log('\n🔒 Verificando políticas RLS...');
        const { data: policies, error: policyError } = await supabase
            .rpc('exec_sql', {
                sql: `
          SELECT policyname, cmd 
          FROM pg_policies 
          WHERE tablename = 'profiles' AND cmd = 'UPDATE';
        `
            });

        if (!policyError && policies) {
            console.log('✅ Políticas RLS encontradas:', policies);
        }

        console.log('\n✅ CORREÇÃO CONCLUÍDA!');
        console.log('🔄 Reinicie o servidor de desenvolvimento (npm run dev)');

    } catch (error) {
        console.error('❌ Erro inesperado:', error);
        console.log('\n⚠️  SOLUÇÃO MANUAL NECESSÁRIA:');
        console.log('1. Acesse: https://supabase.com/dashboard');
        console.log('2. Vá para SQL Editor');
        console.log('3. Execute este código:');
        console.log(`
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS wa_status text DEFAULT 'pending_verification';
    `);
        process.exit(1);
    }
}

fixWhatsAppColumns();
