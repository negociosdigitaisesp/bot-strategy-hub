/**
 * Função assíncrona para buscar estatísticas avançadas dos bots
 * Utiliza Supabase RPC para chamar a função PostgreSQL get_bot_statistics
 * 
 * @param {Object} supabase - Instância do cliente Supabase
 * @returns {Promise<Array>} Array com estatísticas dos bots ou array vazio em caso de erro
 * 
 * Exemplo de dados retornados:
 * [
 *   {
 *     id: 1,
 *     nome_bot: "Wolf Bot 2.0",
 *     lucro_total: 15420.50,
 *     total_operacoes: 1250,
 *     vitorias: 1087,
 *     derrotas: 163,
 *     taxa_vitoria: 86.96,
 *     assertividade_percentual: 86.96,
 *     maior_lucro: 850.00,
 *     maior_perda: -125.00,
 *     drawdown_maximo: 8.5,
 *     fator_lucro: 2.8,
 *     expectativa: 0.67,
 *     nivel_risco: "Médio",
 *     created_at: "2024-01-15T10:30:00Z",
 *     updated_at: "2024-01-20T15:45:00Z"
 *   },
 *   // ... mais bots
 * ]
 */
export async function buscarEstatisticasAvancadas(supabase) {
  try {
    console.log('🔍 Iniciando busca de estatísticas avançadas dos bots...');
    
    // Chama a função RPC do PostgreSQL para obter estatísticas detalhadas
    // A função get_bot_statistics retorna dados completos de performance dos bots
    const { data, error } = await supabase
      .rpc('get_bot_statistics') // Chama a função RPC sem parâmetros
      .order('lucro_total', { ascending: false }); // Ordena por lucro total (maior para menor)
    
    // Tratamento de erros - registra no console e retorna array vazio
    if (error) {
      console.error('❌ Erro ao buscar estatísticas avançadas dos bots:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return []; // Retorna array vazio em caso de falha
    }
    
    // Log de sucesso com informações sobre os dados retornados
    console.log(`✅ Estatísticas avançadas carregadas com sucesso: ${data?.length || 0} bots`);
    
    // Validação adicional dos dados retornados
    if (!data || !Array.isArray(data)) {
      console.warn('⚠️ Dados retornados não são um array válido');
      return [];
    }
    
    // Log detalhado dos primeiros resultados para debug
    if (data.length > 0) {
      console.log('📊 Amostra dos dados retornados:', {
        total_bots: data.length,
        primeiro_bot: {
          nome: data[0].nome_bot,
          lucro_total: data[0].lucro_total,
          taxa_vitoria: data[0].taxa_vitoria
        },
        lucro_total_todos_bots: data.reduce((sum, bot) => sum + (bot.lucro_total || 0), 0)
      });
    }
    
    // Retorna os dados de estatísticas dos bots ordenados por lucro
    return data;
    
  } catch (exception) {
    // Captura erros não relacionados ao Supabase (rede, parsing, etc.)
    console.error('💥 Exceção não tratada ao buscar estatísticas:', exception);
    return []; // Retorna array vazio em caso de exceção
  }
}

/**
 * Função auxiliar para formatar os dados de estatísticas para exibição
 * 
 * @param {Array} estatisticas - Array de estatísticas retornado pela função principal
 * @returns {Array} Array formatado para exibição na interface
 */
export function formatarEstatisticasParaExibicao(estatisticas) {
  if (!Array.isArray(estatisticas) || estatisticas.length === 0) {
    return [];
  }
  
  return estatisticas.map(bot => ({
    ...bot,
    // Formatar valores monetários
    lucro_total_formatado: new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD'
    }).format(bot.lucro_total || 0),
    
    // Formatar percentuais
    taxa_vitoria_formatada: `${(bot.taxa_vitoria || 0).toFixed(2)}%`,
    assertividade_formatada: `${(bot.assertividade_percentual || 0).toFixed(2)}%`,
    
    // Formatar datas
    data_criacao_formatada: bot.created_at ? 
      new Date(bot.created_at).toLocaleDateString('pt-BR') : 'N/A',
    data_atualizacao_formatada: bot.updated_at ? 
      new Date(bot.updated_at).toLocaleDateString('pt-BR') : 'N/A'
  }));
}

/**
 * Exemplo de uso da função:
 * 
 * import { createClient } from '@supabase/supabase-js';
 * import { buscarEstatisticasAvancadas } from './buscarEstatisticasAvancadas';
 * 
 * const supabase = createClient(supabaseUrl, supabaseKey);
 * 
 * async function carregarEstatisticas() {
 *   const estatisticas = await buscarEstatisticasAvancadas(supabase);
 *   
 *   if (estatisticas.length > 0) {
 *     console.log('Estatísticas carregadas:', estatisticas);
 *     // Processar dados para exibição na interface
 *   } else {
 *     console.log('Nenhuma estatística encontrada ou erro na busca');
 *   }
 * }
 */