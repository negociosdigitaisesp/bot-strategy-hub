import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Zap, Activity, BarChart3, AlertTriangle, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const GoldBot = () => {
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
          Volver a la Biblioteca
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-600 via-orange-600 to-red-600 p-8 mb-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Bot size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Gold Bot</h1>
              <p className="text-xl opacity-90">Estrategia "Anti-Repetición" Agresiva</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold">88.5%</div>
              <div className="text-sm opacity-80">Precisión</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">2,156</div>
              <div className="text-sm opacity-80">Operaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">3.2x</div>
              <div className="text-sm opacity-80">Factor Lucro</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">35.2%</div>
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
                Sobre el Gold Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                El <strong>Gold Bot</strong> opera con una filosofía muy simple y directa: apuesta constantemente que 
                <strong> la suerte no se repite</strong>. Es una estrategia de <strong>alta frecuencia</strong> que no 
                intenta predecir tendencias, sino que juega con la probabilidad de que un dígito no se repita inmediatamente.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                El bot observa el último dígito que acaba de aparecer en el mercado (<strong>Volatility 100 Index</strong>) 
                e inmediatamente hace una apuesta del tipo <strong>"Diferente de" (DIGITDIFF)</strong>. Si el último dígito 
                fue 7, apuesta que el próximo último dígito <strong>NO SERÁ 7</strong>.
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="text-orange-600 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">⚠️ GESTIÓN DE RIESGO AGRESIVA</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Utiliza Martingale Dobrado: si pierde, dobla el valor de la última pérdida para recuperar 
                      todo en una sola operación. Requiere capital suficiente para soportar secuencias de pérdidas.
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
                <Target size={20} />
                Estrategia "Anti-Repetición" Agresiva
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Observación Rápida</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      El bot observa el último dígito que acaba de aparecer en el mercado (Volatility 100 Index). 
                      Por ejemplo, si el dígito fue 7.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Apuesta Inmediata</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Inmediatamente hace una apuesta del tipo "Diferente de" (DIGITDIFF). 
                      Su apuesta es: "El próximo último dígito NO SERÁ 7".
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Gestión Martingale Dobrado</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>Si gana:</strong> Vuelve al valor inicial (ej: $2).<br/>
                      <strong>Si pierde:</strong> Dobla el valor de la última pérdida para recuperar todo en una operación.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuración */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                Configuración Recomendada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Capital Mínimo</h4>
                    <p className="text-2xl font-bold text-green-600">$500</p>
                    <p className="text-xs text-gray-500">Para soportar secuencias de pérdidas</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Stake Inicial</h4>
                    <p className="text-2xl font-bold text-blue-600">$2-5</p>
                    <p className="text-xs text-gray-500">1% del capital total</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Mercado</h4>
                    <p className="text-lg font-bold text-purple-600">Volatility 100</p>
                    <p className="text-xs text-gray-500">Índice sintético</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Tipo de Apuesta</h4>
                    <p className="text-lg font-bold text-orange-600">DIGITDIFF</p>
                    <p className="text-xs text-gray-500">Diferente del último dígito</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Download Card */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                <Download size={20} />
                Descargar Gold Bot
              </CardTitle>
              <CardDescription>
                Bot listo para usar en Deriv
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button 
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                size="lg"
              >
                <Download size={16} className="mr-2" />
                Descargar Ahora
              </Button>
              <p className="text-xs text-gray-500">
                Archivo .xml compatible con DBot
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
                  <span className="text-sm text-gray-600 dark:text-gray-300">Precisión</span>
                  <span className="font-bold text-green-600">88.5%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: '88.5%'}}></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Factor de Lucro</span>
                  <span className="font-bold text-blue-600">3.2x</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '80%'}}></div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Drawdown Máx.</span>
                  <span className="font-bold text-orange-600">35.2%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full" style={{width: '35.2%'}}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Level */}
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle size={20} />
                Nivel de Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-orange-600">ALTO</div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Estrategia agresiva con Martingale. Requiere gestión cuidadosa del capital.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star size={20} />
                Características
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-yellow-500" />
                  <span className="text-sm">Alta frecuencia de operaciones</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-blue-500" />
                  <span className="text-sm">Estrategia anti-repetición</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-500" />
                  <span className="text-sm">Martingale dobrado</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-purple-500" />
                  <span className="text-sm">Operación automática</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GoldBot;