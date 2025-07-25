import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Zap, Activity, BarChart3, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TipBot = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/14t4UPqkJFFumxquZY0fclfDh8oAiI2Ci/view?usp=sharing', '_blank');
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-600 via-yellow-600 to-red-800 p-8 mb-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Zap size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Tip Bot</h1>
              <p className="text-xl opacity-90">Estrategia Agresiva de Alta Frecuencia</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold">84.5%</div>
              <div className="text-sm opacity-80">Precisión</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">2,156</div>
              <div className="text-sm opacity-80">Operaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">2.1x</div>
              <div className="text-sm opacity-80">Fator Lucro</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">22.3%</div>
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
                Sobre o Tip Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                El <strong>Tip Bot</strong> es un sistema de trading automatizado con una estrategia muy directa y agresiva. 
                Su único objetivo es realizar operaciones continuamente, apostando a que el último dígito del precio será 
                <strong> MAYOR (OVER) que cero</strong>, y utiliza un sistema de Martingale para intentar recuperar las pérdidas rápidamente.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Opera en el <strong>Índice de Volatilidad 75 (R_75)</strong> con una estrategia de alta frecuencia que busca 
                aprovechar el volumen de operaciones. Es una estrategia de <strong>alto riesgo y alta recompensa</strong> 
                diseñada para operar continuamente.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Advertencia de Alto Riesgo</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Este bot utiliza Martingale agresivo que duplica las apuestas tras cada pérdida. 
                      Solo recomendado para traders experimentados con alta tolerancia al riesgo.
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
                  <Target className="text-green-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">DIGITOVER 0</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Apuesta a que el último dígito será mayor que 0
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="text-orange-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Alta Frecuencia</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Opera continuamente sin análisis de mercado
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="text-red-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Martingale Agresivo</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Duplica la apuesta tras cada pérdida
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="text-blue-500 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold">Volatility 75</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Especializado en índice R_75
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
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🎯 1. Estrategia de Entrada: Siempre Comprar</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  A diferencia de otros bots que analizan el mercado, el TipBot <strong>no espera ninguna condición</strong>. 
                  En cada oportunidad, realiza una nueva operación con alta frecuencia.
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">📊 2. Tipo de Apuesta: DIGITOVER 0</h4>
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  La apuesta que realiza es siempre la misma: <strong>"el último dígito del precio será mayor que 0"</strong>.
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Alta Probabilidad:</strong> Solo pierde si el último dígito es exactamente 0 (10% de probabilidad).
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">⚡ 3. Gestión del Dinero: Martingale Agresivo</h4>
                <div className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                      <h5 className="font-medium text-green-600 dark:text-green-400 mb-1">Si GANA:</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Se reinicia y la siguiente apuesta vuelve al valor inicial.
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                      <h5 className="font-medium text-red-600 dark:text-red-400 mb-1">Si PIERDE:</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Activa Martingale que DUPLICA la apuesta anterior.
                      </p>
                    </div>
                  </div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded border border-yellow-300 dark:border-yellow-700">
                    <h5 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Ejemplo de Progresión:</h5>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <p>• Apuesta $1 → Pierde → Siguiente: $2</p>
                      <p>• Apuesta $2 → Pierde → Siguiente: $4</p>
                      <p>• Apuesta $4 → Pierde → Siguiente: $8</p>
                      <p>• Y así sucesivamente...</p>
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
          <Card className="border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
            <CardHeader className="text-center">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Download size={20} />
                Descargar Tip Bot
              </CardTitle>
              <CardDescription>
                Obtén acceso completo al bot de alta frecuencia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Zap className="text-orange-600 dark:text-orange-400" size={32} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Archivo incluye:
                  </p>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li>• Bot configurado para Deriv/Binary.com</li>
                    <li>• Estrategia DIGITOVER 0 optimizada</li>
                    <li>• Sistema Martingale agresivo</li>
                    <li>• Configuración para R_75</li>
                    <li>• Manual de instalación</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white"
                  size="lg"
                >
                  <Download size={16} className="mr-2" />
                  Descargar Ahora
                </Button>
                
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
                    ¿Buscas algo más extremo?
                  </p>
                  <Button 
                    onClick={() => navigate('/xtremebot')}
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    size="sm"
                  >
                    <Zap size={14} className="mr-2" />
                    Ver XtremeBot (Martingale x10)
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    El XtremeBot es una estrategia de "todo o nada" de altísimo riesgo. Opera en Volatilidad 100 y aguarda pacientemente por una única condición: el último dígito del precio sea exactamente 5. Cuando ocurre, apuesta que el próximo dígito será diferente de 3. Si pierde, aplica martingale extremadamente agresivo multiplicando por 10.
                  </p>
                </div>
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
                  <Badge variant="outline">Volatility 75 (R_75)</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tipo de Operación:</span>
                  <Badge variant="outline">DIGITOVER 0</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Frecuencia:</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">Alta Frecuencia</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sistema de Recuperación:</span>
                  <Badge variant="outline" className="text-red-600 border-red-300">Martingale Agresivo</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Multiplicador:</span>
                  <Badge variant="outline">2x (Duplica)</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Análisis de Mercado:</span>
                  <Badge variant="outline" className="text-gray-600 border-gray-300">No Requerido</Badge>
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
                  <span className="font-semibold text-green-600">84.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Operaciones:</span>
                  <span className="font-semibold">2,156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Victorias:</span>
                  <span className="font-semibold text-green-600">1,822</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Derrotas:</span>
                  <span className="font-semibold text-red-600">334</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Factor de Lucro:</span>
                  <span className="font-semibold text-blue-600">2.1x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Drawdown Máximo:</span>
                  <span className="font-semibold text-red-600">22.3%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aviso de Risco */}
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <Shield size={20} />
                Aviso de Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-red-700 dark:text-red-300">
                <p>
                  <strong>⚠️ Alto Riesgo:</strong> Este bot utiliza Martingale agresivo que puede resultar en pérdidas significativas.
                </p>
                <p>
                  <strong>💰 Gestión de Capital:</strong> Use solo capital que pueda permitirse perder completamente.
                </p>
                <p>
                  <strong>📊 Experiencia Requerida:</strong> Recomendado solo para traders experimentados.
                </p>
                <p>
                  <strong>🎯 Configuración:</strong> Establezca límites de pérdida estrictos antes de usar.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TipBot;