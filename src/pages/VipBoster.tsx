import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Zap, Activity, BarChart3, AlertTriangle, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const VipBoster = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/1ZbsGyk_JTJV-quDQxue7x3NEQ90L_0e1/view?usp=sharing', '_blank');
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-8 mb-8 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Star size={32} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">Vip Boster</h1>
                <Badge className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 text-sm font-semibold flex items-center gap-1 animate-pulse">
                  <Flame size={14} />
                  Mejor del Día para Apalancamiento
                </Badge>
              </div>
              <p className="text-xl opacity-90">Estrategia de Operación Alternada con Martingale Dividido</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold">88.5%</div>
              <div className="text-sm opacity-80">Precisión</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">4,125</div>
              <div className="text-sm opacity-80">Operaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">3.2x</div>
              <div className="text-sm opacity-80">Factor Lucro</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">22.8%</div>
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
                Sobre el Vip Boster
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                El <strong>Vip Boster</strong> es un bot revolucionario que combina tres estrategias avanzadas en una sola herramienta: 
                <strong> Operación Alternada, Filtro de Entrada Condicional y Martingale Dividido</strong>. Su enfoque único 
                no se basa en análisis de tendencias, sino en probabilidades matemáticas y timing preciso.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Este bot opera con una lógica de alternancia fija entre dos apostas de alta probabilidad, 
                esperando condiciones específicas del mercado para ejecutar cada operación con máxima eficiencia.
              </p>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Target className="text-purple-600 mt-1" size={16} />
                  <div>
                    <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-1">🎯 ESTRATEGIA PRINCIPAL</h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      Operación Alternada: Alterna entre Over 2 (70% probabilidad) y Under 8 (80% probabilidad) 
                      con filtros de entrada específicos para maximizar la efectividad.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estrategia Detallada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartLine size={20} />
                Estrategia Detallada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">1. Operación Alternada (Estrategia Principal)</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    El bot no analiza tendencias. Opera con una lógica de alternancia fija entre dos apostas de alta probabilidad:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <strong>Aposta 1:</strong> Over 2 (Acima de 2) - Probabilidad teórica del 70%
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <strong>Aposta 2:</strong> Under 8 (Abaixo de 8) - Probabilidad teórica del 80%
                    </li>
                  </ul>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    El bot usa una variable (NextTrade) para alternar. Después de una operación Over 2, 
                    se prepara para una Under 8, y viceversa, independientemente del resultado.
                  </p>
                </div>

                <div className="border-l-4 border-indigo-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">2. Filtro de Entrada (Gatillo Condicional)</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    El bot no entra al mercado en cada tick. Espera por un "gatillo" basado en el último dígito:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      Si la próxima operación es <strong>Over 2</strong>, solo compra si el último dígito es <strong>7</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Si la próxima operación es <strong>Under 8</strong>, solo compra si el último dígito es <strong>2</strong>
                    </li>
                  </ul>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Esta es una tentativa de encontrar un "timing" para la entrada, apostando en una reversión 
                    inmediata a partir de un dígito específico.
                  </p>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold text-lg mb-2">3. Sistema de Recuperación ("Martingale Dividido")</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-3">
                    Esta es la característica más única y compleja del bot:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <strong>Después de una Victoria:</strong> El bot retorna al valor de aposta inicial (Win Stake)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <strong>Después de una Derrota:</strong> Acumula el valor total perdido en una variable (Total Lost)
                    </li>
                  </ul>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mt-3">
                    <p className="text-sm font-medium mb-2">Fórmula de Recuperación:</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      La próxima aposta = (Total Lost × 100/35) ÷ 2<br />
                      Factor de multiplicación: ~2.85, dividido por 2 (Martingale Split)
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    <strong>Resumen:</strong> Toma el valor necesario para recuperación total y lo divide en dos operaciones. 
                    Recupera la pérdida en dos victorias consecutivas, reduciendo el riesgo de cada aposta individual.
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
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Activo:</span>
                    <span className="text-sm">Volatility 75 Index</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Stake Inicial:</span>
                    <span className="text-sm">$0.35 - $1.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Factor Martingale:</span>
                    <span className="text-sm">2.85 (Dividido)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Tipo de Aposta:</span>
                    <span className="text-sm">Alternada (Over 2 / Under 8)</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Capital Mínimo:</span>
                    <span className="text-sm">$50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Capital Recomendado:</span>
                    <span className="text-sm">$200+</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Operación:</span>
                    <span className="text-sm">24/7 Automatizada</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Filtros de Entrada:</span>
                    <span className="text-sm">Dígitos 7 y 2</span>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Download size={20} />
                Descargar Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleDownload}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Download size={18} className="mr-2" />
                Descargar Bot
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Archivo .ex4 compatible con MetaTrader 4/5
              </p>
            </CardContent>
          </Card>

          {/* Estadísticas de Rendimiento */}
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
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    88.5%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Operaciones Totales</span>
                  <span className="text-sm font-semibold">4,125</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Factor de Lucro</span>
                  <span className="text-sm font-semibold text-green-600">3.2x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Drawdown Máximo</span>
                  <span className="text-sm font-semibold text-red-600">22.8%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tiempo Promedio</span>
                  <span className="text-sm font-semibold">45s</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nivel de Riesgo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={20} />
                Nivel de Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                    MEDIO-ALTO
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  El Martingale Dividido reduce significativamente el riesgo comparado con estrategias tradicionales, 
                  pero requiere capital suficiente para secuencias de recuperación.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Características Principales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame size={20} />
                Características Principales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Operación Alternada Inteligente</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm">Filtros de Entrada Condicional</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                  <span className="text-sm">Martingale Dividido Único</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                  <span className="text-sm">Gestión de Riesgo Avanzada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Timing Preciso de Entrada</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VipBoster;