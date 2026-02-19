import React, { useRef } from 'react';
import { Bot, Target, BarChart3, Activity, Shield, Zap, Power, Flame, Unlock, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
import { motion } from 'framer-motion';
import { usePricingModal } from '../contexts/PricingModalContext';

interface BotStats {
  nome_bot: string;
  lucro_total: number;
  total_operacoes: number;
  vitorias: number;
  derrotas: number;
  taxa_vitoria?: number;
  assertividade_percentual?: number;
  maior_lucro?: number;
  maior_perda?: number;
  created_at?: string;
  updated_at?: string;
}

interface BotPerformanceCardProps {
  bot: BotStats;
  index?: number;
  periodoSelecionado?: string;
  showBestOfWeekBadge?: boolean;
  rankingPosition?: number; // 1 = Top 1, 2 = Top 2, etc.
}

const BotPerformanceCard = ({ bot, periodoSelecionado, showBestOfWeekBadge = false, rankingPosition }: BotPerformanceCardProps) => {
  const navigate = useNavigate();
  const { isFree } = useFreemiumLimiter();
  const { openPricingModal } = usePricingModal();

  // Configuração de assertividades específicas por bot
  const getBotSpecificData = (botName: string) => {
    const normalizedName = botName.toLowerCase().replace(/[_\s]/g, '');

    const botConfigs: { [key: string]: { assertividade: number; route: string } } = {
      'quantumbotfixedstake': { assertividade: 85.2, route: '/bot/11' },
      'quantumbot': { assertividade: 85.2, route: '/bot/11' },
      'botapalancamiento': { assertividade: 78.9, route: '/apalancamiento-100x' },
      'apalancamiento': { assertividade: 78.9, route: '/apalancamiento-100x' },
      'botai2.0': { assertividade: 82.1, route: '/bot/16' },
      'botai': { assertividade: 82.1, route: '/bot/16' },
      'factor50xconservador': { assertividade: 91.5, route: '/factor50x' },
      'factor50x': { assertividade: 91.5, route: '/factor50x' },
      'wolfbot2.0': { assertividade: 87.3, route: '/bot/wolf-bot' },
      'wolfbot': { assertividade: 87.3, route: '/bot/wolf-bot' },
      'sniperbotmartingale': { assertividade: 79.8, route: '/bot/15' },
      'sniperbot': { assertividade: 79.8, route: '/bot/15' },
      'nexusbot': { assertividade: 83.7, route: '/bot/14' },
      'bkbot1.0': { assertividade: 88.5, route: '/bk-bot' },
      'bkbot': { assertividade: 88.5, route: '/bk-bot' },
      'scalebot': { assertividade: 89.2, route: '/bot/scale-bot' },
      'scale': { assertividade: 89.2, route: '/bot/scale-bot' },
      'alfabot': { assertividade: 85.2, route: '/alfabot' },
      'alfa': { assertividade: 85.2, route: '/alfabot' },
      'tipbot': { assertividade: 84.5, route: '/tipbot' },
      'tip': { assertividade: 84.5, route: '/tipbot' },
      'xtremebot': { assertividade: 91.2, route: '/xtremebot' },
      'xtreme': { assertividade: 91.2, route: '/xtremebot' },
      'goldbot': { assertividade: 91.2, route: '/xtrembot' },
      'gold': { assertividade: 91.2, route: '/xtrembot' },
      'gold bot': { assertividade: 91.2, route: '/xtrembot' },
      'turboganancia': { assertividade: 92.3, route: '/turbo-ganancia' },
      'turbo': { assertividade: 92.3, route: '/turbo-ganancia' },
      'turbo ganancia': { assertividade: 92.3, route: '/turbo-ganancia' },
      'botdelapalancamiento': { assertividade: 89.7, route: '/bot-del-apalancamiento' },
      'bot del apalancamiento': { assertividade: 89.7, route: '/bot-del-apalancamiento' },
      'vipboster': { assertividade: 88.4, route: '/vip-boster' },
      'vip': { assertividade: 88.4, route: '/vip-boster' },
      'boster': { assertividade: 88.4, route: '/vip-boster' },
      'vip boster': { assertividade: 88.4, route: '/vip-boster' },
      'doublecuentas': { assertividade: 86.7, route: '/double-cuentas' },
      'double': { assertividade: 86.7, route: '/double-cuentas' },
      'cuentas': { assertividade: 86.7, route: '/double-cuentas' },
      'double cuentas': { assertividade: 86.7, route: '/double-cuentas' },
      'aurabot': { assertividade: 75.0, route: '/aura-bot' },
      'aura': { assertividade: 75.0, route: '/aura-bot' },
      'aura bot': { assertividade: 75.0, route: '/aura-bot' }
    };

    return botConfigs[normalizedName] || { assertividade: bot.assertividade_percentual, route: '/' };
  };

  const botData = getBotSpecificData(bot.nome_bot);

  // Extrair dados do bot
  const vitorias = bot.vitorias;
  const derrotas = bot.derrotas;
  const totalOperacoes = bot.total_operacoes;

  // Usar o win rate real calculado a partir das vitórias e total de operações
  // Prioridade: 1. Cálculo local (vitorias/total), 2. assertividade_percentual do banco, 3. taxa_vitoria, 4. config do bot
  let assertividade = 0;

  // PRIORITY 1: Calculate locally if we have operation data (most reliable)
  if (totalOperacoes > 0 && vitorias >= 0) {
    assertividade = (vitorias / totalOperacoes) * 100;
  }
  // PRIORITY 2: Use assertividade from database if available and > 0
  else if (bot.assertividade_percentual && Number(bot.assertividade_percentual) > 0) {
    assertividade = Number(bot.assertividade_percentual);
  }
  // PRIORITY 3: Use taxa_vitoria if available
  else if (bot.taxa_vitoria && Number(bot.taxa_vitoria) > 0) {
    assertividade = Number(bot.taxa_vitoria);
  }
  // PRIORITY 4: Fallback to static bot config
  else if (botData.assertividade && botData.assertividade > 0) {
    assertividade = botData.assertividade;
  }

  // Ref for the card element
  const elementRef = useRef<HTMLDivElement>(null);

  // Check if this is Top 1 ranking
  const isTop1 = rankingPosition === 1;

  // Função para obter cor baseada na performance
  const getProgressColor = (accuracy: number) => {
    if (accuracy >= 80) return 'from-emerald-500 to-emerald-600';
    if (accuracy >= 70) return 'from-blue-500 to-blue-600';
    if (accuracy >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-orange-500 to-orange-600';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-emerald-500';
    if (accuracy >= 70) return 'text-blue-500';
    if (accuracy >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };



  // Mapeamento de nomes do ranking para IDs do BotSelection
  const getBotSelectionId = (botName: string): string | null => {
    const normalizedName = botName.toLowerCase().replace(/[_\s]/g, '');

    const botMappings: { [key: string]: string } = {
      'sigmabot': 'sigma',
      'sigmascalper': 'sigma',
      'sigma': 'sigma',
      'gainbot': 'gain',
      'gain': 'gain',
      'maquinadelganancias': 'maquina',
      'maquina': 'maquina',
      'astronbot': 'astron',
      'astron': 'astron',
      'xtremebot': 'xtreme',
      'xtreme': 'xtreme',
      'quantumbot': 'quantum',
      'quantumbotfixedstake': 'quantum',
      'quantum': 'quantum',
    };

    return botMappings[normalizedName] || null;
  };

  const handleSelectBot = (botName: string) => {
    const botId = getBotSelectionId(botName);

    if (botId) {
      // Navegar para /bots com parâmetro para selecionar automaticamente
      console.log(`Selecionando bot: ${botId} - Bot: ${botName}`);
      navigate(`/bots?select=${botId}`);
    } else {
      // Fallback para rota específica do bot
      const botData = getBotSpecificData(botName);
      console.log(`Navegando para: ${botData.route} - Bot: ${botName}`);
      navigate(botData.route);
    }
  };

  return (
    <motion.div
      ref={elementRef}
      className={`group relative overflow-hidden rounded-xl glass-premium p-6 animate-scale-in card-glow-hover ${isTop1 ? 'golden-border-animated' : ''}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Gradient border animado */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getProgressColor(assertividade)} animate-gradient-x`} style={{ backgroundSize: '200% 100%' }}></div>

      {/* HOT Badge for Top 1 */}
      {isTop1 && (
        <div className="absolute -top-1 -right-1 z-40">
          <div className="hot-badge text-white rounded-md px-3 py-1.5 flex items-center gap-1.5">
            <Flame size={14} className="animate-pulse" />
            <span className="text-xs font-bold tracking-wide uppercase">HOT</span>
          </div>
        </div>
      )}

      {/* Glow de fundo sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      {/* Badges de certificação - Posicionadas no topo sem sobreposição */}
      <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1 justify-end z-30 mb-2">
        {/* Badges especiais para Mejores Bots del la Semana */}
        {showBestOfWeekBadge && bot.nome_bot.toLowerCase().includes('factor') && bot.nome_bot.toLowerCase().includes('50x') && (
          <div className="badge-shimmer bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-md px-2 py-1 border border-yellow-400 shadow-lg shadow-yellow-500/20 flex items-center gap-1">
            <span className="text-[10px] font-bold tracking-wide uppercase leading-none">🏆 #1 SEMANA</span>
          </div>
        )}
        {showBestOfWeekBadge && bot.nome_bot.toLowerCase().includes('vip') && bot.nome_bot.toLowerCase().includes('boster') && (
          <div className="badge-shimmer bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-md px-2 py-1 border border-yellow-400 shadow-lg shadow-yellow-500/20 flex items-center gap-1">
            <span className="text-[10px] font-bold tracking-wide uppercase leading-none">🥈 #2 SEMANA</span>
          </div>
        )}
        {showBestOfWeekBadge && bot.nome_bot.toLowerCase().includes('quantum') && bot.nome_bot.toLowerCase().includes('bot') && (
          <div className="badge-shimmer bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-md px-2 py-1 border border-yellow-400 shadow-lg shadow-yellow-500/20 flex items-center gap-1">
            <span className="text-[10px] font-bold tracking-wide uppercase leading-none">🥉 #3 SEMANA</span>
          </div>
        )}

        {/* Badge especial para Vip Boster - TOP 01 */}
        {!showBestOfWeekBadge && bot.nome_bot.toLowerCase().includes('vip') && bot.nome_bot.toLowerCase().includes('boster') && (
          <div className="badge-shimmer bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md px-2 py-1 border border-orange-400 shadow-lg shadow-orange-500/20 flex items-center gap-1">
            <span className="text-[10px] font-bold tracking-wide uppercase leading-none">🔥 TOP 01</span>
          </div>
        )}
        {/* Badge especial para Factor 50X - TOP 02 */}
        {!showBestOfWeekBadge && (bot.nome_bot.toLowerCase().includes('factor') && bot.nome_bot.toLowerCase().includes('50x')) && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md px-2 py-1 border border-orange-400 shadow-md animate-pulse flex items-center gap-1">
            <span className="text-[10px] font-bold tracking-wide uppercase leading-none">⚡ TOP 02</span>
          </div>
        )}
        {/* Badge especial para Bot del Apalancamiento - TOP 03 */}
        {bot.nome_bot.toLowerCase().includes('bot') && bot.nome_bot.toLowerCase().includes('apalancamiento') &&
          !bot.nome_bot.toLowerCase().includes('100x') && (
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md px-2 py-1 border border-orange-400 shadow-md animate-pulse flex items-center gap-1">
              <span className="text-[10px] font-bold tracking-wide uppercase leading-none">🚀 TOP 03</span>
            </div>
          )}
        {/* Badge especial para Apalancamiento */}
        {bot.nome_bot.toLowerCase().includes('apalancamiento') &&
          !bot.nome_bot.toLowerCase().includes('bot') &&
          !bot.nome_bot.toLowerCase().includes('100x') && (
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md px-2 py-1 border border-orange-400 shadow-md animate-pulse flex items-center gap-1">
              <span className="text-[10px] font-bold tracking-wide uppercase leading-none">⚡ APALANCAMIENTO</span>
            </div>
          )}
        {/* Badge especial para Apalancamiento 100X */}
        {bot.nome_bot.toLowerCase().includes('apalancamiento') && bot.nome_bot.toLowerCase().includes('100x') && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-md px-2 py-1 border border-orange-400 shadow-md animate-pulse flex items-center gap-1">
            <span className="text-[10px] font-bold tracking-wide uppercase leading-none">💥 100X</span>
          </div>
        )}
        {/* Badge PRO - REMOVED per user request */}
      </div>

      {/* Cabeçalho do card - Com espaçamento para badges */}
      <div className="mb-6 mt-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/30 group-hover:border-primary/50 transition-colors duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
            <Bot className="text-primary group-hover:scale-110 transition-transform duration-300" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-card-foreground mb-1 pr-2">{bot.nome_bot.replace(/_/g, ' ')}</h3>
          </div>
        </div>

        {/* Indicadores de status */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1.5 rounded-full border border-emerald-500/20">
            <div className="w-2 h-2 bg-emerald-500 rounded-full status-online"></div>
            <span className="text-xs text-emerald-500 font-medium">Online</span>
          </div>
        </div>
      </div>

      {/* Porcentagem de assertividade */}
      <div className="text-center mb-6 relative">
        <div className="relative inline-block">
          <div className={`text-5xl font-extrabold mb-2 ${getAccuracyColor(assertividade)} relative z-10 animate-slide-up`} style={{ animationDelay: '0.1s' }}>
            {assertividade.toFixed(1)}%
          </div>
          {/* Círculo decorativo de fundo com glow */}
          <div className={`absolute inset-0 w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${getProgressColor(assertividade)} opacity-10 blur-xl`}></div>
        </div>
        <p className="text-sm text-muted-foreground font-medium">Tasa de Asertividad</p>
      </div>

      {/* Barra de progresso */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Performance</span>
          <span className="text-xs font-medium text-foreground">{assertividade.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-secondary/50 rounded-full h-3 overflow-hidden shadow-inner border border-border/30">
          <div
            className={`h-3 rounded-full bg-gradient-to-r ${getProgressColor(assertividade)} transition-all duration-1000 ease-out relative progress-glow`}
            style={{ width: `${assertividade}%` }}
          >
            {/* Efeito shimmer premium */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
            {/* Indicador de posição com glow */}
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-lg shadow-white/50"></div>
          </div>
        </div>
      </div>

      {/* Estatísticas detalhadas - Layout reorganizado */}
      <div className="space-y-3 mb-4">
        {/* Linha 1: Victorias e Derrotas lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target size={12} className="text-emerald-500" />
              <span className="text-lg font-bold text-emerald-500 tabular-nums">{vitorias}</span>
            </div>
            <div className="text-xs text-muted-foreground font-medium">Victorias</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-br from-orange-500/5 to-orange-500/10 rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity size={12} className="text-orange-500" />
              <span className="text-lg font-bold text-orange-500 tabular-nums">{derrotas}</span>
            </div>
            <div className="text-xs text-muted-foreground font-medium">Derrotas</div>
          </div>
        </div>

        {/* Linha 2: Total de operações */}
        <div className="text-center p-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BarChart3 size={12} className="text-primary" />
            <span className="text-lg font-bold text-primary tabular-nums">{totalOperacoes}</span>
          </div>
          <div className="text-xs text-muted-foreground font-medium">Total de Operaciones</div>
        </div>


      </div>

      {/* Footer profissional */}
      <div className="pt-4 border-t border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${assertividade >= 80 ? 'bg-emerald-500' : assertividade >= 70 ? 'bg-primary' : assertividade >= 60 ? 'bg-blue-500' : 'bg-orange-500'} animate-pulse`}></div>
            <span className="text-xs text-muted-foreground font-medium">
              {assertividade >= 80 ? 'Excelente' : assertividade >= 70 ? 'Muy Bueno' : assertividade >= 60 ? 'Bueno' : 'Regular'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap size={12} />
            <span>Activo</span>
          </div>
        </div>

        {/* Métricas adicionais */}
        <div className="grid grid-cols-1 gap-3 text-xs mb-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Win Rate:</span>
            <span className="font-semibold text-foreground">{((vitorias / totalOperacoes) * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Botão de ação - Condicional para Free users */}
        {isFree ? (
          <motion.button
            onClick={() => openPricingModal()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-600/20 to-emerald-600/20 border border-teal-500/30 hover:from-teal-600/40 hover:to-emerald-600/40 hover:border-teal-400/50 rounded-xl transition-all duration-300 relative overflow-hidden shadow-lg shadow-teal-500/10"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
            <Unlock size={16} className="text-teal-400" />
            <span className="text-sm font-bold text-teal-300 uppercase tracking-wide relative z-10">Desbloquear Bot Ahora</span>
          </motion.button>
        ) : (
          <motion.button
            onClick={() => handleSelectBot(bot.nome_bot)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500/20 to-emerald-500/15 hover:from-teal-500/30 hover:to-emerald-500/25 border border-teal-500/40 hover:border-teal-400/60 rounded-xl transition-all duration-300 relative overflow-hidden shadow-lg shadow-teal-500/20"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-500/15 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
            <Copy size={16} className="text-teal-400" />
            <span className="text-sm font-bold text-teal-300 relative z-10">
              Desbloquear Bot Ahora
            </span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default BotPerformanceCard;