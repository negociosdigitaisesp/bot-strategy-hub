import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, Zap, AlertTriangle, CheckCircle, Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BotConfig {
  id: 'scalping' | 'tunder';
  name: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  profit: number;
  loss: number;
  targetOperations: number;
  winRate: number;
  assertiveness: number;
}

interface AccountConfig {
  accountValue: number;
  dailyProfit: number;
  maxRisk: number;
}

interface CalculationResults {
  sessionsNeeded: number;
  estimatedDays: number;
  successProbability: number;
  expectedGainPerSession: number;
  maxLossPerSession: number;
  recommendedCapital: number;
}

interface SessionSimulation {
  session: number;
  risk: number;
  result: number;
  balance: number;
  status: 'continue' | 'stop';
}

const RiskCalculator = () => {
  const [accountConfig, setAccountConfig] = useState<AccountConfig>({
    accountValue: 0,
    dailyProfit: 0,
    maxRisk: 0
  });

  const [selectedBot, setSelectedBot] = useState<BotConfig | null>(null);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [simulations, setSimulations] = useState<SessionSimulation[]>([]);
  const [alerts, setAlerts] = useState<Array<{type: 'warning' | 'error' | 'success', message: string}>>([]);

  const botConfigs: BotConfig[] = [
    {
      id: 'scalping',
      name: 'Scalping Bot',
      label: 'CONSERVADOR',
      icon: <TrendingUp className="w-8 h-8" />,
      color: '#00d4aa',
      gradient: 'from-[#00d4aa] to-[#00b894]',
      profit: 0.10,
      loss: 1.0,
      targetOperations: 2,
      winRate: 0.65,
      assertiveness: 0.87
    },
    {
      id: 'tunder',
      name: 'Tunder Bot',
      label: 'AGRESIVO',
      icon: <Zap className="w-8 h-8" />,
      color: '#8b5cf6',
      gradient: 'from-[#8b5cf6] to-[#7c3aed]',
      profit: 0.45,
      loss: 1.0,
      targetOperations: 1,
      winRate: 0.55,
      assertiveness: 0.72
    }
  ];

  // Función para calcular resultados
  const calculateResults = (config: AccountConfig, bot: BotConfig): CalculationResults => {
    const gainPerSuccessfulSession = config.maxRisk * bot.profit * bot.targetOperations;
    const sessionsNeeded = Math.ceil(config.dailyProfit / gainPerSuccessfulSession);
    const successProbability = Math.pow(bot.winRate, sessionsNeeded) * 100;
    
    return {
      sessionsNeeded,
      estimatedDays: sessionsNeeded, // 1 sesión por día
      successProbability,
      expectedGainPerSession: gainPerSuccessfulSession,
      maxLossPerSession: config.maxRisk,
      recommendedCapital: config.maxRisk * 10
    };
  };

  // Función para generar simulaciones
  const generateSimulations = (config: AccountConfig, bot: BotConfig, maxSessions: number = 10): SessionSimulation[] => {
    const sims: SessionSimulation[] = [];
    let currentBalance = config.accountValue;
    
    for (let i = 1; i <= maxSessions; i++) {
      const isWin = Math.random() < bot.winRate;
      const result = isWin 
        ? config.maxRisk * bot.profit * bot.targetOperations
        : -config.maxRisk;
      
      currentBalance += result;
      
      sims.push({
        session: i,
        risk: config.maxRisk,
        result,
        balance: currentBalance,
        status: result < 0 ? 'stop' : 'continue'
      });
      
      // Si hay pérdida, parar por el día
      if (result < 0) break;
    }
    
    return sims;
  };

  // Función para validar y generar alertas
  const validateAndAlert = (config: AccountConfig, bot: BotConfig | null) => {
    const newAlerts: Array<{type: 'warning' | 'error' | 'success', message: string}> = [];
    
    if (config.accountValue <= 0) {
      newAlerts.push({ type: 'error', message: 'El valor de la cuenta debe ser mayor a 0' });
    }
    
    if (config.dailyProfit <= 0) {
      newAlerts.push({ type: 'error', message: 'El lucro diario debe ser mayor a 0' });
    }
    
    if (config.maxRisk <= 0) {
      newAlerts.push({ type: 'error', message: 'El riesgo por sesión debe ser mayor a 0' });
    }
    
    if (config.maxRisk > config.accountValue * 0.2) {
      newAlerts.push({ type: 'warning', message: '⚠️ Riesgo elevado detectado - Más del 20% del capital' });
    }
    
    if (config.maxRisk > config.accountValue * 0.1) {
      newAlerts.push({ type: 'warning', message: '⚠️ Riesgo elevado detectado - Más del 10% del capital' });
    }
    
    if (config.dailyProfit > config.accountValue * 0.5) {
      newAlerts.push({ type: 'warning', message: '❌ Meta inalcanzable - Lucro muy alto para el capital disponible' });
    }
    
    if (bot && results && results.successProbability < 30) {
      newAlerts.push({ type: 'warning', message: '📊 Baja probabilidad de éxito - Ajusta los parámetros' });
    }
    
    if (config.accountValue < config.maxRisk * 10) {
      newAlerts.push({ type: 'warning', message: '💰 Capital insuficiente - Se recomienda 10x el riesgo diario' });
    }
    
    if (newAlerts.length === 0 && bot && results) {
      newAlerts.push({ type: 'success', message: '✅ Configuración conservadora recomendada' });
    }
    
    setAlerts(newAlerts);
  };

  // Efecto para recalcular cuando cambian los inputs
  useEffect(() => {
    if (selectedBot && accountConfig.accountValue > 0 && accountConfig.dailyProfit > 0 && accountConfig.maxRisk > 0) {
      const newResults = calculateResults(accountConfig, selectedBot);
      setResults(newResults);
      
      const newSimulations = generateSimulations(accountConfig, selectedBot);
      setSimulations(newSimulations);
      
      validateAndAlert(accountConfig, selectedBot);
    } else {
      setResults(null);
      setSimulations([]);
      validateAndAlert(accountConfig, selectedBot);
    }
  }, [accountConfig, selectedBot]);

  const handleInputChange = (field: keyof AccountConfig, value: string) => {
    const numValue = parseFloat(value) || 0;
    setAccountConfig(prev => ({ ...prev, [field]: numValue }));
  };

  return (
    <div className="min-h-screen bg-[#1a1d29] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-[#00d4aa] to-[#8b5cf6] rounded-xl">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Gestión de Capital
            </h1>
          </div>
          <p className="text-[#94a3b8] text-lg max-w-2xl mx-auto">
            Optimiza tu estrategia de trading con cálculos precisos de riesgo y recompensa
          </p>
          <div className="bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg p-4 mt-4">
            <p className="text-[#8b5cf6] text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Esta gestión de capital es exclusiva para el Radar de Apalancamiento
            </p>
          </div>
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="space-y-2 animate-in slide-in-from-top-2 duration-500">
            {alerts.map((alert, index) => (
              <Alert 
                key={index} 
                className={cn(
                  "border-l-4",
                  alert.type === 'error' && "border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]",
                  alert.type === 'warning' && "border-[#f59e0b] bg-[#f59e0b]/10 text-[#f59e0b]",
                  alert.type === 'success' && "border-[#10b981] bg-[#10b981]/10 text-[#10b981]"
                )}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Sección 1: Configuración de Cuenta */}
        <Card className="bg-[#252836] border-[#252836] text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="w-6 h-6 text-[#00d4aa]" />
              Configuración de Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountValue" className="text-[#94a3b8]">
                  Valor de la Cuenta ($)
                </Label>
                <Input
                  id="accountValue"
                  type="number"
                  placeholder="Ej: 30.00"
                  value={accountConfig.accountValue || ''}
                  onChange={(e) => handleInputChange('accountValue', e.target.value)}
                  className="bg-[#1a1d29] border-[#1a1d29] text-white placeholder:text-[#94a3b8]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyProfit" className="text-[#94a3b8]">
                  Lucro Diario Deseado ($)
                </Label>
                <Input
                  id="dailyProfit"
                  type="number"
                  placeholder="Ej: 3.00"
                  value={accountConfig.dailyProfit || ''}
                  onChange={(e) => handleInputChange('dailyProfit', e.target.value)}
                  className="bg-[#1a1d29] border-[#1a1d29] text-white placeholder:text-[#94a3b8]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxRisk" className="text-[#94a3b8]">
                  Riesgo Máximo por Sesión ($)
                </Label>
                <Input
                  id="maxRisk"
                  type="number"
                  placeholder="Ej: 3.00"
                  value={accountConfig.maxRisk || ''}
                  onChange={(e) => handleInputChange('maxRisk', e.target.value)}
                  className="bg-[#1a1d29] border-[#1a1d29] text-white placeholder:text-[#94a3b8]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sección 2: Selector de Bot */}
        <Card className="bg-[#252836] border-[#252836] text-white">
          <CardHeader>
            <CardTitle className="text-xl">Selecciona tu Estrategia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {botConfigs.map((bot) => (
                <div
                  key={bot.id}
                  onClick={() => setSelectedBot(bot)}
                  className={cn(
                    "p-4 md:p-6 rounded-xl border-2 cursor-pointer transition-all duration-500 ease-out",
                    "hover:scale-105 hover:shadow-2xl active:scale-95",
                    "transform-gpu will-change-transform",
                    selectedBot?.id === bot.id
                      ? `border-[${bot.color}] bg-gradient-to-br ${bot.gradient}/20 shadow-lg`
                      : "border-[#1a1d29] bg-[#1a1d29] hover:border-[#94a3b8]/30 hover:bg-[#252836]/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${bot.gradient}`}>
                        {bot.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{bot.name}</h3>
                        <Badge 
                          variant="secondary" 
                          className={`bg-gradient-to-r ${bot.gradient} text-white border-none`}
                        >
                          {bot.label}
                        </Badge>
                      </div>
                    </div>
                    {selectedBot?.id === bot.id && (
                      <CheckCircle className="w-6 h-6 text-[#10b981]" />
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-[#94a3b8]">
                    <div className="flex justify-between">
                      <span>Ganancia por operación:</span>
                      <span className="text-white font-medium">{(bot.profit * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pérdida por operación:</span>
                      <span className="text-white font-medium">{(bot.loss * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Meta por sesión:</span>
                      <span className="text-white font-medium">{bot.targetOperations} operación{bot.targetOperations > 1 ? 'es' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Assertividade:</span>
                      <span className="text-white font-medium">{(bot.assertiveness * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sección 3: Resultados Calculados */}
        {selectedBot && results && (
          <Card className="bg-[#252836] border-[#252836] text-white animate-in slide-in-from-bottom-4 duration-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="w-6 h-6 text-[#00d4aa]" />
                Análisis de Resultados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <div className="p-4 bg-[#1a1d29] rounded-lg border border-[#00d4aa]/20 transition-all duration-300 hover:border-[#00d4aa]/40 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-[#00d4aa]" />
                    <h4 className="font-semibold text-[#94a3b8]">Sesiones Necesarias</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">{results.sessionsNeeded}</p>
                  <p className="text-sm text-[#94a3b8]">por día para alcanzar la meta</p>
                </div>
                
                <div className="p-4 bg-[#1a1d29] rounded-lg border border-[#8b5cf6]/20 transition-all duration-300 hover:border-[#8b5cf6]/40 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-[#8b5cf6]" />
                    <h4 className="font-semibold text-[#94a3b8]">Días Estimados</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">{results.estimatedDays}</p>
                  <p className="text-sm text-[#94a3b8]">considerando 1 sesión/día</p>
                </div>
                
                <div className="p-4 bg-[#1a1d29] rounded-lg border border-[#10b981]/20 transition-all duration-300 hover:border-[#10b981]/40 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-[#10b981]" />
                    <h4 className="font-semibold text-[#94a3b8]">Ganancia Esperada</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">${results.expectedGainPerSession.toFixed(2)}</p>
                  <p className="text-sm text-[#94a3b8]">por sesión exitosa</p>
                </div>
                
                <div className="p-4 bg-[#1a1d29] rounded-lg border border-[#ef4444]/20 transition-all duration-300 hover:border-[#ef4444]/40 hover:shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
                    <h4 className="font-semibold text-[#94a3b8]">Pérdida Máxima</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">${results.maxLossPerSession.toFixed(2)}</p>
                  <p className="text-sm text-[#94a3b8]">por sesión fallida</p>
                </div>
                
                <div className="p-4 bg-[#1a1d29] rounded-lg border border-[#00d4aa]/20 transition-all duration-300 hover:border-[#00d4aa]/40 hover:shadow-lg col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="w-5 h-5 text-[#00d4aa]" />
                    <h4 className="font-semibold text-[#94a3b8]">Capital Recomendado</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">${results.recommendedCapital.toFixed(2)}</p>
                  <p className="text-sm text-[#94a3b8]">mínimo sugerido</p>
                </div>
              </div>
              
              {/* Recomendación del Sistema */}
              <div className="mt-6 p-4 bg-gradient-to-r from-[#00d4aa]/10 to-[#8b5cf6]/10 rounded-lg border border-[#00d4aa]/20">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#10b981]" />
                  Recomendación del Sistema
                </h4>
                <p className="text-[#94a3b8]">
                  {results.successProbability > 50 
                    ? `🎯 Meta alcanzable con esta estrategia. Con ${selectedBot.name}, tienes ${results.successProbability.toFixed(1)}% de probabilidad de éxito.`
                    : `⚠️ Estrategia de alto riesgo. Considera reducir el lucro diario o aumentar el capital para mejorar las probabilidades.`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sección 4: Configuración Recomendada del Bot */}
        {selectedBot && results && (
          <Card className="bg-[#252836] border-[#252836] text-white animate-in slide-in-from-bottom-5 duration-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className={`p-2 rounded-lg bg-gradient-to-r ${selectedBot.gradient}`}>
                  {selectedBot.icon}
                </div>
                Configuración Recomendada - {selectedBot.name}
              </CardTitle>
              <p className="text-[#94a3b8] text-sm mt-2">
                Valores optimizados para configurar tu bot con máxima eficiencia
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Valor Recomendado por Operación */}
                <div className="p-6 bg-gradient-to-br from-[#1a1d29] to-[#252836] rounded-xl border border-[#00d4aa]/20 hover:border-[#00d4aa]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#00d4aa]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[#00d4aa]/20 rounded-lg">
                      <Target className="w-5 h-5 text-[#00d4aa]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Valor por Operación</h4>
                      <p className="text-xs text-[#94a3b8]">Stake recomendado</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-center">
                       <p className="text-3xl font-bold text-[#00d4aa]">
                         ${selectedBot.id === 'scalping' ? accountConfig.maxRisk.toFixed(2) : (accountConfig.maxRisk / (selectedBot.targetOperations || 1)).toFixed(2)}
                       </p>
                       <p className="text-sm text-[#94a3b8]">por operación</p>
                     </div>
                    <div className="bg-[#00d4aa]/10 rounded-lg p-3">
                      <p className="text-xs text-[#00d4aa] font-medium">💡 Configuración del Bot</p>
                      <p className="text-xs text-[#94a3b8] mt-1">
                        Configura este valor como tu stake inicial en el bot
                      </p>
                    </div>
                  </div>
                </div>

                {/* Win Stop */}
                <div className="p-6 bg-gradient-to-br from-[#1a1d29] to-[#252836] rounded-xl border border-[#10b981]/20 hover:border-[#10b981]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#10b981]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[#10b981]/20 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-[#10b981]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Win Stop</h4>
                      <p className="text-xs text-[#94a3b8]">Meta de ganancia</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-center">
                       <p className="text-3xl font-bold text-[#10b981]">
                         ${(accountConfig.maxRisk * selectedBot.profit * selectedBot.targetOperations).toFixed(2)}
                       </p>
                       <p className="text-sm text-[#94a3b8]">ganancia por sesión</p>
                     </div>
                    <div className="bg-[#10b981]/10 rounded-lg p-3">
                      <p className="text-xs text-[#10b981] font-medium">🎯 Stop Win</p>
                       <p className="text-xs text-[#94a3b8] mt-1">
                         Configura este valor como tu stop de ganancia por sesión
                       </p>
                    </div>
                  </div>
                </div>

                {/* Loss Limit */}
                <div className="p-6 bg-gradient-to-br from-[#1a1d29] to-[#252836] rounded-xl border border-[#ef4444]/20 hover:border-[#ef4444]/40 transition-all duration-300 hover:shadow-lg hover:shadow-[#ef4444]/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-[#ef4444]/20 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">Pérdida Máxima</h4>
                      <p className="text-xs text-[#94a3b8]">Loss Limit</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-[#ef4444]">
                        ${accountConfig.maxRisk.toFixed(2)}
                      </p>
                      <p className="text-sm text-[#94a3b8]">pérdida máxima</p>
                    </div>
                    <div className="bg-[#ef4444]/10 rounded-lg p-3">
                      <p className="text-xs text-[#ef4444] font-medium">🛡️ Stop Loss</p>
                      <p className="text-xs text-[#94a3b8] mt-1">
                        Configura este valor como tu stop de pérdida
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instrucciones de Configuración */}
              <div className="mt-6 p-6 bg-gradient-to-r from-[#8b5cf6]/10 to-[#00d4aa]/10 rounded-xl border border-[#8b5cf6]/20">
                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                  <div className={`p-1 rounded bg-gradient-to-r ${selectedBot.gradient}`}>
                    {selectedBot.icon}
                  </div>
                  Cómo Configurar tu {selectedBot.name}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#00d4aa] rounded-full flex items-center justify-center text-white font-bold text-xs">1</div>
                    <div>
                      <p className="text-white font-medium">Stake Inicial</p>
                       <p className="text-[#94a3b8]">Configura ${selectedBot.id === 'scalping' ? accountConfig.maxRisk.toFixed(2) : (accountConfig.maxRisk / (selectedBot.targetOperations || 1)).toFixed(2)} como valor por operación</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#10b981] rounded-full flex items-center justify-center text-white font-bold text-xs">2</div>
                    <div>
                      <p className="text-white font-medium">Stop Win</p>
                       <p className="text-[#94a3b8]">Establece ${(accountConfig.maxRisk * selectedBot.profit * selectedBot.targetOperations).toFixed(2)} como meta de ganancia por sesión</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#ef4444] rounded-full flex items-center justify-center text-white font-bold text-xs">3</div>
                    <div>
                      <p className="text-white font-medium">Stop Loss</p>
                      <p className="text-[#94a3b8]">Configura ${accountConfig.maxRisk.toFixed(2)} como pérdida máxima diaria</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-[#8b5cf6]/10 rounded-lg">
                  <p className="text-[#8b5cf6] text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Con {(selectedBot.assertiveness * 100).toFixed(0)}% de assertividade, esta configuración optimiza tu gestión de riesgo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sección 5: Simulador de Sesiones */}
        {selectedBot && simulations.length > 0 && (
          <Card className="bg-[#252836] border-[#252836] text-white animate-in slide-in-from-bottom-6 duration-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Zap className="w-6 h-6 text-[#8b5cf6]" />
                Simulación de Sesiones
              </CardTitle>
              <p className="text-[#94a3b8] text-sm mt-2">
                Simulación de hasta 10 sesiones con {selectedBot.name}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {simulations.map((sim, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border transition-all duration-300 hover:shadow-lg",
                      sim.result > 0 
                        ? "bg-[#10b981]/10 border-[#10b981]/30 hover:border-[#10b981]/50" 
                        : "bg-[#ef4444]/10 border-[#ef4444]/30 hover:border-[#ef4444]/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-white">Sesión {sim.session}</h4>
                      <div className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        sim.result > 0 
                          ? "bg-[#10b981]/20 text-[#10b981]" 
                          : "bg-[#ef4444]/20 text-[#ef4444]"
                      )}>
                        {sim.result > 0 ? 'GANANCIA' : 'PÉRDIDA'}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[#94a3b8] text-sm">Riesgo:</span>
                        <span className="text-white font-medium">${sim.risk.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#94a3b8] text-sm">Resultado:</span>
                        <span className={cn(
                          "font-bold",
                          sim.result > 0 ? "text-[#10b981]" : "text-[#ef4444]"
                        )}>
                          {sim.result > 0 ? '+' : ''}${sim.result.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between pt-2 border-t border-[#1a1d29]/50">
                        <span className="text-[#94a3b8] text-sm">Saldo Final:</span>
                        <span className="text-white font-bold">${sim.balance.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-[#1a1d29] rounded-lg">
                <p className="text-[#94a3b8] text-sm">
                  <strong>Nota:</strong> Esta simulación usa probabilidades aleatorias basadas en el win rate del bot seleccionado. 
                  Los resultados reales pueden variar según las condiciones del mercado.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RiskCalculator;