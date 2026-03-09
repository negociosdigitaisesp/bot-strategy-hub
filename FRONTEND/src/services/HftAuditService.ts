import { hftSupabase } from '../lib/hftSupabase';

export interface AuditLogParams {
  clientId: string;
  contractId: string;
  botId: 'ORACLE_QUANT' | 'COPY_IQ';
  ativo: string;
}

export class HftAuditService {
  /**
   * [FORMA 5] Rocha de Auditoria: Envia o ID do contrato para o Supabase B.
   * O Back-end (Edge Function) fará a validação real com a corretora.
   */
  public static async registerTrade(params: AuditLogParams) {
    if (!params.contractId) return;

    try {
      console.log(`[AUDIT] Registrando operação ${params.contractId} para auditoria...`);
      
      const { error } = await hftSupabase.from('hft_audit_logs').insert({
        client_id: params.clientId,
        contract_id: params.contractId,
        bot_id: params.botId,
        ativo: params.ativo,
        status: 'PENDING', // O Back-end mudará para WIN/LOSS
        lucro_liquido: 0   // O Back-end preencherá o valor real
      });

      if (error) {
        // Se já existe (UNIQUE constraint), ignoramos silenciosamente para evitar spam
        if (error.code === '23505') return;
        console.warn('[AUDIT] Erro ao registrar contrato:', error);
      } else {
        console.log(`[AUDIT] Contrato ${params.contractId} enviado ao cofre de auditoria (Supabase B).`);
      }
    } catch (e) {
      console.error('[AUDIT] Falha crítica no registro de auditoria:', e);
    }
  }
}
