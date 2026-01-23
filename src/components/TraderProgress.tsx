import React, { useState, useEffect } from 'react';
import {
    GraduationCap,
    Trophy,
    Play,
    CheckCircle2,
    Sparkles,
    ChevronRight,
    Award
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// Total lessons in Academy
const TOTAL_LESSONS = 5;

interface TraderProgressProps {
    className?: string;
}

const TraderProgress: React.FC<TraderProgressProps> = ({ className }) => {
    const navigate = useNavigate();
    const [watchedLessons, setWatchedLessons] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // Load progress on mount
    useEffect(() => {
        loadProgress();
    }, []);

    const loadProgress = async () => {
        try {
            // First try to get from localStorage (fast)
            const localProgress = localStorage.getItem('academy_watched');
            if (localProgress) {
                setWatchedLessons(JSON.parse(localProgress));
            }

            // Then try to get user and sync with Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);

                // Try to load from Supabase
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_progress')
                    .eq('id', user.id)
                    .single();

                if (profile?.onboarding_progress) {
                    const supabaseProgress = profile.onboarding_progress as number[];
                    // Merge local and supabase progress (use the one with more items)
                    const localParsed = localProgress ? JSON.parse(localProgress) : [];
                    const mergedProgress = supabaseProgress.length >= localParsed.length
                        ? supabaseProgress
                        : localParsed;

                    setWatchedLessons(mergedProgress);
                    localStorage.setItem('academy_watched', JSON.stringify(mergedProgress));

                    // If local has more, sync to supabase
                    if (localParsed.length > supabaseProgress.length) {
                        await supabase
                            .from('profiles')
                            .update({ onboarding_progress: localParsed })
                            .eq('id', user.id);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const progress = (watchedLessons.length / TOTAL_LESSONS) * 100;
    const isComplete = progress >= 100;

    // Skip rendering if still loading
    if (isLoading) {
        return (
            <div className={cn("bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 animate-pulse", className)}>
                <div className="h-20 bg-white/[0.03] rounded-xl" />
            </div>
        );
    }

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl transition-all duration-500",
            isComplete
                ? "bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-cyan-500/5 border border-emerald-500/20"
                : "bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-background border border-cyan-500/20",
            className
        )}>
            {/* Animated background gradient */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={cn(
                    "absolute w-[400px] h-[200px] rounded-full blur-[100px] -top-20 -right-20 transition-colors duration-1000",
                    isComplete ? "bg-emerald-500/10" : "bg-cyan-500/10"
                )} />
                <div className="absolute w-[300px] h-[150px] bg-purple-500/5 rounded-full blur-[80px] bottom-0 -left-20" />
            </div>

            <div className="relative z-10 p-5 md:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left content */}
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={cn(
                            "relative flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500",
                            isComplete
                                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30"
                                : "bg-gradient-to-br from-cyan-400 via-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/20"
                        )}>
                            {isComplete ? (
                                <Trophy className="text-white drop-shadow" size={26} />
                            ) : (
                                <GraduationCap className="text-white drop-shadow" size={26} />
                            )}

                            {/* Glow effect */}
                            <div className={cn(
                                "absolute inset-0 rounded-xl blur-lg opacity-50",
                                isComplete ? "bg-emerald-500" : "bg-cyan-500"
                            )} />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-white">
                                    {isComplete ? '¡Felicidades, Trader!' : 'Progreso del Trader'}
                                </h3>
                                {isComplete && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                                        <Sparkles size={10} />
                                        Certificado
                                    </span>
                                )}
                            </div>

                            <p className="text-sm text-white/50 mb-3">
                                {isComplete
                                    ? 'Has completado todo el entrenamiento. ¡Ya estás listo para operar!'
                                    : `Completa el entrenamiento para dominar la plataforma`
                                }
                            </p>

                            {/* Progress bar */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-white/[0.08] rounded-full overflow-hidden max-w-[200px]">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000 relative",
                                            isComplete
                                                ? "bg-gradient-to-r from-emerald-500 to-cyan-400"
                                                : "bg-gradient-to-r from-cyan-500 to-purple-500"
                                        )}
                                        style={{ width: `${progress}%` }}
                                    >
                                        {!isComplete && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                        )}
                                    </div>
                                </div>
                                <span className={cn(
                                    "text-sm font-mono font-bold",
                                    isComplete ? "text-emerald-400" : "text-cyan-400"
                                )}>
                                    {watchedLessons.length}/{TOTAL_LESSONS}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right content - CTA or Badge */}
                    <div className="flex items-center gap-3 lg:flex-shrink-0">
                        {isComplete ? (
                            // Certified Trader Badge
                            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-xl">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                                    <Award className="text-white" size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                                        Trader Certificado
                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                    </p>
                                    <p className="text-[11px] text-white/40">100% del entrenamiento completado</p>
                                </div>
                            </div>
                        ) : (
                            // Continue Training Button
                            <button
                                onClick={() => navigate('/tutorial')}
                                className="group relative flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 hover:scale-[1.02]"
                            >
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700 rounded-xl" />

                                <Play size={18} fill="currentColor" />
                                <span className="relative">Continuar Entrenamiento</span>
                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Lesson indicators (mobile) */}
                <div className="flex items-center justify-center gap-1.5 mt-4 lg:hidden">
                    {Array.from({ length: TOTAL_LESSONS }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all duration-300",
                                watchedLessons.includes(i + 1)
                                    ? isComplete ? "bg-emerald-400" : "bg-cyan-400"
                                    : "bg-white/20"
                            )}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TraderProgress;
