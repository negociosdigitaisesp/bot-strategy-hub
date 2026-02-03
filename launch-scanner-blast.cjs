
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://xwclmxjeombwabfdvyij.supabase.co';
// WARNING: Using Service Role Key for Admin access (Bypass RLS)
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3Y2xteGplb21id2FiZmR2eWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUyNjQ1NCwiZXhwIjoyMDY4MTAyNDU0fQ.WWPKfSCDwjMRFUUsNB7aHbUWkJEMAICmPjcAsh7VUz4';
const RESEND_API_KEY = 're_XyG31wa4_AtGyLo6oLVkLBupLrjaCtYpa';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const resend = new Resend(RESEND_API_KEY);

async function main() {
    console.log('🚀 INITIALIZING BUG DERIV SCANNER LAUNCH PROTOCOL...');

    try {
        // 1. Fetch target users (Free Plan)
        console.log('🔍 Scanning database for FREE plan users...');
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, full_name, plan_type')
            .eq('plan_type', 'free'); // or is null logic if needed

        if (error) throw new Error(`Database Scan Failed: ${error.message}`);

        console.log(`✅ Target identified: ${profiles.length} users found.`);

        // 2. Calculate New Trial Expiration (24 Hours from now)
        const newTrialEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        console.log(`⏱️ Setting new trial expiration to: ${newTrialEnd}`);

        // 3. Process Batch
        let processed = 0;
        let emailsSent = 0;
        let errors = 0;

        for (const profile of profiles) {
            try {
                // A. Retrieve Email (Admin API)
                const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.id);

                if (userError || !user || !user.email) {
                    console.warn(`⚠️ Skipping User ${profile.id}: Valid email not found.`);
                    continue;
                }

                const email = user.email;
                console.log(`Processing Agent: ${email} (${profile.full_name || 'Unknown'})...`);

                // B. Reset Trial in Database
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        trial_ends_at: newTrialEnd,
                        // Optional: Reset any other flags if needed
                    })
                    .eq('id', profile.id);

                if (updateError) {
                    console.error(`❌ DB Update Failed for ${email}:`, updateError.message);
                    errors++;
                    continue;
                }

                // C. Send Reactivation Email via Resend
                // Rate Limiting protection (approx 10/sec max, safe side 5/sec)
                await new Promise(resolve => setTimeout(resolve, 200));

                const { data: emailData, error: emailError } = await resend.emails.send({
                    from: 'Miguel | Million Bots <suporte@appmillionbots.com>',
                    reply_to: 'soportecopytrading@gmail.com',
                    to: email,
                    subject: '📡 [ALERTA] Protocolo Bug Deriv Scanner activado (Acceso Reabierto)',
                    html: `
<p>Hola, Trader.</p>

<p>Te escribo porque el juego acaba de subir de nivel. Hemos desactivado los bots antiguos y liberado nuestra tecnología más avanzada: el <b>Bug Deriv Scanner</b>.</p>

<p>A diferencia de los bots comunes, este es un <b>Scanner HFT</b> que monitorea toda la flota de activos de Deriv en tiempo real. Él busca el "caos perfecto" y solo dispara cuando la probabilidad es injusta para el bróker.</p>

<div style="background: #0f172a; border-left: 4px solid #4ade80; padding: 15px; margin: 20px 0;">
  <p style="color: #4ade80; margin: 0; font-family: monospace;"><b>RESULTADO DE LA ÚLTIMA SESIÓN:</b></p>
  <p style="font-size: 24px; margin: 5px 0; color: white;">✅ 15 Wins | ❌ 0 Losses</p>
</div>

<p>He decidido <b>RESETEAR TU ACCESO GRATUITO POR 24 HORAS</b>. Quiero que entres al panel ahora y veas el Scanner trabajando en vivo.</p>

<p style="color: #fbbf24; font-weight: bold;">⚠️ OFERTA DE LANZAMIENTO (24H):</p>
<p>Si activas tu cuenta PRO hoy, el plan anual baja de <strike>$30</strike> a solo <b>$24.00 USD</b>.</p>

<p>Tu acceso extra y este descuento desaparecen mañana a esta misma hora.</p>

<br>
<a href="https://appmillionbots.com" style="background: #22d3ee; color: #000; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">RECLAMAR MI ACCESO Y DESCUENTO</a>
<br><br>

<p>Nos vemos en el Centro de Comando.</p>
<p><b>Miguel | CEO Million Bots</b></p>
`
                });

                if (emailError) {
                    console.error(`❌ Email Failed for ${email}:`, emailError);
                    errors++;
                } else {
                    console.log(`✅ Email Sent: ${emailData?.id}`);
                    emailsSent++;
                }

                processed++;

            } catch (err) {
                console.error(`❌ Critical Error processing user ${profile.id}:`, err);
                errors++;
            }
        }

        console.log('\n==========================================');
        console.log(`🎉 MISSION COMPLETE`);
        console.log(`👥 Profiles Processed: ${processed}`);
        console.log(`📧 Emails Sent: ${emailsSent}`);
        console.log(`❌ Errors: ${errors}`);
        console.log('==========================================');

    } catch (mainError) {
        console.error('🔥 FATAL EXECUTION ERROR:', mainError);
    }
}

main();
