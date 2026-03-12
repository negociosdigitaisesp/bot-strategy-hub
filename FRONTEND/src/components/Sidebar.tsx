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
    Crown,
    Target,
    Calculator,
    Plug,
    Coins,
    ShieldCheck,
    Bug,
    Infinity,
    Handshake,
    Gem,
    Hourglass,
    AlertTriangle,
    Rocket,
    LayoutDashboard,
    Bot,
    Crosshair,
    Atom
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { BrokerStatusWidget } from './BrokerStatusWidget';
import { supabase } from '../lib/supabaseClient';
import { useFreemiumLimiter } from '../hooks/useFreemiumLimiter';
import { useMarketingMode } from '../hooks/useMarketingMode';
import { PlanBadge } from './PlanBadge';
import { SpecialOfferModal } from './SpecialOfferModal';

interface SidebarProps {
    collapsed: boolean;
    toggleSidebar: () => void;
}

const Sidebar = ({ collapsed, toggleSidebar }: SidebarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [profileInitial, setProfileInitial] = useState('U');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [fullName, setFullName] = useState<string>('');
    const [isMobile, setIsMobile] = useState(false);
    const [showOfferModal, setShowOfferModal] = useState(false);

    // Get plan details
    const { isPro, daysLeft, planType } = useFreemiumLimiter();
    const { isMarketingMode, showTraderDiamondBadge } = useMarketingMode();

    // Calculate trial status
    const isExpired = daysLeft !== null && daysLeft <= 0;
    const isLastDay = daysLeft !== null && daysLeft === 1;
    const isUrgent = daysLeft !== null && daysLeft <= 1;

    // Detectar se é mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Obter dados do perfil (Avatar, Nome Completo e Inicial)
    useEffect(() => {
        const fetchProfile = async () => {
            if (user) {
                // Definir inicial do metadata auth como fallback instantâneo
                const metaName = user.user_metadata?.name ||
                    user.user_metadata?.full_name ||
                    user.email?.split('@')[0] || '';

                if (metaName) {
                    setProfileInitial(metaName.charAt(0).toUpperCase());
                    setFullName(metaName);
                }

                try {
                    // Buscar avatar e nome completo atualizado do banco
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('avatar_url, full_name')
                        .eq('id', user.id)
                        .single();

                    if (data) {
                        if (data.avatar_url) setAvatarUrl(data.avatar_url);

                        // Se tiver nome no perfil, usa ele (tem prioridade sobre auth meta)
                        if (data.full_name) {
                            setFullName(data.full_name);
                            setProfileInitial(data.full_name.charAt(0).toUpperCase());
                        }
                    }
                } catch (error) {
                    console.error('Erro ao buscar perfil sidebar:', error);
                }
            }
        };

        fetchProfile();

        // Subscribe to real-time profile updates
        if (user) {
            const channel = supabase
                .channel('profile-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`
                    },
                    (payload) => {
                        const newData = payload.new as { avatar_url?: string; full_name?: string };
                        if (newData.avatar_url) setAvatarUrl(newData.avatar_url);
                        if (newData.full_name) {
                            setFullName(newData.full_name);
                            setProfileInitial(newData.full_name.charAt(0).toUpperCase());
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user]);

    // Função para obter o nome de exibição do usuário
    const getDisplayName = () => {
        if (!user) return 'Usuário';

        // Prioridade: 1) fullName do state (vem do banco), 2) metadata, 3) email
        if (fullName) return fullName;

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

    const navSections = [
        {
            label: 'ÁREA DEL USUARIO',
            items: [
                {
                    name: 'Mis Brokers',
                    icon: <Plug size={20} />,
                    path: '/mis-brokers',
                    isImportant: true,
                    requiresUpgrade: false,
                    description: 'Central de conexiones'
                },

                {
                    name: 'Dashboard',
                    icon: <LayoutDashboard size={20} />,
                    path: '/',
                    isImportant: false,
                    requiresUpgrade: false,
                    description: 'Panel de Control'
                },
            ]
        },
        {
            label: 'ECOSISTEMA DERIV',
            items: [
                {
                    name: 'Bots',
                    icon: <Bot size={20} />,
                    path: '/bots',
                    isImportant: false,
                    requiresUpgrade: false,
                    description: 'Catálogo de Traders'
                },
                {
                    name: 'Copy Trading',
                    icon: <Crosshair size={20} />,
                    path: '/oracle-quant',
                    isImportant: true,
                    requiresUpgrade: true,
                    description: 'Motor HFT Estatístico'
                },
            ]
        },
        {
            label: 'AYUDA',
            items: [
                {
                    name: 'Tutorial',
                    icon: <FileText size={20} />,
                    path: '/tutorial',
                    isImportant: false,
                    requiresUpgrade: false,
                    description: 'Academia de Trading'
                },
                {
                    name: 'Programa de Socios',
                    icon: <Handshake size={20} />,
                    path: '/programa-socios',
                    isImportant: false,
                    requiresUpgrade: false,
                    description: 'Gana 60% de comisión'
                },
                {
                    name: 'Configuración',
                    icon: <Settings size={20} />,
                    path: '/settings',
                    isImportant: false,
                    requiresUpgrade: false,
                    description: 'Ajustes del sistema'
                }
            ]
        }
    ];

    return (
        <>
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

            {isMobile && !collapsed && (
                <div
                    className="fixed inset-0 bg-black/60 z-[60] transition-opacity duration-300"
                    onClick={toggleSidebar}
                />
            )}

            <div className={cn(
                'sidebar-wrapper',
                isMobile
                    ? 'bg-background border-r border-border shadow-2xl'
                    : 'bg-gradient-to-b from-sidebar via-sidebar/98 to-sidebar/95 shadow-2xl border-r border-sidebar-border/30',
                'transition-all duration-500 ease-out z-[70]',
                isMobile ? (
                    collapsed
                        ? '-translate-x-full opacity-0'
                        : 'translate-x-0 opacity-100'
                ) : (
                    collapsed ? 'sidebar-collapsed' : ''
                )
            )}>
                <div className="flex h-full flex-col relative">
                    <div className="relative">
                        {!isMobile && <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-70" />}
                        <div className={cn(
                            "relative p-4 border-b transition-all duration-300",
                            isMobile
                                ? "bg-muted/50 border-border backdrop-blur-none"
                                : "border-white/5 backdrop-blur-sm"
                        )}>
                            {/* Top row: Logo, Name, Close Button */}
                            <div className="flex items-center justify-between mb-3">
                                <div className={cn(
                                    "flex items-center gap-3 transition-all duration-300",
                                    collapsed && !isMobile && "justify-center"
                                )}>
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-lg blur-md opacity-75 group-hover:opacity-100 transition duration-500" />
                                        <img
                                            src="/lovable-uploads/65acdf4d-abfd-4e5a-b2c2-27c297ceb7c6.png"
                                            alt="Million Bots Logo"
                                            className="relative w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                                        />
                                    </div>
                                    {(!collapsed || isMobile) && (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                                                Million Bots
                                            </span>
                                            <span className="text-[10px] text-white/50 font-medium tracking-wider uppercase">
                                                Trading Intelligence
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={toggleSidebar}
                                    className={cn(
                                        "p-2 rounded-lg transition-all duration-200",
                                        "text-white/40 hover:text-white hover:bg-white/5",
                                        isMobile && "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    )}
                                >
                                    {collapsed && !isMobile ? <Menu size={18} /> : <X size={18} />}
                                </button>
                            </div>

                            {/* Bottom row: Balance Status */}
                            {(!collapsed || isMobile) && <BrokerStatusWidget />}
                        </div>
                    </div>

                    <nav className={cn(
                        "flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-accent scrollbar-track-transparent",
                        isMobile && "bg-background/95"
                    )}>
                        {navSections.map((section, sectionIndex) => (
                            <div key={section.label} className={sectionIndex > 0 ? 'mt-4' : ''}>
                                {/* Section Header */}
                                {(!collapsed || isMobile) && (
                                    <div className="px-3 py-2 mb-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
                                            {section.label}
                                        </span>
                                    </div>
                                )}
                                {collapsed && !isMobile && sectionIndex > 0 && (
                                    <div className="mx-2 my-2 h-px bg-white/5" />
                                )}

                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        const showUpgradeIndicator = item.requiresUpgrade && !isPro;

                                        return (
                                            <Link
                                                key={item.name}
                                                to={item.path}
                                                onClick={() => {
                                                    if (isMobile) toggleSidebar();
                                                }}
                                                className={cn(
                                                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                                                    "hover:bg-white/[0.05]",
                                                    isActive && "bg-primary/10 hover:bg-primary/15",
                                                    collapsed && !isMobile && "justify-center px-2"
                                                )}
                                            >
                                                {/* Left accent bar for active */}
                                                <div className={cn(
                                                    "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full transition-all duration-300",
                                                    isActive ? "bg-primary shadow-lg shadow-primary/50" : "bg-transparent"
                                                )} />

                                                {/* Icon container */}
                                                <div className={cn(
                                                    "relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
                                                    isActive
                                                        ? "bg-primary/20 text-primary"
                                                        : "text-white/50 group-hover:text-primary group-hover:bg-white/5"
                                                )}>
                                                    {item.icon}
                                                    {showUpgradeIndicator && (
                                                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                                        </span>
                                                    )}
                                                </div>

                                                {(!collapsed || isMobile) && (
                                                    <div className="flex-1 min-w-0 flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <span className={cn(
                                                                "block text-sm font-medium truncate transition-colors",
                                                                isActive ? "text-primary" : "text-white/80 group-hover:text-white"
                                                            )}>
                                                                {item.name}
                                                            </span>
                                                            <span className="block text-[10px] text-white/40 truncate mt-0.5">
                                                                {item.description}
                                                            </span>
                                                        </div>

                                                        {item.isImportant && !item.badge && (
                                                            <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
                                                                !
                                                            </span>
                                                        )}

                                                        {item.badge && (
                                                            <span className="ml-2 px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider bg-gradient-to-r from-[#00E5FF] to-[#00D1FF] text-black border border-[#00E5FF]/50 shadow-[0_0_10px_rgba(0,229,255,0.3)] animate-pulse">
                                                                {item.badge}
                                                            </span>
                                                        )}

                                                        <ChevronRight
                                                            size={14}
                                                            className={cn(
                                                                "ml-1 text-white/20 transition-all duration-200",
                                                                "group-hover:text-white/40 group-hover:translate-x-0.5",
                                                                isActive && "text-primary/50"
                                                            )}
                                                        />
                                                    </div>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    <div className="relative">
                        {!isMobile && <div className="absolute inset-0 bg-gradient-to-t from-sidebar-accent/20 to-transparent pointer-events-none" />}
                        <div className={cn(
                            "relative p-4 border-t space-y-3 transition-all duration-300",
                            isMobile
                                ? "bg-muted/30 border-border"
                                : "border-sidebar-border/30"
                        )}>
                            <div className={cn(
                                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                                isMobile
                                    ? "bg-card border border-border hover:bg-accent/50"
                                    : "bg-sidebar-accent/30 border border-sidebar-border/20 hover:bg-sidebar-accent/50",
                                collapsed && !isMobile && "justify-center"
                            )}>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm" />
                                    <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-bold shadow-lg overflow-hidden">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            profileInitial
                                        )}
                                    </div>

                                    {/* Pro Badge - Crown or Diamond */}
                                    {showTraderDiamondBadge ? (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full border-2 border-sidebar shadow-lg flex items-center justify-center">
                                            <Gem size={10} className="text-purple-100" />
                                        </div>
                                    ) : isPro ? (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full border-2 border-sidebar shadow-lg flex items-center justify-center">
                                            <Crown size={10} className="text-amber-100" />
                                        </div>
                                    ) : null}

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
                                        {/* Subtle License Status Widget - REPLACED WITH PREMIUM BADGE */}
                                        <div className="mt-2">
                                            {showTraderDiamondBadge ? (
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 w-full max-w-[180px]">
                                                    <Gem size={14} className="text-purple-400 shrink-0" />
                                                    <span className="text-xs font-bold text-purple-400 truncate">Diamante Vitalicio</span>
                                                </div>
                                            ) : (
                                                <PlanBadge planType={planType} daysLeft={daysLeft} />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Trial Countdown Card - Only show for free users */}
                        {!isPro && !showTraderDiamondBadge && daysLeft !== null && (
                            <button
                                onClick={() => setShowOfferModal(true)}
                                className={cn(
                                    "group w-full mx-4 mb-3 p-3 rounded-xl transition-all duration-300 flex items-center gap-3 border",
                                    isExpired
                                        ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50"
                                        : isUrgent
                                            ? "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50"
                                            : "bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50",
                                    collapsed && !isMobile && "justify-center mx-2 px-2"
                                )}
                                style={{ width: collapsed && !isMobile ? 'calc(100% - 16px)' : 'calc(100% - 32px)' }}
                            >
                                {/* Icon */}
                                <div className={cn(
                                    "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                                    isExpired
                                        ? "bg-red-500/20 text-red-400"
                                        : isUrgent
                                            ? "bg-orange-500/20 text-orange-400"
                                            : "bg-cyan-500/20 text-cyan-400"
                                )}>
                                    {isExpired ? (
                                        <AlertTriangle size={18} className="animate-pulse" />
                                    ) : (
                                        <Hourglass size={18} className={isUrgent ? "animate-pulse" : ""} />
                                    )}
                                </div>

                                {/* Text */}
                                {(!collapsed || isMobile) && (
                                    <div className="flex-1 text-left">
                                        <span className={cn(
                                            "block text-sm font-bold",
                                            isExpired
                                                ? "text-red-400"
                                                : isUrgent
                                                    ? "text-orange-400"
                                                    : "text-cyan-400"
                                        )}>
                                            {isExpired
                                                ? "Plan Expirado"
                                                : isLastDay
                                                    ? "Últimas 24 Horas"
                                                    : `${daysLeft} Días Restantes`}
                                        </span>
                                        <span className="block text-[10px] text-white/40 mt-0.5">
                                            {isExpired
                                                ? "Activa tu plan PRO"
                                                : "Toca para ver oferta"}
                                        </span>
                                    </div>
                                )}

                                {/* Chevron */}
                                {(!collapsed || isMobile) && (
                                    <ChevronRight
                                        size={16}
                                        className={cn(
                                            "text-white/30 transition-all group-hover:translate-x-1",
                                            isExpired ? "group-hover:text-red-400" : isUrgent ? "group-hover:text-orange-400" : "group-hover:text-cyan-400"
                                        )}
                                    />
                                )}
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className={cn(
                                "group relative z-10 flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-all duration-200",
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

            {/* Special Offer Modal */}
            <SpecialOfferModal
                isOpen={showOfferModal}
                onClose={() => setShowOfferModal(false)}
                onContinueFree={() => setShowOfferModal(false)}
                isExpired={isExpired}
                showDiscount={isExpired}
            />
        </>
    );
};

export default Sidebar;
