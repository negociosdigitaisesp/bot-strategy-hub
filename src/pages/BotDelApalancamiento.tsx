import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Zap, Activity, BarChart3, AlertTriangle, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const BotDelApalancamiento = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/15CKip4R6gzhuV050eGMpnINjI6NsTlxS/view?usp=sharing', '_blank');
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
          Volver a la Biblioteca
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-8 mb-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <TrendingUp size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Bot del Apalancamiento</h1>
              <p className="text-xl opacity-90">Estrategia Adaptativa de Alto Rendimiento</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold">89.7%</div>
              <div className="text-sm opacity-80">Precisión</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">2,156</div>
              <div className="text-sm opacity-80">Operaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">5.2x</div>
              <div className="text-sm opacity-80">Factor Lucro</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">32.1%</div>
              <div className="text-sm opacity-80">Drawdown</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descripción */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot size={20} />
                Sobre el Bot del Apalancamiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                El <strong>Bot del Apalancamiento</strong> es una estrategia avanzada que combina tres componentes principales: 
                <strong>Previsión Adaptativa</strong>, <strong>Martingale de Recuperación</strong> y el revolucionario sistema de 
                <strong>"Apalancamiento"</strong> que maximiza las ganancias a través de fases controladas.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Este bot opera en dos fases distintas: una fase de acumulación segura y una fase de apalancamiento 
                de alto rendimiento, diseñadas para optimizar tanto la seguridad como la rentabilidad del capital.
              </p>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Target className="text-purple-600 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">🎯 ESTRATEGIA PRINCIPAL</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Sistema de dos fases: Acumulación segura (Under) seguida de Apalancamiento agresivo (Over) 
                      para maximizar el crecimiento exponencial del capital.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estrategia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartLine size={20} />
                Análisis de la Estrategia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">1. Previsión Adaptativa (Lógica Basada en Perdas)</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    El bot utiliza una lógica de previsión que se vuelve más conservadora a medida que aumentan las pérdidas:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• <strong>Después de una Victoria:</strong> Previsión "Abajo de 9" (Under 9) - Probabilidad ~90%</li>
                    <li>• <strong>Después de Derrotas:</strong> Previsión "Abajo de 5" (Under 5) - Probabilidad ~50%, mayor retorno</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">2. Sistema de Recuperación (Martingale Agresivo)</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• <strong>Factor de Recuperación:</strong> Próxima apuesta = |pérdida anterior| × 2.1</li>
                    <li>• <strong>Objetivo:</strong> Recuperar pérdida + generar lucro adicional</li>
                    <li>• <strong>Reset:</strong> Stake vuelve al valor inicial después de cada victoria</li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">3. Mecanismo de Apalancamiento (Estrategia Central)</h4>
                  <div className="space-y-3">
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                      <h5 className="font-medium text-orange-800 dark:text-orange-200 mb-1">Fase 1 - Acumulación (100 operaciones)</h5>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Opera con lógica adaptativa (Under 9/Under 5) para acumular lucro de forma segura.
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                      <h5 className="font-medium text-red-800 dark:text-red-200 mb-1">Fase 2 - Apalancamiento (Después de 100 ops)</h5>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Cambia a apostas OVER: Over 0 (después de victoria) u Over 5 (después de derrota) 
                        para crecimiento exponencial.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">4. Reset de Seguridad</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Si se acumulan <strong>6 pérdidas consecutivas</strong>, el bot ejecuta un reset automático 
                    para proteger el capital de drawdowns excesivos.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración Recomendada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                Configuración Recomendada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Activo:</span>
                    <span className="text-sm">Volatility 75 Index</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Stake Inicial:</span>
                    <span className="text-sm">$1.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Multiplicador Martingale:</span>
                    <span className="text-sm">2.1x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Límite de Pérdidas:</span>
                    <span className="text-sm">6 consecutivas</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Capital Mínimo:</span>
                    <span className="text-sm">$1,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Capital Recomendado:</span>
                    <span className="text-sm">$2,500+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Fases de Operación:</span>
                    <span className="text-sm">2 (Acumulación + Apalancamiento)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Cambio de Fase:</span>
                    <span className="text-sm">Cada 100 operaciones</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Download Section */}
          <Card className="border-purple-200 dark:border-purple-800">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-purple-700 dark:text-purple-300">
                <Download size={20} />
                Descargar Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button 
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                size="lg"
              >
                <Download size={18} className="mr-2" />
                Descargar Ahora
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Archivo .xml compatible con Deriv Bot
              </p>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={20} />
                Estadísticas de Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Precisión:</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    89.7%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Operaciones Totales:</span>
                  <Badge variant="outline">2,156</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Factor de Lucro:</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    5.2x
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Drawdown Máximo:</span>
                  <Badge variant="destructive">32.1%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Level */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={20} />
                Nivel de Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="destructive" className="bg-red-500">
                  ALTO
                </Badge>
                <span className="text-sm text-gray-600 dark:text-gray-300">Debido al Martingale y Apalancamiento</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Este bot utiliza estrategias agresivas que pueden resultar en pérdidas significativas. 
                Use solo con capital que pueda permitirse perder.
              </p>
            </CardContent>
          </Card>

          {/* Key Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star size={20} />
                Características Principales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-purple-600" />
                  <span className="text-sm">Sistema de Dos Fases</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-green-600" />
                  <span className="text-sm">Previsión Adaptativa</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-orange-600" />
                  <span className="text-sm">Martingale Agresivo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-600" />
                  <span className="text-sm">Reset de Seguridad</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-600" />
                  <span className="text-sm">Operación 24/7</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target size={20} />
                Activos Recomendados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Volatility 75 Index</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Óptimo
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Volatility 100 Index</span>
                  <Badge variant="outline">
                    Compatible
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle size={20} />
                Advertencia Importante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600 dark:text-red-400">
                El sistema de Apalancamiento y Martingale puede generar grandes ganancias, pero también 
                pérdidas significativas. Nunca opere con más capital del que puede permitirse perder.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BotDelApalancamiento;