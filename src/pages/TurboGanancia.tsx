import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Zap, Activity, BarChart3, AlertTriangle, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TurboGanancia = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/1YbtyTiqawJ5DVc4Stj9rV2cHEt3Rv83l/view?usp=sharing', '_blank');
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-8 mb-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Zap size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Turbo Ganancia</h1>
              <p className="text-xl opacity-90">Análisis de Tendencia de Paridad Ultra Rápido</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold">92.3%</div>
              <div className="text-sm opacity-80">Precisión</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">3,847</div>
              <div className="text-sm opacity-80">Operaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">4.1x</div>
              <div className="text-sm opacity-80">Factor Lucro</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">28.5%</div>
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
                Sobre el Turbo Ganancia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                El <strong>Turbo Ganancia</strong> actúa como un analista de datos ultra rápido que no intenta predecir el futuro, 
                sino que apuesta a que el comportamiento reciente de los dígitos continuará. Su filosofía es simple: 
                <strong> seguir la tendencia de paridad en tiempo real</strong>.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Este bot analiza constantemente los últimos 5 resultados del <strong>Volatility 75 Index</strong> para 
                determinar si la mayoría fueron números pares o impares, y apuesta que esta tendencia continuará en el próximo dígito.
              </p>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-3">
                  <Target className="text-emerald-600 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">🎯 ESTRATEGIA PRINCIPAL</h4>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      Análisis de "Humor del Mercado": examina los últimos 5 dígitos y apuesta por la continuidad 
                      de la tendencia de paridad dominante (Par vs Impar).
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
                Cómo Funciona la Estrategia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">1. Análisis del "Humor del Mercado" (El Detective Estadístico)</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    En cada momento, el bot examina los últimos 5 resultados del mercado y calcula rápidamente:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-1">
                    <li>• Cuántos dígitos fueron <strong>Pares</strong> (0, 2, 4, 6, 8)</li>
                    <li>• Cuántos dígitos fueron <strong>Impares</strong> (1, 3, 5, 7, 9)</li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">2. Decisión de Apuesta (Apuesta en la Mayoría)</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• Si la mayoría fue <strong>Par</strong>: Apuesta DIGITEVEN (próximo será Par)</li>
                    <li>• Si la mayoría fue <strong>Impar</strong>: Apuesta DIGITODD (próximo será Impar)</li>
                    <li>• En caso de empate: Apuesta por el que tenga mayor porcentaje en el momento</li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">3. Gestión de Riesgo (Martingale con Paciencia)</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• <strong>Apuesta Inicial:</strong> Siempre comienza con stake estándar ($1.0)</li>
                    <li>• <strong>Primera Derrota:</strong> Mantiene el stake inicial (sin martingale aún)</li>
                    <li>• <strong>Martingale Activado:</strong> Solo después de la segunda pérdida consecutiva</li>
                    <li>• <strong>Factor Agresivo:</strong> Multiplica por 2.1x para recuperar pérdidas</li>
                    <li>• <strong>Victoria:</strong> Resetea al stake inicial inmediatamente</li>
                  </ul>
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
                    <span className="text-sm font-medium">Tipo de Apuesta:</span>
                    <span className="text-sm">DIGITEVEN/DIGITODD</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Capital Mínimo:</span>
                    <span className="text-sm">$500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Capital Recomendado:</span>
                    <span className="text-sm">$1,500+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Operación:</span>
                    <span className="text-sm">24/7 Continua</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Análisis:</span>
                    <span className="text-sm">Últimos 5 dígitos</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Download Card */}
          <Card className="border-2 border-primary">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Download size={20} />
                Descargar Turbo Ganancia
              </CardTitle>
              <CardDescription>
                Bot listo para usar en Deriv
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button 
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3"
                size="lg"
              >
                <Download size={18} className="mr-2" />
                Descargar Bot
              </Button>
              <p className="text-xs text-gray-500">
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
                  <span className="text-sm">Precisión</span>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">92.3%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Operaciones Totales</span>
                  <span className="font-semibold">3,847</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Factor de Lucro</span>
                  <span className="font-semibold text-green-600">4.1x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Drawdown Máximo</span>
                  <span className="font-semibold text-orange-600">28.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tiempo Promedio/Operación</span>
                  <span className="font-semibold">45s</span>
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
              <div className="text-center space-y-3">
                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 px-4 py-2">
                  MEDIO-ALTO
                </Badge>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Requiere gestión de capital adecuada debido al uso de Martingale con factor 2.1x
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
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
                  <Zap className="text-emerald-500" size={16} />
                  <span className="text-sm">Análisis ultra rápido (5 dígitos)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="text-blue-500" size={16} />
                  <span className="text-sm">Seguimiento de tendencias de paridad</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="text-orange-500" size={16} />
                  <span className="text-sm">Martingale con paciencia</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="text-purple-500" size={16} />
                  <span className="text-sm">Operación 24/7 continua</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="text-red-500" size={16} />
                  <span className="text-sm">Sin límites de stop</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Assets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award size={20} />
                Activos Recomendados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm font-medium">Volatility 75 Index</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Óptimo</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <span className="text-sm font-medium">Volatility 100 Index</span>
                  <Badge variant="outline">Compatible</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Warning Section */}
      <Card className="mt-8 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-orange-600 mt-1" size={24} />
            <div>
              <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">⚠️ ADVERTENCIA IMPORTANTE</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                El <strong>Turbo Ganancia</strong> utiliza una estrategia de Martingale con factor 2.1x que puede generar 
                secuencias de pérdidas significativas. Es fundamental:
              </p>
              <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                <li>• Tener capital suficiente para soportar al menos 8-10 pérdidas consecutivas</li>
                <li>• Monitorear constantemente las operaciones</li>
                <li>• Establecer límites de pérdida diaria</li>
                <li>• No operar con dinero que no puedas permitirte perder</li>
                <li>• Considerar pausas durante períodos de alta volatilidad</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TurboGanancia;