import React from 'react';
import { Download, Bot, Shield, Target, TrendingUp, Clock, Zap, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TunderBotCard = () => {
  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/1GvTxgoItvCn6ngvuttIcTX_ryuMuJB4D/view?usp=sharing', '_blank');
  };

  return (
    <Card className="tunder-card border-2 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl shadow-lg">
              <Bot size={28} className="text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">⚡ TUNDER BOT</CardTitle>
              <p className="text-purple-100 text-sm mt-1">Bot de Trading Avanzado</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
            v2.1.0
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Métricas Principais */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Target size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Asertividade</p>
                <p className="text-xl font-bold text-purple-800">78%</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 rounded-lg">
                <TrendingUp size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium">Operações</p>
                <p className="text-xl font-bold text-emerald-800">1,247</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Shield size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Risco</p>
                <p className="text-sm font-bold text-blue-800">Médio</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Clock size={16} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Timeframe</p>
                <p className="text-sm font-bold text-amber-800">1m - 5m</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Operacional */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-semibold text-emerald-700">Status: Operacional</p>
              <p className="text-xs text-emerald-600">Bot ativo e monitorando o mercado</p>
            </div>
          </div>
        </div>

        {/* Características */}
        <div className="space-y-3">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <Zap size={16} className="text-purple-600" />
            Características Principais
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Estratégia de Momentum Avançada</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Sistema Anti-Martingale Inteligente</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Análise de Padrões em Tempo Real</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Gestão Automática de Risco</span>
            </div>
          </div>
        </div>

        {/* Aviso Importante */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Activity size={16} className="text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Aviso Importante</p>
              <p className="text-xs text-amber-600 mt-1">
                Antes de utilizar o Bot, verifique que a Taxa de Crescimento esteja em 2%
              </p>
            </div>
          </div>
        </div>

        {/* Botão Download */}
        <Button 
          onClick={handleDownload}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          <Download size={18} className="mr-2" />
          Descargar Bot
        </Button>
      </CardContent>
    </Card>
  );
};

export default TunderBotCard;