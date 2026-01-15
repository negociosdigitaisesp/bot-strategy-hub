import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HOTMART_SECRET = Deno.env.get("HOTMART_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
            offer?: {
                code: string;
            };
        };
    };
}

// Mapeamento de produtos para planos
const PRODUCT_MAPPING: Record<string, { name: string; duration: string }> = {
    "c1pgsg6o": { name: "Mensual", duration: "1month" },
    "zouponhf": { name: "Anual", duration: "1year" },
    "5v9syrd5": { name: "Vitalicio", duration: "lifetime" },
};

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

        console.log(`[HOTMART-WEBHOOK] Comprador: ${buyerEmail}, Produto: ${offerCode}`);

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
        // Primeiro tentamos buscar diretamente na tabela profiles
        let userId: string | null = null;

        const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, email")
            .eq("email", buyerEmail)
            .maybeSingle();

        if (profileData) {
            userId = profileData.id;
            console.log(`[HOTMART-WEBHOOK] Usuário encontrado via profiles: ${userId}`);
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

        // ====== RESPOSTA DE SUCESSO ======
        return new Response(
            JSON.stringify({
                success: true,
                message: "Webhook processed successfully",
                user_id: userId,
                email: buyerEmail,
                plan: planConfig.name,
                expiration_date: expirationDate,
                updated_profile: updatedProfile
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
