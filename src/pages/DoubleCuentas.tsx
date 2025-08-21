import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Bot, Shield, Target, TrendingUp, Clock, Star, Award, ChartLine, Zap, Activity, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DoubleCuentas = () => {
  const navigate = useNavigate();

  const handleDownload = () => {
    window.open('https://drive.google.com/file/d/1DC1Y6ePTXHe5EK3oJX_mKjuD6RD2gqFI/view?usp=sharing', '_blank');
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
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-900 via-slate-700 to-zinc-600 flex items-center justify-center">
            <Bot className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Double Cuentas 1.0</h1>
            <p className="text-muted-foreground">Bot de Trading con Estrategia de Duplicación y Análisis de Velas</p>
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
                  <p className="text-xl font-bold text-success">82.3%</p>
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
                  <p className="text-xl font-bold">3,245</p>
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
                  <Badge variant="outline" className="text-red-500 border-red-500/30">Alto</Badge>
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
                  <p className="text-xl font-bold">1m - 3m</p>
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
              <p className="text-muted-foreground leading-relaxed">
                El <strong>Double Cuentas 1.0</strong> es un sistema de trading automatizado especializado en estrategias de duplicación 
                y alta alavancagem. Utiliza análisis avanzado de velas y seguimiento de tendencias para operar en el mercado Over/Under 
                con una gestión de riesgo agresiva tipo Martingale.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Star className="text-primary" size={16} />
                    Características Principales
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Análisis de velas en tiempo real</li>
                    <li>• Seguimiento de tendencias confirmadas</li>
                    <li>• Sistema Martingale con factor 1.8x</li>
                    <li>• Gestión automática de Stop Loss y Target Profit</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Award className="text-primary" size={16} />
                    Activos Recomendados
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Volatility 75 Index</li>
                    <li>• Volatility 100 Index</li>
                    <li>• Boom 1000 Index</li>
                    <li>• Crash 1000 Index</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strategy Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartLine size={20} />
                Análisis de la Estrategia DoubleCuentas 1.0
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-primary mb-2">🧠 Análisis de Mercado (El Gatillo de Entrada)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    El corazón del bot está en el bloque tick_analysis. No analiza los dígitos directamente, sino el comportamiento 
                    del precio en un contexto más amplio, usando las velas (candles) y la dirección del mercado.
                  </p>
                  <div className="bg-secondary/20 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Condición de Compra UP:</strong> Verifica dirección general de alta (rise) + última vela verde (no negra)<br />
                      <strong>Condición de Compra DOWN:</strong> Verifica dirección general de baja (fall) + última vela roja (negra)
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">⚖️ Gestión de Riesgo Agresiva (Martingale)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    La gestión de riesgo es un pilar fundamental y agresivo de esta estrategia:
                  </p>
                  <div className="bg-secondary/20 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Después de Victoria:</strong> Reinicia el valor de apuesta al Initial Stake original<br />
                      <strong>Después de Derrota:</strong> Activa martingale con factor multiplicador de 1.8x
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-primary mb-2">🎯 Estrategia de Predicción</h4>
                  <p className="text-sm text-muted-foreground">
                    El bot opera con una lógica de seguir la tendencia confirmada, analizando tanto la dirección general 
                    del mercado como el comportamiento de las velas para generar señales de entrada precisas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Download Section */}
        <div className="space-y-6">
          {/* Download Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Descargar Double Cuentas 1.0</CardTitle>
              <CardDescription>
                Obtén acceso completo al bot y comienza a operar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Download className="text-primary" size={32} />
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Archivo incluye:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Código fuente del bot</li>
                    <li>• Manual de instalación</li>
                    <li>• Configuraciones recomendadas</li>
                    <li>• Guía de estrategia detallada</li>
                  </ul>
                </div>
                
                <Button 
                  onClick={handleDownload}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3"
                  size="lg"
                >
                  <Download size={20} className="mr-2" />
                  Descargar
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  Compatible con Deriv Bot y Binary Bot
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Requirements Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requisitos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Plataforma:</h4>
                <p className="text-sm text-muted-foreground">Deriv Bot / Binary Bot</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Capital Mínimo:</h4>
                <p className="text-sm text-muted-foreground">$200 USD recomendado</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Experiencia:</h4>
                <p className="text-sm text-muted-foreground">Intermedio a Avanzado</p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Tiempo de Configuración:</h4>
                <p className="text-sm text-muted-foreground">10-15 minutos</p>
              </div>
            </CardContent>
          </Card>

          {/* Warning Card */}
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-lg text-red-500 flex items-center gap-2">
                <Shield size={18} />
                Aviso de Riesgo Alto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Este bot utiliza estrategias de alto riesgo con Martingale agresivo. El factor de multiplicación 1.8x 
                puede generar grandes ganancias pero también pérdidas significativas. Solo para traders experimentados.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoubleCuentas;