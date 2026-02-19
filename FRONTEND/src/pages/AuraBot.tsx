import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AuraBot = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/17EDy0DZBJwEa_Srqa7RDzHWhdv1JDkr4/view?usp=sharing', '_blank');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="mb-4 hover:bg-primary/10"
        >
          <ArrowLeft size={16} className="mr-2" />
          Volver a la Biblioteca
        </Button>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-600 flex items-center justify-center">
            <Bot className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Aura Bot</h1>
            <p className="text-muted-foreground">Bot de Trading con Estrategia de Operación Alternada y Martingale Dividido</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className="text-primary" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">Precisión</p>
                  <p className="text-xl font-bold text-success">75.0%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-primary" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">Operaciones</p>
                  <p className="text-xl font-bold">2,890</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="text-primary" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">Riesgo</p>
                  <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Medio</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="text-primary" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">Timeframe</p>
                  <p className="text-xl font-bold">1m - 5m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Bot Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot size={20} />
                Descripción del Bot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                El <strong>Aura Bot</strong> es un sistema de trading automatizado que opera con una estrategia 
                de <strong>operación alternada</strong> entre dos apuestas de alta probabilidad en el mercado Over/Under. 
                Utiliza un sistema de recuperación <strong>Martingale Dividido</strong> para gestionar las pérdidas.
              </p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                A diferencia de otros bots que analizan tendencias de mercado, el Aura Bot opera con una 
                lógica fija de alternancia independiente del resultado anterior, lo que lo hace especialmente 
                efectivo en mercados laterales y de alta volatilidad.
              </p>
            </CardContent>
          </Card>

          {/* Strategy Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartLine size={20} />
                Análisis de la Estrategia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold text-primary mb-2">🔄 Operación Alternada (Núcleo de la Estrategia)</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  El bot no analiza tendencias de mercado. Opera con una lógica de alternancia fija entre dos 
                  apuestas de alta probabilidad en el mercado Over/Under.
                </p>
                <div className="bg-secondary/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Apuesta 1:</strong> Over 2 (Probabilidad teórica del 70%)<br />
                    <strong>Apuesta 2:</strong> Under 8 (Probabilidad teórica del 80%)<br />
                    <strong>Control:</strong> Variable NextTrade alterna independientemente del resultado
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-primary mb-2">🎯 Filtro de Entrada Específico (Gatillo de Dígito)</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  El bot espera una condición específica antes de ejecutar cada operación: que el último dígito 
                  del precio sea exactamente <strong>0</strong>. Esta condición actúa como filtro de entrada.
                </p>
                <div className="bg-secondary/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Ejemplo:</strong> Si el precio es 1234.560, el bot ejecuta la operación.<br />
                    <strong>Control:</strong> Si el último dígito no es 0, el bot espera al siguiente tick.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-primary mb-2">💰 Sistema de Recuperación (Martingale Dividido)</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Utiliza un sistema Martingale modificado que divide el multiplicador para reducir el riesgo 
                  comparado con el Martingale tradicional.
                </p>
                <div className="bg-secondary/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Apuesta inicial:</strong> $1<br />
                    <strong>Tras pérdida:</strong> $1 × 2.2 = $2.20 (en lugar de $2 del Martingale clásico)<br />
                    <strong>Ventaja:</strong> Recuperación más suave y menor riesgo de ruina
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield size={20} />
                Gestión de Riesgo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Consideraciones Importantes</h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• El sistema Martingale Dividido reduce el riesgo pero no lo elimina</li>
                  <li>• Recomendado para cuentas con capital suficiente para 8-10 niveles</li>
                  <li>• Monitorear el drawdown máximo durante rachas perdedoras</li>
                  <li>• Establecer límites de pérdida diaria antes de operar</li>
                </ul>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <h5 className="font-medium text-green-800 dark:text-green-200 mb-1">✅ Ventajas</h5>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• Estrategia simple y efectiva</li>
                    <li>• No requiere análisis técnico</li>
                    <li>• Funciona en mercados laterales</li>
                    <li>• Sistema de recuperación controlado</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <h5 className="font-medium text-red-800 dark:text-red-200 mb-1">⚠️ Riesgos</h5>
                  <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                    <li>• Rachas perdedoras pueden ser costosas</li>
                    <li>• Requiere capital adecuado</li>
                    <li>• No funciona bien en tendencias fuertes</li>
                    <li>• Dependiente de la gestión del riesgo</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Download and Stats */}
        <div className="space-y-6">
          {/* Download Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Download size={24} />
                Descargar Aura Bot
              </CardTitle>
              <CardDescription>
                Bot configurado y listo para usar en Deriv/Binary.com
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot size={40} className="text-primary" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Incluye configuración completa y manual de uso
                  </p>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li>• Bot configurado para Deriv/Binary.com</li>
                    <li>• Estrategia de operación alternada</li>
                    <li>• Sistema Martingale Dividido</li>
                    <li>• Filtro de entrada por último dígito</li>
                    <li>• Manual de configuración incluido</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={handleDownload}
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <Download size={16} className="mr-2" />
                  Descargar Bot
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap size={20} />
                Especificaciones Técnicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Activo Principal:</span>
                  <Badge variant="outline">Over/Under</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tipo de Operación:</span>
                  <Badge variant="outline">Alternada</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Condición de Entrada:</span>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">Último Dígito = 0</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sistema de Recuperación:</span>
                  <Badge variant="outline" className="text-green-600 border-green-300">Martingale Dividido</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Multiplicador:</span>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">2.2x</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Timeframe:</span>
                  <Badge variant="outline">1m - 5m</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Compatibilidad:</span>
                  <Badge variant="outline">Binary.com / Deriv</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award size={20} />
                Estadísticas de Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Precisión:</span>
                  <span className="font-semibold text-green-600">75.0%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Operaciones:</span>
                  <span className="font-semibold">2,890</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Victorias:</span>
                  <span className="font-semibold text-green-600">2,168</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Derrotas:</span>
                  <span className="font-semibold text-red-600">722</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Factor de Lucro:</span>
                  <span className="font-semibold text-blue-600">2.1x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Drawdown Máximo:</span>
                  <span className="font-semibold text-yellow-600">18.5%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuraBot;