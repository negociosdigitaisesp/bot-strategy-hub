import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Brain, Zap, Activity, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AlfaBot = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/1g9RZ7sXUKiXLrpODcmMHCzrwlAfyCsdF/view?usp=sharing', '_blank');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={16} />
          Voltar à Biblioteca
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 p-8 mb-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Brain size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">AlfaBot</h1>
              <p className="text-xl opacity-90">Bot Avançado com Inteligência Artificial</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold">85.2%</div>
              <div className="text-sm opacity-80">Precisão</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">1,247</div>
              <div className="text-sm opacity-80">Operações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">2.3x</div>
              <div className="text-sm opacity-80">Fator Lucro</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">18.5%</div>
              <div className="text-sm opacity-80">Drawdown</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descrição */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot size={20} />
                Sobre o AlfaBot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                El AlfaBot es un sistema de trading automatizado especializado en operaciones de último dígito 
                en el activo <strong>Volatility 10 (1s) Index (1HZ10V)</strong>. Su objetivo principal es 
                ganar dinero apostando a que el último dígito del precio será <strong>MENOR (UNDER)</strong> 
                que un número específico (la "predicción").
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Utiliza una estrategia avanzada de gestión de riesgo que incluye un innovador sistema de 
                "pausa de riesgo" para evitar dígitos peligrosos (8 y 9), combinado con un sistema de 
                Martingale inteligente para recuperar pérdidas de manera controlada.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Shield className="text-amber-600 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Mecanismo de Seguridad Único</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      El bot monitorea constantemente el último dígito y se pausa automáticamente cuando 
                      detecta dígitos de alto riesgo (8 o 9), protegiéndose de secuencias desfavorables.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Características Principais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={20} />
                Características Principales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Shield className="text-red-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Pausa de Riesgo</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Se pausa automáticamente cuando detecta dígitos 8 o 9
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="text-blue-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Estrategia UNDER</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Especializado en operaciones de último dígito MENOR
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="text-green-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Vigilancia Constante</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Monitoreo continuo del último dígito en Volatility 10
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="text-purple-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Martingale Inteligente</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Sistema de recuperación de pérdidas controlado
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estratégia Explicada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartLine size={20} />
                Estrategia Explicada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 Objetivo Principal</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  El AlfaBot está diseñado para ganar dinero apostando a que el último dígito de un precio 
                  será <strong>MENOR (UNDER)</strong> que un número específico (la "predicción") en el activo 
                  <strong>Volatility 10 (1s) Index (1HZ10V)</strong>.
                </p>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">🛡️ Parte 1: El Mecanismo de Seguridad (La "Pausa de Riesgo")</h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium text-red-700 dark:text-red-300 mb-1">Vigilancia Constante:</h5>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      El bot observa continuamente el último dígito del precio del activo Volatility 10 (1s) Index (1HZ10V).
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium text-red-700 dark:text-red-300 mb-1">Detección de Peligro:</h5>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Si el último dígito que aparece es un <strong>8</strong> o un <strong>9</strong>, el bot considera 
                      que el mercado es demasiado arriesgado. Inmediatamente activa un "modo de pausa" donde 
                      <strong>se niega a realizar cualquier nueva compra</strong> y simplemente espera a que pase el peligro.
                    </p>
                  </div>
                  <div>
                    <h5 className="font-medium text-red-700 dark:text-red-300 mb-1">Reactivación:</h5>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Si el bot estaba en modo de pausa y finalmente aparece un dígito seguro (cualquier número del 0 al 7), 
                      considera que la condición de riesgo ha pasado. Desactiva el modo de pausa y vuelve a estar listo para operar.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">📊 Parte 2: Sistema de Gestión de Riesgo</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Utiliza una estrategia de gestión de riesgo que incluye pausar las operaciones en momentos de peligro 
                  y un sistema de Martingale para recuperar pérdidas de manera controlada y inteligente.
                </p>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">⚡ Resumen de Protección</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>El bot evita activamente operar cuando los dígitos 8 o 9 aparecen</strong>, protegiéndose 
                  de posibles secuencias desfavorables. Esta característica única lo diferencia de otros bots 
                  y proporciona una capa adicional de seguridad en las operaciones.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Download Card */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Download size={20} />
                Download do Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Baixe o arquivo XML do AlfaBot e importe na plataforma Deriv para começar a usar.
              </p>
              <Button 
                onClick={handleDownload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Download size={16} className="mr-2" />
                Descargar AlfaBot
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Arquivo XML compatível com Binary Bot
              </p>
            </CardContent>
          </Card>

          {/* Especificações Técnicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} />
                Especificaciones Técnicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Activo Principal:</span>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Volatility 10 (1s) Index</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Tipo de Operación:</span>
                <Badge variant="outline" className="text-green-600">UNDER (Último Dígito)</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Dígitos de Riesgo:</span>
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  8 y 9 (Pausa Auto)
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Sistema de Recuperación:</span>
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Martingale Inteligente</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Monitoreo:</span>
                <Badge variant="outline" className="text-blue-600">
                  Tiempo Real (1s)
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp size={20} />
                Performance en UNDER
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Precisión UNDER</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '85.2%' }}></div>
                  </div>
                  <span className="text-sm font-bold text-green-600">85.2%</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Efectividad Pausa</span>
                <span className="text-sm font-bold text-blue-600">92.1%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Trades Evitados</span>
                <span className="text-sm font-bold text-orange-600">~35%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Recuperación Martingale</span>
                <span className="text-sm font-bold text-purple-600">78.5%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Drawdown Máximo</span>
                <span className="text-sm font-bold text-red-600">12.3%</span>
              </div>
            </CardContent>
          </Card>

          {/* Configurações Recomendadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                Configuraciones Recomendadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Activo:</span>
                  <span className="text-sm text-blue-600">Volatility 10 (1s) Index</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Stake Base:</span>
                  <span className="text-sm">$0.35</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Predicción UNDER:</span>
                  <span className="text-sm text-green-600">5 o 6</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Stop Loss:</span>
                  <span className="text-sm text-red-600">$10.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Multiplicador Martingale:</span>
                  <span className="text-sm">2.1x</span>
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <p className="text-xs text-red-700 dark:text-red-300">
                  🛡️ <strong>Pausa Automática:</strong> El bot se pausará automáticamente cuando 
                  aparezcan los dígitos 8 o 9, y se reactivará con dígitos del 0 al 7.
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 <strong>Consejo:</strong> Monitorea el último dígito en tiempo real. 
                  El sistema de pausa es la clave del éxito de este bot.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AlfaBot;