import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Zap, Activity, BarChart3, AlertTriangle, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const XtremeBot = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/1uwkWxKb8lRzl-gAmB6RQbQhWyR1FCbhs/view?usp=sharing', '_blank');
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-orange-600 to-yellow-600 p-8 mb-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Flame size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">XtremeBot</h1>
              <p className="text-xl opacity-90">Estrategia "Todo o Nada" de Riesgo Máximo</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold">91.2%</div>
              <div className="text-sm opacity-80">Precisión</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">1,847</div>
              <div className="text-sm opacity-80">Operaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">3.8x</div>
              <div className="text-sm opacity-80">Fator Lucro</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">45.7%</div>
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
                Sobre o XtremeBot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                El <strong>XtremeBot</strong> es la estrategia más peligrosa y potencialmente lucrativa del catálogo. 
                Es un sistema de <strong>"todo o nada"</strong> que opera exclusivamente en el 
                <strong> Índice de Volatilidad 100 (R_100)</strong> con una condición de entrada extremadamente específica.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                A diferencia de otros bots que operan continuamente, el XtremeBot <strong>espera pacientemente</strong> 
                hasta que el último dígito del precio sea exactamente <strong>5</strong>. Solo entonces ejecuta una 
                apuesta que el próximo dígito será diferente de 3, utilizando un sistema Martingale que 
                <strong> multiplica por 10</strong> tras cada pérdida.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-red-600 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">🚨 ADVERTENCIA CRÍTICA DE RIESGO MÁXIMO</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Este bot utiliza Martingale x10 que puede generar pérdidas catastróficas. 
                      Una secuencia de 3-4 pérdidas puede destruir completamente el capital. 
                      Solo para traders profesionales con experiencia extrema.
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
                <Flame size={20} />
                Características Extremas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Target className="text-red-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Condición Única</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Solo opera cuando último dígito = 5
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="text-orange-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">DIGITDIFFERS 3</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Apuesta que próximo dígito ≠ 3
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="text-red-600 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Martingale x10</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Multiplica por 10 tras cada pérdida
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="text-purple-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Volatility 100</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Especializado exclusivamente en R_100
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
                Estrategia "Todo o Nada" Explicada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 1. Condición de Entrada: Paciencia Extrema</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  El XtremeBot <strong>NO opera continuamente</strong>. Monitorea constantemente el precio y 
                  <strong> solo actúa cuando el último dígito es exactamente 5</strong>. Puede esperar horas 
                  sin hacer nada hasta que esta condición específica ocurra.
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">📊 2. Tipo de Apuesta: DIGITDIFFERS 3</h4>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  Cuando detecta último dígito = 5, apuesta que <strong>"el próximo dígito será diferente de 3"</strong>.
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Alta Probabilidad Teórica:</strong> 90% de ganar (solo pierde si próximo dígito es exactamente 3).
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">💥 3. Gestión del Dinero: Martingale EXTREMO x10</h4>
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                      <h5 className="font-medium text-green-600 dark:text-green-400 mb-1">Si GANA:</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Reinicia al valor base y espera nueva condición.
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                      <h5 className="font-medium text-red-600 dark:text-red-400 mb-1">Si PIERDE:</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        MULTIPLICA por 10 la apuesta anterior.
                      </p>
                    </div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded border border-red-300 dark:border-red-700">
                    <h5 className="font-medium text-red-800 dark:text-red-200 mb-1">🔥 Progresión EXTREMA:</h5>
                    <div className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      <p>• Apuesta $1 → Pierde → Siguiente: $10</p>
                      <p>• Apuesta $10 → Pierde → Siguiente: $100</p>
                      <p>• Apuesta $100 → Pierde → Siguiente: $1,000</p>
                      <p>• <strong>¡3 pérdidas = $1,111 perdidos!</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Download Card */}
          <Card className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
            <CardHeader className="text-center">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Download size={20} />
                Descargar XtremeBot
              </CardTitle>
              <CardDescription>
                Obtén acceso al bot más extremo del catálogo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Flame className="text-red-600 dark:text-red-400" size={32} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Archivo incluye:
                  </p>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li>• Bot configurado para Deriv/Binary.com</li>
                    <li>• Estrategia DIGITDIFFERS 3 optimizada</li>
                    <li>• Sistema Martingale x10 EXTREMO</li>
                    <li>• Configuración para R_100</li>
                    <li>• Manual de riesgo y advertencias</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
                  size="lg"
                >
                  <Download size={16} className="mr-2" />
                  Descargar Ahora
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Especificações Técnicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity size={20} />
                Especificaciones Técnicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Activo Principal:</span>
                  <Badge variant="outline">Volatility 100 (R_100)</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tipo de Operación:</span>
                  <Badge variant="outline">DIGITDIFFERS 3</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Condición de Entrada:</span>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">Último Dígito = 5</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sistema de Recuperación:</span>
                  <Badge variant="outline" className="text-red-600 border-red-300">Martingale x10</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Multiplicador:</span>
                  <Badge variant="outline" className="text-red-600 border-red-300">10x (EXTREMO)</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Frecuencia:</span>
                  <Badge variant="outline" className="text-purple-600 border-purple-300">Muy Baja</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Compatibilidad:</span>
                  <Badge variant="outline">Binary.com / Deriv</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} />
                Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Precisión:</span>
                  <span className="font-semibold text-green-600">91.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Operaciones:</span>
                  <span className="font-semibold">1,847</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Victorias:</span>
                  <span className="font-semibold text-green-600">1,684</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Derrotas:</span>
                  <span className="font-semibold text-red-600">163</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Factor de Lucro:</span>
                  <span className="font-semibold text-blue-600">3.8x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Drawdown Máximo:</span>
                  <span className="font-semibold text-red-600">45.7%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aviso de Risco Extremo */}
          <Card className="border-red-300 dark:border-red-700 bg-red-100 dark:bg-red-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <Shield size={20} />
                🚨 AVISO DE RIESGO EXTREMO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-red-700 dark:text-red-300">
                <p>
                  <strong>🔥 RIESGO MÁXIMO:</strong> Este es el bot MÁS PELIGROSO del catálogo. Martingale x10 puede generar pérdidas catastróficas.
                </p>
                <p>
                  <strong>💰 Capital Mínimo:</strong> $10,000+ recomendado para absorber la volatilidad extrema.
                </p>
                <p>
                  <strong>👨‍💼 Solo Profesionales:</strong> Requiere experiencia extrema en gestión de riesgo.
                </p>
                <p>
                  <strong>🛑 Stop Loss Obligatorio:</strong> Configure límites estrictos antes de usar.
                </p>
                <p>
                  <strong>⚠️ Advertencia:</strong> 3-4 pérdidas consecutivas pueden destruir completamente el capital.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default XtremeBot;