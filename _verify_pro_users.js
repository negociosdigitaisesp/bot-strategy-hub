import postgres from 'postgres';

// Credentials provided by user
const connectionString = 'postgresql://postgres:aoidaoqidowqidowq@db.xwclmxjeombwabfdvyij.supabase.co:5432/postgres';

const sql = postgres(connectionString);

async function main() {
    try {
        console.log('🔍 Verificando Planos de Usuarios PRO...\n');

        // 1. Check all distinct plan types in the database
        console.log('📊 Tipos de planos existentes en la base de datos:');
        const planTypes = await sql`
            SELECT DISTINCT plan_type, COUNT(*) as user_count
            FROM public.profiles
            WHERE plan_type IS NOT NULL
            GROUP BY plan_type
            ORDER BY user_count DESC;
        `;

        if (planTypes.length === 0) {
            console.log('⚠️ No se encontraron usuarios con plan_type definido.');
        } else {
            console.table(planTypes);
        }

        // 2. Check for users who should be PRO
        console.log('\n🔍 Buscando usuarios que deberían tener acceso PRO:');
        const proUsers = await sql`
            SELECT id, email, plan_type, subscription_status, trial_ends_at, created_at
            FROM public.profiles
            WHERE plan_type IN ('pro', 'premium', 'elite', 'whale', 'vitalicio', 'iniciado', 'mensual', 'anual')
            ORDER BY created_at DESC
            LIMIT 20;
        `;

        if (proUsers.length === 0) {
            console.log('⚠️ No se encontraron usuarios PRO.');
        } else {
            console.log(`✅ Encontrados ${proUsers.length} usuarios PRO:`);
            console.table(proUsers.map(u => ({
                email: u.email,
                plan_type: u.plan_type,
                status: u.subscription_status,
                trial_ends: u.trial_ends_at ? new Date(u.trial_ends_at).toISOString() : 'N/A'
            })));
        }

        // 3. Check for users with unexpected plan types
        console.log('\n⚠️ Usuarios con tipos de plan no estándar:');
        const unexpectedPlans = await sql`
            SELECT id, email, plan_type, subscription_status
            FROM public.profiles
            WHERE plan_type IS NOT NULL 
            AND plan_type NOT IN ('free', 'pro', 'premium', 'elite', 'whale', 'vitalicio', 'iniciado', 'mensual', 'anual')
            LIMIT 10;
        `;

        if (unexpectedPlans.length === 0) {
            console.log('✅ No se encontraron tipos de plan inesperados.');
        } else {
            console.table(unexpectedPlans);
        }

        // 4. Summary
        console.log('\n📋 RESUMEN:');
        const summary = await sql`
            SELECT 
                CASE 
                    WHEN plan_type IN ('pro', 'premium', 'elite', 'whale', 'vitalicio', 'iniciado', 'mensual', 'anual') THEN 'PRO/PAID'
                    WHEN plan_type = 'free' OR plan_type IS NULL THEN 'FREE'
                    ELSE 'UNKNOWN'
                END as category,
                COUNT(*) as count
            FROM public.profiles
            GROUP BY category;
        `;
        console.table(summary);

        console.log('\n✅ Verificación completada.');

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        if (error.code) {
            console.error(`PG Code: ${error.code}, Message: ${error.message}`);
        }
        process.exit(1);
    } finally {
        await sql.end();
    }
}

main();
