/**
 * Emergency Fix: Add onboarding_progress column to profiles table
 * Run with: node _fix_onboarding_column.js
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function fixOnboardingColumn() {
    console.log('🔧 Adicionando coluna onboarding_progress...\n');

    try {
        // Use raw SQL to add the column
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS onboarding_progress integer[] DEFAULT '{}';
      `
        });

        if (error) {
            console.error('❌ Erro ao adicionar coluna via RPC:', error.message);
            console.log('\n📋 Execute este SQL manualmente no Supabase Dashboard:');
            console.log(`
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_progress integer[] DEFAULT '{}';
      `);
            process.exit(1);
        }

        console.log('✅ Coluna adicionada com sucesso!');

        // Verify
        const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('id, onboarding_progress')
            .limit(1);

        if (testError) {
            console.error('❌ Erro ao verificar:', testError.message);
        } else {
            console.log('✅ Verificação OK:', testData);
        }

        console.log('\n✅ CORREÇÃO CONCLUÍDA!');
        console.log('🔄 Recarregue a página no navegador');

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

fixOnboardingColumn();
