import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import BotDetail from "./pages/BotDetail";
import NotFound from "./pages/NotFound";

import BestHours from "./pages/BestHours";

import Library from "./pages/Library";
import SettingsPage from "./pages/Settings";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import DerivCallback from "./pages/DerivCallback";


import PendingApprovalPage from "./pages/PendingApprovalPage";
import VerificandoAcessoPage from "./pages/VerificandoAcessoPage";
import BotsApalancamiento from "./pages/BotsApalancamiento";
import Factor50XPage from "./pages/Factor50XPage";
import BKBot from "./pages/BKBot";
import RiskManagement from "./pages/RiskManagement";
import RiskCalculator from "./pages/RiskCalculator";
import RiskSettings from "./pages/RiskSettings";
import AlfaBot from "./pages/AlfaBot";
import TipBot from "./pages/TipBot";
import XtremeBot from "./pages/XtremeBot";
import GoldBot from "./pages/XtremBot";
import TurboGanancia from "./pages/TurboGanancia";
import GoldBotAntiRepeticion from "./pages/GoldBotAntiRepeticion";
import BotDelApalancamiento from "./pages/BotDelApalancamiento";
import VipBoster from "./pages/VipBoster";
import DoubleCuentas from "./pages/DoubleCuentas";
import AuraBot from "./pages/AuraBot";
import RadarApalancamiento from "./pages/RadarApalancamiento";
import RadarScalping from "./pages/RadarScalping";
import { DerivProvider } from "./contexts/DerivContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import SecurityGate from "./components/SecurityGate";
import PaginaDeTeste from "./pages/PaginaDeTeste";
import PaginaBloqueada from "./pages/PaginaBloqueada";
import DerivConnectionPage from "./pages/DerivConnectionPage";
import BotAlpha from "./pages/BotAlpha";
import BotSelection from "./pages/BotSelection";

import GainBot from "./pages/GainBot";
import BotOmega from "./pages/BotOmega";
import BotSpeed from "./pages/BotSpeed";
import BotApalancamiento from "./pages/BotApalancamiento";
import BotQuantum from "./pages/BotQuantum";
import SensorExplosivo from "./pages/SensorExplosivo";
import EfectoMidas from "./pages/EfectoMidas";
import AstronBot from "./pages/AstronBot";
import OracleAI from "./pages/OracleAI";




import ReferralLanding from "./pages/ReferralLanding";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import Academy from "./pages/Academy";
import QuieroSerPro from "./pages/QuieroSerPro";
import { TradingSessionProvider } from "./contexts/TradingSessionContext";
import { PricingModalProvider } from "./contexts/PricingModalContext";
import PricingModal from "./components/PricingModal";
import { FloatingUpgradeButton } from "./components/FloatingUpgradeButton";
import { ProfitNotificationContainer } from "./components/ProfitNotification";
import MarketingOverlay from "./components/MarketingOverlay";

const queryClient = new QueryClient();

const App = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <DerivProvider>
              <TradingSessionProvider>
                <PricingModalProvider>
                  <Toaster />
                  <Sonner />
                  <PricingModal />
                  <ProfitNotificationContainer />
                  <div className="min-h-screen bg-background">
                    <Routes>
                      <Route path="/login" element={<Auth />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/deriv/callback" element={<DerivCallback />} />
                      <Route path="/pending-approval" element={<PendingApprovalPage />} />
                      <Route path="/verificando-acesso" element={<VerificandoAcessoPage />} />
                      <Route path="/ref/:code" element={<ReferralLanding />} />

                      {/* Rota raiz protegida - agora carrega Library com Sidebar */}
                      <Route element={<ProtectedRoute />}>
                        <Route path="/" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <Library />
                            </main>
                          </>
                        } />
                      </Route>

                      {/* Rotas protegidas */}
                      <Route element={<ProtectedRoute />}>
                        <Route path="/bot/:id" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BotDetail />
                            </main>
                          </>
                        } />



                        <Route path="/mejores-horarios" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BestHours />
                            </main>
                          </>
                        } />


                        <Route path="/settings" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <SettingsPage />
                            </main>
                          </>
                        } />

                        <Route path="/bots-apalancamiento" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BotsApalancamiento />
                            </main>
                          </>
                        } />

                        <Route path="/factor50x" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <Factor50XPage />
                            </main>
                          </>
                        } />

                        <Route path="/risk-management" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <RiskManagement />
                            </main>
                          </>
                        } />

                        <Route path="/calculadora-riesgo" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <RiskCalculator />
                            </main>
                          </>
                        } />

                        <Route path="/bk-bot" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BKBot />
                            </main>
                          </>
                        } />

                        <Route path="/alfabot" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <AlfaBot />
                            </main>
                          </>
                        } />

                        <Route path="/tipbot" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <TipBot />
                            </main>
                          </>
                        } />

                        <Route path="/xtremebot" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <XtremeBot />
                            </main>
                          </>
                        } />

                        <Route path="/xtrembot" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <GoldBot />
                            </main>
                          </>
                        } />

                        <Route path="/turbo-ganancia" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <TurboGanancia />
                            </main>
                          </>
                        } />

                        <Route path="/vip-boster" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <VipBoster />
                            </main>
                          </>
                        } />

                        <Route path="/goldbot-antirepeticion" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <GoldBotAntiRepeticion />
                            </main>
                          </>
                        } />

                        <Route path="/bot-del-apalancamiento" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BotDelApalancamiento />
                            </main>
                          </>
                        } />

                        <Route path="/double-cuentas" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <DoubleCuentas />
                            </main>
                          </>
                        } />

                        <Route path="/aura-bot" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <AuraBot />
                            </main>
                          </>
                        } />

                        <Route path="/sys-monitor-x7" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <RadarApalancamiento />
                            </main>
                          </>
                        } />

                        <Route path="/radardelapalancamiento" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <RadarApalancamiento />
                            </main>
                          </>
                        } />

                        <Route path="/bots" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BotSelection />
                            </main>
                          </>
                        } />



                        <Route path="/conectar-deriv" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <DerivConnectionPage />
                            </main>
                          </>
                        } />

                        <Route path="/gestion-riesgo" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <RiskSettings />
                            </main>
                          </>
                        } />

                        <Route path="/bot-alpha" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BotAlpha />
                            </main>
                          </>
                        } />



                        <Route path="/bots/gain" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <GainBot />
                            </main>
                          </>
                        } />

                        <Route path="/bot-omega" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BotOmega />
                            </main>
                          </>
                        } />

                        <Route path="/speed-bot" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BotSpeed />
                            </main>
                          </>
                        } />

                        <Route path="/bot-apalancamiento" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BotApalancamiento />
                            </main>
                          </>
                        } />

                        <Route path="/quantum-bot" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <BotQuantum />
                            </main>
                          </>
                        } />

                        <Route path="/radar-scalping" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <RadarScalping />
                            </main>
                          </>
                        } />



                        <Route path="/efecto-midas" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <EfectoMidas />
                            </main>
                          </>
                        } />

                        <Route path="/oracle-ai" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <OracleAI />
                            </main>
                          </>
                        } />





                        <Route path="/programa-socios" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <AffiliateDashboard />
                            </main>
                          </>
                        } />

                        <Route path="/tutorial" element={
                          <>
                            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
                            <main className={`transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                              <Academy />
                            </main>
                          </>
                        } />

                      </Route>

                      {/* Hidden route for email funnel - not in menu - PUBLIC */}
                      <Route path="/quieroserpro" element={<QuieroSerPro />} />



                      <Route path="/pagina-de-teste" element={<PaginaDeTeste />} />
                      <Route path="/PaginaBloqueada" element={<PaginaBloqueada />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>

                    <FloatingUpgradeButton />

                  </div>
                </PricingModalProvider>
              </TradingSessionProvider>
            </DerivProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
