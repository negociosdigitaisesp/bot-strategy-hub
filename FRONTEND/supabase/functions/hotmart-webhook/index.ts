import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HOTMART_SECRET = Deno.env.get("HOTMART_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Affiliate commission rate (60%)
const AFFILIATE_COMMISSION_RATE = 0.60;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hotmart-hottok",
};

interface HotmartWebhookPayload {
    event: string;
    data: {
        buyer: {
            email: string;
            name: string;
        };
        product: {
            id: string;
            name: string;
        };
        purchase: {
            order_id: string;
            status: string;
            price?: {
                value: number;
                currency_code: string;
            };
            offer?: {
                code: string;
            };
        };
        // Affiliate tracking from Hotmart (sck parameter)
        affiliate?: {
            affiliate_code?: string;
        };
    };
}

// Mapeamento de produtos para planos
const PRODUCT_MAPPING: Record<string, { name: string; duration: string }> = {
    "c1pgsg6o": { name: "Mensual", duration: "1month" },
    "zouponhf": { name: "Anual", duration: "1year" },
    "5v9syrd5": { name: "Vitalicio", duration: "lifetime" },
};

// --- RESEND EMAIL FUNCTION ---
async function sendAffiliateNotificationEmail(
    affiliateEmail: string,
    affiliateName: string,
    commissionAmount: number,
    buyerName: string
): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn("[HOTMART-WEBHOOK] RESEND_API_KEY not configured, skipping email");
        return false;
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Million Bots <comisiones@millionbots.com>",
                to: [affiliateEmail],
                subject: `🎉 ¡Ganaste $${commissionAmount.toFixed(2)} USD con una indicación!`,
                html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; font-size: 28px; margin: 0;">💰 ¡Nueva Comisión!</h1>
        </div>
        
        <!-- Card -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 1px solid #334155; border-radius: 16px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #94a3b8; font-size: 16px; margin: 0 0 10px 0;">Hola <strong style="color: #ffffff;">${affiliateName || 'Afiliado'}</strong>,</p>
            
            <p style="color: #94a3b8; font-size: 16px; margin: 0 0 25px 0;">
                ¡Excelentes noticias! Un usuario que indicaste acaba de realizar una compra.
            </p>
            
            <!-- Amount -->
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;">
                <p style="color: #10b981; font-size: 14px; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px;">Comisión Ganada</p>
                <p style="color: #34d399; font-size: 42px; font-weight: bold; margin: 0; font-family: 'JetBrains Mono', monospace;">$${commissionAmount.toFixed(2)} USD</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin: 0;">
                <strong>Comprador:</strong> ${buyerName}<br>
                <strong>Estado:</strong> <span style="color: #fbbf24;">Pendiente de liberación</span>
            </p>
        </div>
        
        <!-- Info -->
        <div style="text-align: center; padding: 20px;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
                Tu comisión estará disponible para retiro después del período de garantía (7 días).
                Puedes ver tu saldo en el panel de afiliados.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #1e293b;">
            <p style="color: #475569; font-size: 11px; margin: 0;">
                Million Bots - Plataforma de Trading Algorítmico<br>
                Este email fue enviado automáticamente.
            </p>
        </div>
    </div>
</body>
</html>
                `,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("[HOTMART-WEBHOOK] Resend error:", errorData);
            return false;
        }

        console.log("[HOTMART-WEBHOOK] ✅ Affiliate notification email sent to:", affiliateEmail);
        return true;
    } catch (error) {
        console.error("[HOTMART-WEBHOOK] Error sending affiliate email:", error);
        return false;
    }
}

// --- PURCHASE CONFIRMATION EMAIL FUNCTION ---
async function sendPurchaseConfirmationEmail(
    buyerEmail: string,
    buyerName: string,
    planName: string,
    expirationDate: string
): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn("[HOTMART-WEBHOOK] RESEND_API_KEY not configured, skipping email");
        return false;
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Million Bots <bienvenida@millionbots.com>",
                to: [buyerEmail],
                subject: `🚀 ¡Bienvenido a Million Bots! Tu acceso ${planName} está activo`,
                html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">🤖</span>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 10px 0;">¡Compra Exitosa!</h1>
            <p style="color: #10b981; font-size: 16px; margin: 0; font-weight: 600;">Tu acceso Premium está activo</p>
        </div>
        
        <!-- Card -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 1px solid #334155; border-radius: 16px; padding: 30px; margin-bottom: 20px;">
            <p style="color: #94a3b8; font-size: 16px; margin: 0 0 20px 0;">
                Hola <strong style="color: #ffffff;">${buyerName || 'Trader'}</strong>,
            </p>
            
            <p style="color: #94a3b8; font-size: 16px; margin: 0 0 25px 0;">
                ¡Gracias por confiar en Million Bots! Tu compra ha sido procesada correctamente y ya tienes acceso completo a la plataforma.
            </p>
            
            <!-- Plan Info -->
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Plan:</td>
                        <td style="color: #10b981; font-size: 14px; padding: 8px 0; text-align: right; font-weight: bold;">${planName}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Estado:</td>
                        <td style="color: #34d399; font-size: 14px; padding: 8px 0; text-align: right; font-weight: bold;">✅ Activo</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Válido hasta:</td>
                        <td style="color: #ffffff; font-size: 14px; padding: 8px 0; text-align: right; font-weight: bold;">${expirationDate === '2099-12-31' ? 'Vitalicio ♾️' : expirationDate}</td>
                    </tr>
                </table>
            </div>
            
            <!-- What's Included -->
            <p style="color: #ffffff; font-size: 14px; margin: 0 0 15px 0; font-weight: 600;">Lo que incluye tu plan:</p>
            <ul style="color: #94a3b8; font-size: 14px; margin: 0 0 25px 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Acceso a todos los bots de trading</li>
                <li style="margin-bottom: 8px;">Bug Reset y Efecto Midas ilimitados</li>
                <li style="margin-bottom: 8px;">Ranking de Asertividad en tiempo real</li>
                <li style="margin-bottom: 8px;">Comunidad VIP de Traders</li>
                <li style="margin-bottom: 8px;">Soporte prioritario vía WhatsApp</li>
            </ul>
            
            <!-- CTA Button -->
            <a href="https://millionbots.com/bots" style="display: block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: #000000; text-decoration: none; padding: 16px 24px; border-radius: 12px; text-align: center; font-weight: bold; font-size: 16px;">
                🚀 Acceder a la Plataforma
            </a>
        </div>
        
        <!-- Next Steps -->
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #ffffff; font-size: 14px; margin: 0 0 15px 0; font-weight: 600;">📋 Próximos pasos:</p>
            <ol style="color: #94a3b8; font-size: 14px; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Conecta tu cuenta Deriv en la plataforma</li>
                <li style="margin-bottom: 8px;">Configura tu gestión de riesgo</li>
                <li style="margin-bottom: 8px;">Selecciona un bot y comienza a operar</li>
            </ol>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #1e293b;">
            <p style="color: #64748b; font-size: 12px; margin: 0 0 10px 0;">
                ¿Necesitas ayuda? Responde a este email o únete a nuestra comunidad de WhatsApp.
            </p>
            <p style="color: #475569; font-size: 11px; margin: 0;">
                Million Bots - Plataforma de Trading Algorítmico<br>
                © 2024 Todos los derechos reservados.
            </p>
        </div>
    </div>
</body>
</html>
                `,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("[HOTMART-WEBHOOK] Resend error (purchase confirmation):", errorData);
            return false;
        }

        console.log("[HOTMART-WEBHOOK] ✅ Purchase confirmation email sent to:", buyerEmail);
        return true;
    } catch (error) {
        console.error("[HOTMART-WEBHOOK] Error sending purchase confirmation email:", error);
        return false;
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("[HOTMART-WEBHOOK] Webhook recebido");

        // ====== SEGURANÇA: Verificar Token Hotmart ======
        const hottok = req.headers.get("x-hotmart-hottok");

        if (!HOTMART_SECRET) {
            console.error("[HOTMART-WEBHOOK] HOTMART_SECRET não configurado!");
            return new Response(
                JSON.stringify({ error: "Server configuration error" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (hottok !== HOTMART_SECRET) {
            console.warn("[HOTMART-WEBHOOK] Token inválido ou ausente");
            return new Response(
                JSON.stringify({ error: "Unauthorized: Invalid token" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ====== PROCESSAR PAYLOAD ======
        const payload: HotmartWebhookPayload = await req.json();
        console.log("[HOTMART-WEBHOOK] Payload:", JSON.stringify(payload, null, 2));

        // Validar evento
        if (payload.event !== "PURCHASE_COMPLETE" && payload.event !== "PURCHASE_APPROVED") {
            console.log(`[HOTMART-WEBHOOK] Evento ignorado: ${payload.event}`);
            return new Response(
                JSON.stringify({ message: "Event ignored", event: payload.event }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const buyerEmail = payload.data.buyer.email;
        const buyerName = payload.data.buyer.name;
        const productId = payload.data.product.id;
        const offerCode = payload.data.purchase.offer?.code || productId;
        const purchasePrice = payload.data.purchase.price?.value || 0;

        console.log(`[HOTMART-WEBHOOK] Comprador: ${buyerEmail}, Produto: ${offerCode}, Valor: ${purchasePrice}`);

        // ====== MAPEAR PRODUTO PARA PLANO ======
        const planConfig = PRODUCT_MAPPING[offerCode];

        if (!planConfig) {
            console.error(`[HOTMART-WEBHOOK] Produto não mapeado: ${offerCode}`);
            return new Response(
                JSON.stringify({ error: "Unknown product", offer_code: offerCode }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`[HOTMART-WEBHOOK] Plano identificado: ${planConfig.name} (${planConfig.duration})`);

        // ====== CALCULAR DATA DE EXPIRAÇÃO ======
        let expirationDate: string;
        const today = new Date();

        if (planConfig.duration === "1month") {
            const expDate = new Date(today);
            expDate.setMonth(today.getMonth() + 1);
            expirationDate = expDate.toISOString().split('T')[0];
        } else if (planConfig.duration === "1year") {
            const expDate = new Date(today);
            expDate.setFullYear(today.getFullYear() + 1);
            expirationDate = expDate.toISOString().split('T')[0];
        } else if (planConfig.duration === "lifetime") {
            expirationDate = "2099-12-31";
        } else {
            expirationDate = "2099-12-31"; // fallback
        }

        console.log(`[HOTMART-WEBHOOK] Data de expiração calculada: ${expirationDate}`);

        // ====== CONECTAR AO SUPABASE ======
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // ====== BUSCAR USUÁRIO PELO EMAIL ======
        let userId: string | null = null;
        let buyerReferredBy: string | null = null;

        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, email, referred_by")
            .eq("email", buyerEmail)
            .maybeSingle();

        if (profileData) {
            userId = profileData.id;
            buyerReferredBy = profileData.referred_by;
            console.log(`[HOTMART-WEBHOOK] Usuário encontrado via profiles: ${userId}, referred_by: ${buyerReferredBy}`);
        } else {
            // Se não encontrou, buscar na auth.users via admin
            console.log("[HOTMART-WEBHOOK] Buscando usuário via auth.admin...");

            const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

            if (authError) {
                console.error("[HOTMART-WEBHOOK] Erro ao listar usuários:", authError);
                throw new Error(`Auth error: ${authError.message}`);
            }

            const foundUser = authData.users.find(u => u.email === buyerEmail);

            if (foundUser) {
                userId = foundUser.id;
                console.log(`[HOTMART-WEBHOOK] Usuário encontrado via auth: ${userId}`);

                // Try to get referred_by from profiles table
                const { data: refData } = await supabase
                    .from("profiles")
                    .select("referred_by")
                    .eq("id", userId)
                    .single();

                if (refData) {
                    buyerReferredBy = refData.referred_by;
                }
            }
        }

        if (!userId) {
            console.error(`[HOTMART-WEBHOOK] Usuário não encontrado: ${buyerEmail}`);
            return new Response(
                JSON.stringify({
                    error: "User not found",
                    email: buyerEmail,
                    suggestion: "User must sign up first"
                }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // ====== ATUALIZAR PROFILE ======
        const updateData = {
            plan_type: "pro",
            expiration_date: expirationDate,
            subscription_status: "active",
            updated_at: new Date().toISOString(),
        };

        console.log(`[HOTMART-WEBHOOK] Atualizando profile ${userId} com:`, updateData);

        const { data: updatedProfile, error: updateError } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", userId)
            .select()
            .single();

        if (updateError) {
            console.error("[HOTMART-WEBHOOK] Erro ao atualizar profile:", updateError);
            throw new Error(`Update error: ${updateError.message}`);
        }

        console.log("[HOTMART-WEBHOOK] ✅ Profile atualizado com sucesso!");

        // ====== SEND PURCHASE CONFIRMATION EMAIL TO BUYER ======
        await sendPurchaseConfirmationEmail(
            buyerEmail,
            buyerName,
            planConfig.name,
            expirationDate
        );

        // ====== AFFILIATE COMMISSION LOGIC ======
        let affiliateProcessed = false;
        let commissionAmount = 0;

        if (buyerReferredBy && purchasePrice > 0) {
            console.log(`[HOTMART-WEBHOOK] 🤝 Processando comissão de afiliado para: ${buyerReferredBy}`);

            // Calculate 60% commission
            commissionAmount = purchasePrice * AFFILIATE_COMMISSION_RATE;
            commissionAmount = Math.round(commissionAmount * 100) / 100; // Round to 2 decimals

            console.log(`[HOTMART-WEBHOOK] 💰 Comissão calculada: $${commissionAmount} (60% de $${purchasePrice})`);

            // Get affiliate profile
            const { data: affiliateProfile, error: affiliateError } = await supabase
                .from("profiles")
                .select("id, email, full_name, pending_balance, total_earnings")
                .eq("id", buyerReferredBy)
                .single();

            if (affiliateError || !affiliateProfile) {
                console.error("[HOTMART-WEBHOOK] Afiliado não encontrado:", affiliateError);
            } else {
                // Update affiliate PENDING balance (not available yet - 20 day hold)
                const newPendingBalance = (affiliateProfile.pending_balance || 0) + commissionAmount;
                const newTotalEarnings = (affiliateProfile.total_earnings || 0) + commissionAmount;

                const { error: balanceError } = await supabase
                    .from("profiles")
                    .update({
                        pending_balance: newPendingBalance,  // ⚠️ CHANGED: Goes to PENDING, not available
                        total_earnings: newTotalEarnings,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", buyerReferredBy);

                if (balanceError) {
                    console.error("[HOTMART-WEBHOOK] Erro ao atualizar saldo do afiliado:", balanceError);
                } else {
                    console.log(`[HOTMART-WEBHOOK] ✅ Saldo PENDENTE do afiliado atualizado: $${newPendingBalance} (bloqueado por 20 días)`);
                }

                // Create referral transaction record
                const { error: txError } = await supabase
                    .from("referral_transactions")
                    .insert({
                        user_id: buyerReferredBy,
                        source_user_id: userId,
                        amount: commissionAmount,
                        currency: "USD",
                        status: "pending", // Will be changed to 'paid' after refund period
                        origin: "hotmart",
                    });

                if (txError) {
                    console.error("[HOTMART-WEBHOOK] Erro ao criar transação de referência:", txError);
                } else {
                    console.log("[HOTMART-WEBHOOK] ✅ Transação de referência registrada");
                }

                // Send email notification to affiliate
                if (affiliateProfile.email) {
                    await sendAffiliateNotificationEmail(
                        affiliateProfile.email,
                        affiliateProfile.full_name || "Afiliado",
                        commissionAmount,
                        buyerName
                    );
                }

                affiliateProcessed = true;
            }
        } else {
            console.log("[HOTMART-WEBHOOK] ℹ️ Sem afiliado associado ou preço zero");
        }

        // ====== RESPOSTA DE SUCESSO ======
        return new Response(
            JSON.stringify({
                success: true,
                message: "Webhook processed successfully",
                user_id: userId,
                email: buyerEmail,
                plan: planConfig.name,
                expiration_date: expirationDate,
                updated_profile: updatedProfile,
                affiliate: affiliateProcessed ? {
                    processed: true,
                    affiliate_id: buyerReferredBy,
                    commission: commissionAmount,
                } : { processed: false },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("[HOTMART-WEBHOOK] Erro geral:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                message: error.message,
                stack: error.stack
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
