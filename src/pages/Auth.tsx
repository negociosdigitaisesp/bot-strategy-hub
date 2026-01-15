
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, User, ArrowRight, ShieldCheck, Zap, TrendingUp, Award, Users } from "lucide-react";

const Auth = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [mode, setMode] = useState<"login" | "register">("login");

    const { signIn, signUp, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (mode === "login") {
                await signIn(email, password);
            } else {
                await signUp(email, password, name);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFreeTrial = () => {
        setMode("register");
    };

    // Motion variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: prefersReducedMotion ? 0 : 0.08,
                delayChildren: prefersReducedMotion ? 0 : 0.15
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: prefersReducedMotion ? 0 : 0.4, ease: "easeOut" }
        }
    };

    return (
        <div className="relative min-h-[100dvh] w-full bg-[#050505] overflow-hidden">

            {/* Premium Background */}
            {/* Premium Background - Optimized for Mobile */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Mobile: Efficient CSS Gradients (No heavy blur filters) */}
                <div className="md:hidden absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.15),transparent_40%)]" />
                <div className="md:hidden absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.15),transparent_40%)]" />

                {/* Desktop: High Fidelity Blur Effects */}
                <div className="hidden md:block absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] motion-safe:animate-pulse" />
                <div className="hidden md:block absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[120px] motion-safe:animate-pulse" style={{ animationDelay: '1s' }} />

                {/* Grid Pattern - Lighter on mobile */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-50 md:opacity-100" />

                {/* Scanline - Desktop Only */}
                <div className="hidden md:block absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(16,185,129,0.02)_50%)] bg-[size:100%_4px] motion-safe:animate-[scan_8s_linear_infinite]" />
            </div>

            <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4 py-8">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full max-w-md"
                >

                    {/* Header */}
                    <motion.div variants={itemVariants} className="text-center mb-6">
                        <div className="inline-block relative mb-5">
                            <div className="relative group">
                                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-lg blur-lg opacity-75 motion-safe:group-hover:opacity-100 transition duration-1000" />
                                <img
                                    src="/lovable-uploads/65acdf4d-abfd-4e5a-b2c2-27c297ceb7c6.png"
                                    alt="Million Bots"
                                    className="relative w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                                />
                            </div>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                            Million Bots
                        </h1>
                        <p className="text-slate-400 text-sm tracking-wide font-medium mb-4">
                            Plataforma Profesional de Trading Algorítmico
                        </p>

                        {/* Trust Indicators */}
                        <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                            <div className="flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                <span>Seguro</span>
                            </div>
                            <div className="w-px h-3 bg-slate-700" />
                            <div className="flex items-center gap-1">
                                <Award className="w-3 h-3 text-emerald-400" />
                                <span>Certificado</span>
                            </div>
                            <div className="w-px h-3 bg-slate-700" />
                            <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-teal-400" />
                                <span>10K+ Traders</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Free Trial Banner */}
                    <motion.div variants={itemVariants} className="mb-4">
                        <button
                            onClick={handleFreeTrial}
                            className="w-full group relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-teal-950/40 to-emerald-950/40 p-4 hover:border-emerald-500/50 transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <Zap className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-bold text-sm tracking-wide">PRUEBA 3 DÍAS GRATIS</p>
                                        <p className="text-emerald-400 text-xs font-semibold">Sin compromiso • Acceso completo</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-emerald-400 motion-safe:group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    </motion.div>

                    {/* Auth Card */}
                    <motion.div variants={itemVariants} className="relative">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-30" />

                        <div className="relative bg-slate-950/90 backdrop-blur-xl border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl">

                            {/* Mode Toggle */}
                            <div className="flex border-b border-slate-800/50">
                                <button
                                    onClick={() => setMode("login")}
                                    className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-all duration-300 relative ${mode === "login"
                                        ? "text-emerald-400"
                                        : "text-slate-500 hover:text-slate-300"
                                        }`}
                                >
                                    {mode === "login" && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    Iniciar Sesión
                                </button>
                                <button
                                    onClick={() => setMode("register")}
                                    className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-all duration-300 relative ${mode === "register"
                                        ? "text-emerald-400"
                                        : "text-slate-500 hover:text-slate-300"
                                        }`}
                                >
                                    {mode === "register" && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    Crear Cuenta
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={mode}
                                        initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                                        transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                                        className="space-y-5"
                                    >
                                        {mode === "register" && (
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-slate-300 text-xs font-bold uppercase tracking-widest">
                                                    Nombre Completo
                                                </Label>
                                                <div className="relative group">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                                                    <Input
                                                        id="name"
                                                        placeholder="Tu nombre"
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        className="pl-10 h-12 bg-slate-900/50 border-slate-700/50 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder:text-slate-500 transition-all font-medium"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-slate-300 text-xs font-bold uppercase tracking-widest">
                                                Correo Electrónico
                                            </Label>
                                            <div className="relative group">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="su@correo.com"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="pl-10 h-12 bg-slate-900/50 border-slate-700/50 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder:text-slate-500 transition-all font-medium"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="password" className="text-slate-300 text-xs font-bold uppercase tracking-widest">
                                                    Contraseña
                                                </Label>
                                                {mode === "login" && (
                                                    <Link
                                                        to="/forgot-password"
                                                        className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider font-bold"
                                                    >
                                                        ¿Olvidaste?
                                                    </Link>
                                                )}
                                            </div>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="pl-10 pr-10 h-12 bg-slate-900/50 border-slate-700/50 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 text-white placeholder:text-slate-500 transition-all font-medium"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-13 mt-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-500 text-white font-bold uppercase tracking-widest text-sm shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] transition-all duration-300 border-0 relative overflow-hidden group"
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                {mode === "login" ? "Acceder al Sistema" : "Crear Cuenta Pro"}
                                                <ArrowRight className="w-4 h-4 motion-safe:group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </span>
                                    <div className="absolute inset-0 -translate-x-full motion-safe:group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                                </Button>

                                {mode === "register" && (
                                    <p className="text-center text-xs text-slate-500 pt-2">
                                        Al crear cuenta, obtienes <span className="text-emerald-400 font-bold">3 días gratis</span> de acceso completo
                                    </p>
                                )}
                            </form>

                        </div>
                    </motion.div>

                    {/* Risk Disclaimer */}
                    <motion.div variants={itemVariants} className="mt-5 text-center">
                        <p className="text-[9px] text-slate-600 leading-relaxed max-w-sm mx-auto">
                            <span className="font-bold text-slate-500">AVISO DE RIESGO:</span> El trading algorítmico implica riesgos. Los resultados pasados no garantizan rendimientos futuros. Opera solo con capital que puedas permitirte perder.
                        </p>
                        <p className="text-[9px] text-slate-700 mt-2">
                            Al acceder, aceptas los Términos de Servicio y Política de Privacidad
                        </p>
                    </motion.div>
                </motion.div>
            </div>

            <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-size: 200% 200%;
            background-position: left center;
          }
          50% {
            background-size: 200% 200%;
            background-position: right center;
          }
        }
        
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        
        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
        </div>
    );
};

export default Auth;
