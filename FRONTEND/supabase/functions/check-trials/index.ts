import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not set");
        }

        const resend = new Resend(RESEND_API_KEY);
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Calcular data 3 dias no futuro
        const today = new Date();
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);
        const targetDateStr = threeDaysFromNow.toISOString().split('T')[0];

        console.log(`[CHECK-TRIALS] Buscando trials que expiram em: ${targetDateStr}`);

        // Buscar usuários cujo trial_end é daqui a 3 dias
        const { data: expiringUsers, error: dbError } = await supabase
            .from("profiles")
            .select("id, email, full_name, trial_end, trial_status")
            .eq("trial_status", "active")
            .eq("trial_end", targetDateStr);

        if (dbError) {
            console.error("[CHECK-TRIALS] Erro no banco:", dbError);
            throw new Error(`Database error: ${dbError.message}`);
        }

        console.log(`[CHECK-TRIALS] Encontrados ${expiringUsers?.length || 0} usuários.`);

        const results = [];

        // Enviar e-mails
        if (expiringUsers && expiringUsers.length > 0) {
            for (const user of expiringUsers) {
                try {
                    const firstName = user.full_name?.split(' ')[0] || "Trader";

                    const { data: emailData, error: emailError } = await resend.emails.send({
                        from: "Onboarding <onboarding@resend.dev>",
                        to: [user.email],
                        subject: "⚠️ Su periodo de prueba expira en 3 días",
                        html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #e2e8f0; padding: 20px; border-radius: 10px;">
                <h1 style="color: #fbbf24; text-align: center;">¡Atención, ${firstName}!</h1>
                <p style="font-size: 16px; line-height: 1.5;">
                  Su licencia de prueba de <strong>Million Bots</strong> está a punto de finalizar.
                </p>
                <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                  ⏳ <strong>Tiempo restante:</strong> 3 Días
                </div>
                <p style="font-size: 16px;">
                  No pierda el acceso a nuestras estrategias premium y herramientas de análisis.
                </p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://millionbots.com/upgrade" style="background-color: #f59e0b; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
                    Actualizar a PRO Ahora
                  </a>
                </div>
                <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">
                  Si ya ha actualizado su plan, por favor ignore este mensaje.
                </p>
              </div>
            `,
                    });

                    if (emailError) {
                        console.error(`[CHECK-TRIALS] Erro ao enviar para ${user.email}:`, emailError);
                        results.push({ email: user.email, status: 'error', error: emailError });
                    } else {
                        console.log(`[CHECK-TRIALS] E-mail enviado para ${user.email}`);
                        results.push({ email: user.email, status: 'sent', id: emailData?.id });
                    }

                } catch (err) {
                    console.error(`[CHECK-TRIALS] Erro inesperado para ${user.email}:`, err);
                    results.push({ email: user.email, status: 'error', error: err });
                }
            }
        }

        return new Response(
            JSON.stringify({
                message: "Verificação de trials concluída",
                targetDate: targetDateStr,
                processed: expiringUsers?.length || 0,
                results
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );

    } catch (error: any) {
        console.error("[CHECK-TRIALS] Erro geral:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
});
