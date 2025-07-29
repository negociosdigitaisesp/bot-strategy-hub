import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Zap, Activity, BarChart3, AlertTriangle, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const GoldBotAntiRepeticion = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/1889BbrgIa2l4610JJMmM1zGVZmGr14ES/view?usp=sharing', '_blank');
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
              <div className="text-2xl font-bold">91.2%</div>
              <div className="text-sm opacity-80">Asertividad</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">2,847</div>
              <div className="text-sm opacity-80">Operaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-sm opacity-80">Operativo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">Alto</div>
              <div className="text-sm opacity-80">Rendimiento</div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="text-yellow-600" size={24} />
            Acerca del Gold Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg leading-relaxed">
            El <strong>Gold Bot</strong> opera con una filosofía muy simple y directa: apuesta constantemente que 
            <strong> la suerte no se repite</strong>. Esta estrategia de alta frecuencia no intenta predecir tendencias, 
            sino que juega con la probabilidad de que un dígito no se repita inmediatamente.
          </p>
          
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Zap className="text-yellow-600" size={20} />
              Cómo Funciona la Estrategia "Anti-Repetición"
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-yellow-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium">Observación Rápida</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    El bot observa el último dígito que apareció en el mercado (Volatility 100 Index). 
                    Por ejemplo, si el dígito fue <strong>7</strong>.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-yellow-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium">Apuesta Inmediata</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Inmediatamente hace una apuesta tipo "Diferente de" (DIGITDIFF): 
                    <em>"Apuesto que el próximo último dígito NO SERÁ 7"</em>.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-yellow-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <h4 className="font-medium">Gestión de Riesgo Agresiva (Martingale Dobrado)</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                    <p><strong>Si gana:</strong> Vuelve al valor inicial (ej: $2) en la próxima operación.</p>
                    <p><strong>Si pierde:</strong> Dobla el valor de la última pérdida para recuperar la pérdida y obtener ganancia en una sola operación.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="text-green-600" size={20} />
              Estadísticas de Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Asertividad Promedio</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">91.2%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Operaciones Totales</span>
                <span className="font-semibold">2,847</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tiempo de Operación</span>
                <span className="font-semibold">24/7 Continuo</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Mercado Principal</span>
                <span className="font-semibold">Volatility 100 Index</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-orange-600" size={20} />
              Nivel de Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-300">
                  <Flame size={14} className="mr-1" />
                  ALTO
                </Badge>
                <span className="text-sm text-gray-600">Estrategia Agresiva</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Este bot utiliza una estrategia Martingale agresiva que puede generar altos retornos, 
                pero también conlleva riesgos elevados. Recomendado para traders experimentados.
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  <strong>Advertencia:</strong> La gestión de capital es crucial. Use solo capital que pueda permitirse perder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="text-yellow-600" size={20} />
            Características Principales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Activity className="text-blue-600 mt-1" size={16} />
                <div>
                  <h4 className="font-medium">Alta Frecuencia</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Operaciones rápidas y continuas basadas en patrones de no repetición.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Shield className="text-green-600 mt-1" size={16} />
                <div>
                  <h4 className="font-medium">Gestión de Riesgo Automática</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Sistema Martingale con límites de seguridad integrados.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Clock className="text-purple-600 mt-1" size={16} />
                <div>
                  <h4 className="font-medium">Operación 24/7</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Funciona continuamente sin necesidad de supervisión constante.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="text-green-600 mt-1" size={16} />
                <div>
                  <h4 className="font-medium">Estrategia Probabilística</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Basado en la probabilidad de no repetición de dígitos consecutivos.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <ChartLine className="text-blue-600 mt-1" size={16} />
                <div>
                  <h4 className="font-medium">Recuperación Rápida</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Sistema diseñado para recuperar pérdidas en una sola operación exitosa.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Award className="text-yellow-600 mt-1" size={16} />
                <div>
                  <h4 className="font-medium">Configuración Optimizada</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Parámetros preconfigurados para máximo rendimiento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Section */}
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Descargar Gold Bot</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Obtén acceso inmediato al Gold Bot y comienza a operar con la estrategia "Anti-Repetición" Agresiva.
            </p>
          </div>
          
          <Button 
            onClick={handleDownload}
            size="lg"
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Download className="mr-2" size={20} />
            Descargar Gold Bot
          </Button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Archivo compatible con Deriv Bot. Instrucciones de instalación incluidas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoldBotAntiRepeticion;