
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  BookOpen, 
  ChartLine, 
  Settings, 
  FileText, 
  Clock, 
  LogOut, 
  Zap,
  User,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Crown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ collapsed, toggleSidebar }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profileInitial, setProfileInitial] = useState('U');
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Obter a inicial do nome ou email do usuário
  useEffect(() => {
    if (user) {
      const userName = user.user_metadata?.name || 
                     user.user_metadata?.full_name || 
                     user.email?.split('@')[0] || '';
      
      if (userName) {
        setProfileInitial(userName.charAt(0).toUpperCase());
      }
    }
  }, [user]);

  // Função para obter o nome de exibição do usuário
  const getDisplayName = () => {
    if (!user) return 'Usuário';
    
    const userName = user.user_metadata?.name || 
                   user.user_metadata?.full_name;
    
    return userName || (user.email ? user.email.split('@')[0] : 'Usuário');
  };

  // Função para fazer logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const navItems = [
    { 
      name: 'Ranking del Asertividad', 
      icon: <BookOpen size={20} />, 
      path: '/',
      badge: null,
      description: 'Robots disponibles'
    },
    { 
      name: 'Bots de Apalancamiento', 
      icon: <Zap size={20} />, 
      path: '/bots-apalancamiento',
      badge: null,
      description: 'Trading avanzado'
    },
    { 
      name: 'Analítica', 
      icon: <ChartLine size={20} />, 
      path: '/analytics',
      badge: null,
      description: 'Métricas y estadísticas'
    },
    { 
      name: 'Mejores Horarios', 
      icon: <Clock size={20} />, 
      path: '/mejores-horarios',
      badge: null,
      description: 'Optimización temporal'
    },
    { 
      name: 'Tutorial de Instalación', 
      icon: <FileText size={20} />, 
      path: '/installation-tutorial',
      badge: null,
      description: 'Guía paso a paso'
    },
    { 
      name: 'Configuración', 
      icon: <Settings size={20} />, 
      path: '/settings',
      badge: null,
      description: 'Ajustes del sistema'
    }
  ];

  return (
    <>
      {/* Botão de menu flutuante para mobile */}
      {isMobile && collapsed && (
        <button
          onClick={toggleSidebar}
          className={cn(
            "fixed top-4 left-4 z-50 md:hidden",
            "w-12 h-12 bg-background/90 backdrop-blur-sm",
            "rounded-xl border border-border/50",
            "flex items-center justify-center",
            "shadow-lg hover:shadow-xl",
            "transition-all duration-200 ease-out",
            "hover:bg-accent hover:border-border",
            "active:scale-95"
          )}
          aria-label="Abrir menu"
        >
          <Menu size={20} className="text-foreground" />
        </button>
      )}

      {/* Overlay para mobile */}
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'sidebar-wrapper',
        isMobile 
          ? 'bg-background border-r border-border shadow-2xl' 
          : 'bg-gradient-to-b from-sidebar via-sidebar/98 to-sidebar/95 shadow-2xl border-r border-sidebar-border/30',
        'transition-all duration-500 ease-out z-40',
        isMobile ? (
          collapsed 
            ? '-translate-x-full opacity-0' 
            : 'translate-x-0 opacity-100'
        ) : (
          collapsed ? 'sidebar-collapsed' : ''
        )
      )}>
        <div className="flex h-full flex-col relative">
          {/* Header com gradiente */}
          <div className="relative">
            {!isMobile && <div className="absolute inset-0 bg-gradient-to-r from-primary/15 to-transparent opacity-70" />}
            <div className={cn(
              "relative flex items-center justify-between p-4 border-b transition-all duration-300",
              isMobile 
                ? "bg-muted/50 border-border backdrop-blur-none" 
                : "border-sidebar-border/40 backdrop-blur-sm"
            )}>
              <div className={cn(
                "flex items-center gap-3 transition-all duration-300",
                collapsed && !isMobile && "justify-center"
              )}>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 rounded-full blur-md" />
                  <img 
                    src="/lovable-uploads/65acdf4d-abfd-4e5a-b2c2-27c297ceb7c6.png" 
                    alt="Million Bots Logo" 
                    className="relative w-8 h-8 rounded-full border border-primary/40 shadow-lg" 
                  />
                </div>
                {(!collapsed || isMobile) && (
                  <div className="flex flex-col">
                    <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent drop-shadow-sm">
                      Million Bots
                    </span>
                    <span className="text-xs text-sidebar-foreground/70 font-medium">
                      Trading Intelligence
                    </span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={toggleSidebar} 
                className={cn(
                  "group relative p-2.5 rounded-xl transition-all duration-300",
                  "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground",
                  "border border-transparent hover:border-sidebar-border/40 shadow-lg hover:shadow-xl",
                  isMobile && "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/40"
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                {collapsed && !isMobile ? (
                  <Menu size={20} className="relative z-10" />
                ) : (
                  <X size={20} className={cn(
                    "relative z-10 transition-all duration-200",
                    isMobile && "text-red-400 group-hover:text-red-300 group-hover:rotate-90"
                  )} />
                )}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-accent scrollbar-track-transparent",
            isMobile && "bg-background/95"
          )}>
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "group relative flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300",
                    isMobile 
                      ? "hover:bg-muted hover:shadow-lg border border-border/50 hover:border-border bg-card/80"
                      : "hover:bg-sidebar-accent/70 hover:shadow-xl hover:shadow-primary/10 border border-transparent hover:border-sidebar-border/30",
                    isActive && (isMobile 
                      ? "bg-primary/10 border-primary/30 shadow-lg text-primary" 
                      : "bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30 shadow-xl shadow-primary/20"
                    ),
                    collapsed && !isMobile && "justify-center px-3"
                  )}
                >
                  {/* Background gradient para item ativo */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/15 to-transparent rounded-2xl" />
                  )}
                  
                  {/* Indicador lateral para item ativo */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-primary to-primary/60 rounded-r-full shadow-lg" />
                  )}
                  
                  <div className={cn(
                    "relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300",
                    isActive 
                      ? (isMobile 
                          ? "bg-primary/20 text-primary shadow-lg border border-primary/30" 
                          : "bg-primary/25 text-primary shadow-xl shadow-primary/30 border border-primary/20"
                        )
                      : (isMobile 
                          ? "bg-muted text-foreground group-hover:bg-primary/15 group-hover:text-primary shadow-sm" 
                          : "bg-sidebar-accent/40 text-sidebar-foreground/70 group-hover:bg-primary/15 group-hover:text-primary/90 shadow-md group-hover:shadow-lg"
                        )
                  )}>
                    {item.icon}
                  </div>
                  
                  {(!collapsed || isMobile) && (
                    <div className="relative flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={cn(
                            "font-semibold text-sm transition-colors",
                            isActive 
                              ? (isMobile 
                                  ? "text-primary font-bold" 
                                  : "text-primary drop-shadow-sm"
                                )
                              : (isMobile 
                                  ? "text-foreground group-hover:text-primary" 
                                  : "text-sidebar-foreground group-hover:text-sidebar-foreground"
                                )
                          )}>
                            {item.name}
                          </span>
                          <p className={cn(
                            "text-xs mt-1 truncate transition-colors",
                            isMobile 
                              ? "text-muted-foreground" 
                              : "text-sidebar-foreground/60"
                          )}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {(!collapsed || isMobile) && (
                    <ChevronRight 
                      size={18} 
                      className={cn(
                        "text-sidebar-foreground/40 transition-all duration-300",
                        "group-hover:text-sidebar-foreground/70 group-hover:translate-x-1 group-hover:scale-110",
                        isActive && "text-primary/70"
                      )} 
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="relative">
            {!isMobile && <div className="absolute inset-0 bg-gradient-to-t from-sidebar-accent/20 to-transparent" />}
            <div className={cn(
              "relative p-4 border-t space-y-3 transition-all duration-300",
              isMobile 
                ? "bg-muted/30 border-border" 
                : "border-sidebar-border/30"
            )}>
              {/* User Info */}
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                isMobile 
                  ? "bg-card border border-border hover:bg-accent/50" 
                  : "bg-sidebar-accent/30 border border-sidebar-border/20 hover:bg-sidebar-accent/50",
                collapsed && !isMobile && "justify-center"
              )}>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm" />
                  <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-bold shadow-lg">
                    {profileInitial}
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full border-2 border-sidebar shadow-lg flex items-center justify-center">
                    <Crown size={10} className="text-amber-100" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-sidebar shadow-sm" />
                </div>
                
                {(!collapsed || isMobile) && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-semibold truncate",
                        isMobile ? "text-foreground" : "text-sidebar-foreground"
                      )}>
                        {getDisplayName()}
                      </span>
                      <Sparkles size={14} className="text-primary/60 flex-shrink-0" />
                    </div>
                    <span className={cn(
                      "text-xs truncate block",
                      isMobile ? "text-muted-foreground" : "text-sidebar-foreground/60"
                    )}>
                      {user?.email}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={cn(
                  "group flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all duration-200",
                  isMobile 
                    ? "text-foreground hover:text-red-500 hover:bg-red-50 border border-border hover:border-red-200" 
                    : "text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20",
                  collapsed && !isMobile && "justify-center"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200",
                  isMobile 
                    ? "bg-muted group-hover:bg-red-100" 
                    : "bg-sidebar-accent/30 group-hover:bg-red-500/20"
                )}>
                  <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                </div>
                {(!collapsed || isMobile) && (
                  <span className={cn(
                    "text-sm font-medium",
                    isMobile ? "text-foreground group-hover:text-red-500" : ""
                  )}>
                    Cerrar Sesión
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
