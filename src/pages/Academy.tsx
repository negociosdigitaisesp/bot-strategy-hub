import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Play,
    Check,
    X,
    Trophy,
    ChevronRight,
    ChevronLeft,
    Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';

// Lesson data with ScreenPal video IDs
const lessons = [
    {
        id: 1,
        title: 'Conexión y Token',
        videoId: 'cOV3qRn3jhf',
        description: 'Aprende a conectar tu cuenta Deriv y configurar el token de API.',
        gradient: 'from-cyan-900 via-slate-900 to-slate-950',
        thumbnail: '/1.png'
    },
    {
        id: 2,
        title: 'Panel de Bots y Ranking',
        videoId: 'cOV3Ynn3jhu',
        description: 'Conoce el panel de bots y el ranking de asertividad.',
        gradient: 'from-emerald-900 via-slate-900 to-slate-950',
        thumbnail: '/2.png'
    },
    {
        id: 3,
        title: 'Dominando Bug Deriv',
        videoId: 'cOV3Yfn3jhG',
        description: 'Domina la estrategia Bug Deriv para maximizar ganancias.',
        gradient: 'from-violet-900 via-slate-900 to-slate-950',
        thumbnail: '/3.png'
    },
    {
        id: 4,
        title: 'Dominando el Efecto Midas',
        videoId: 'cOV3Y1n3j1l',
        description: 'Aprende a usar el Efecto Midas para detectar anomalías.',
        gradient: 'from-amber-900 via-slate-900 to-slate-950',
        thumbnail: '/4.png'
    },
    {
        id: 5,
        title: 'Gestión de Riesgos',
        videoId: 'cOV3YQn3j15',
        description: 'Configura correctamente la gestión de riesgos.',
        gradient: 'from-rose-900 via-slate-900 to-slate-950',
        thumbnail: '/5.png'
    }
];

// Floating Particles Component (only on desktop)
const FloatingParticles = () => {
    const particles = useMemo(() => {
        return Array.from({ length: 15 }, (_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            delay: `${Math.random() * 8}s`,
            size: Math.random() * 3 + 2
        }));
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="academy-particle"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: p.size,
                        height: p.size,
                        animationDelay: p.delay
                    }}
                />
            ))}
        </div>
    );
};

// Cinematic Lesson Card Component - Thumbnail-Only Design
const LessonCard = ({
    lesson,
    index,
    isWatched,
    isActive,
    onClick
}: {
    lesson: typeof lessons[0];
    index: number;
    isWatched: boolean;
    isActive: boolean;
    onClick: () => void;
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "relative group text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00F5D4] focus:ring-offset-2 focus:ring-offset-black",
                "w-full rounded-2xl overflow-hidden transition-all duration-500",
                "hover:scale-[1.05] hover:shadow-2xl",
                isActive && "ring-2 ring-[#00F5D4]"
            )}
            aria-label={`Aula ${index + 1} de ${lessons.length}: ${lesson.title}`}
        >
            {/* Animated gradient border */}
            <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-cyan-500 via-violet-500 to-amber-500 opacity-60 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x" />

            {/* Card content - Thumbnail Only */}
            <div className="relative bg-transparent rounded-2xl overflow-hidden aspect-[3/4]">
                {/* Full Thumbnail Image */}
                <img
                    src={lesson.thumbnail}
                    alt={`Lección ${index + 1}`}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                />

                {/* Subtle gradient overlay only on hover for depth */}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-opacity duration-300",
                    isHovered ? "opacity-100" : "opacity-0"
                )} />

                {/* Lesson Number Badge - Minimal, only visible on hover */}
                <div className={cn(
                    "absolute top-4 left-4 z-10 transition-all duration-300",
                    isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                )}>
                    <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/30">
                        <span className="text-sm font-mono text-white font-bold">
                            {index + 1}
                        </span>
                    </div>
                </div>

                {/* Completed Badge - Top Right */}
                {isWatched && (
                    <div className="absolute top-4 right-4 z-10">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                            <Check size={20} className="text-white" strokeWidth={3} />
                        </div>
                    </div>
                )}

                {/* Play Button - Center, visible on hover */}
                <div className={cn(
                    "absolute inset-0 flex items-center justify-center z-10 transition-all duration-300",
                    isHovered ? "opacity-100" : "opacity-0"
                )}>
                    <div className="w-24 h-24 rounded-full bg-[#00F5D4]/90 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                        <Play size={40} className="text-black pl-1" fill="currentColor" />
                    </div>
                </div>

                {/* Title overlay - Only visible on hover at bottom */}
                <div className={cn(
                    "absolute bottom-0 left-0 right-0 p-4 z-10 transition-all duration-300",
                    isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                )}>
                    <div className="bg-black/80 backdrop-blur-md rounded-lg p-3 border border-white/20">
                        <h3 className="text-white font-bold text-base mb-1 line-clamp-1">
                            {lesson.title}
                        </h3>
                        <p className="text-white/80 text-xs line-clamp-2">
                            {lesson.description}
                        </p>
                    </div>
                </div>

                {/* Active indicator glow */}
                {isActive && (
                    <div className="absolute inset-0 bg-[#00F5D4]/10 animate-pulse pointer-events-none" style={{ animationDuration: '2s' }} />
                )}
            </div>
        </button>
    );
};

// Video Modal Component
const VideoModal = ({
    lesson,
    isOpen,
    onClose
}: {
    lesson: typeof lessons[0] | null;
    isOpen: boolean;
    onClose: () => void;
}) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !lesson) return null;

    return (
        <div
            className="fixed inset-0 z-50 academy-modal-overlay flex items-center justify-center p-4 md:p-8"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-5xl bg-black/90 rounded-2xl overflow-hidden border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    aria-label="Cerrar"
                >
                    <X size={20} className="text-white" />
                </button>

                {/* Video Player */}
                <div className="aspect-video w-full">
                    <iframe
                        src={`https://go.screenpal.com/player/${lesson.videoId}?ff=1&ahc=1&dcc=1&bg=transparent&share=1&download=1&embed=1&cl=1`}
                        className="w-full h-full"
                        style={{ border: 0 }}
                        scrolling="no"
                        allowFullScreen
                        title={lesson.title}
                    />
                </div>

                {/* Lesson Info */}
                <div className="p-6 border-t border-white/10">
                    <p className="text-[#00F5D4] text-xs font-medium tracking-wider uppercase mb-1">
                        Episodio {lesson.id}
                    </p>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {lesson.title}
                    </h2>
                    <p className="text-white/60 text-sm">
                        {lesson.description}
                    </p>
                </div>
            </div>
        </div>
    );
};

// Main Academy Component - Cinematic Learning Platform
const Academy = () => {
    const [selectedLesson, setSelectedLesson] = useState<typeof lessons[0] | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [watchedLessons, setWatchedLessons] = useState<number[]>(() => {
        const saved = localStorage.getItem('academy_watched');
        return saved ? JSON.parse(saved) : [];
    });
    const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Calculate progress
    const progress = (watchedLessons.length / lessons.length) * 100;

    // Sync progress to Supabase
    const syncToSupabase = async (newWatched: number[]) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('profiles')
                    .update({ onboarding_progress: newWatched })
                    .eq('id', user.id);
            }
        } catch (error) {
            console.error('Error syncing progress to Supabase:', error);
        }
    };

    // Mark lesson as watched after 30 seconds
    useEffect(() => {
        if (isModalOpen && selectedLesson && !watchedLessons.includes(selectedLesson.id)) {
            const timer = setTimeout(() => {
                const newWatched = [...watchedLessons, selectedLesson.id];
                setWatchedLessons(newWatched);
                localStorage.setItem('academy_watched', JSON.stringify(newWatched));
                syncToSupabase(newWatched);
            }, 30000);
            return () => clearTimeout(timer);
        }
    }, [isModalOpen, selectedLesson, watchedLessons]);

    const handleCardClick = (lesson: typeof lessons[0]) => {
        setSelectedLesson(lesson);
        setCurrentlyPlaying(lesson.id);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedLesson(null), 300);
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            const newScrollLeft = direction === 'left'
                ? scrollContainerRef.current.scrollLeft - scrollAmount
                : scrollContainerRef.current.scrollLeft + scrollAmount;

            scrollContainerRef.current.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#080a0e] text-slate-200">
            {/* Background - Same as BugDeriv */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-0 left-0 w-full h-[300px] bg-cyan-600/5 blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-600/5 blur-[120px]" />
            </div>

            {/* Floating Particles (desktop only) */}
            <FloatingParticles />

            {/* Fixed Header */}
            <header className="sticky top-0 z-40 bg-gradient-to-b from-black via-black/95 to-transparent backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pt-20">
                    <div className="flex items-center justify-between">
                        {/* Left - Logo + Title */}
                        <div className="flex items-center gap-3">
                            {/* Million Bots Logo */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-lg blur-md opacity-75 group-hover:opacity-100 transition duration-500" />
                                <img
                                    src="/lovable-uploads/65acdf4d-abfd-4e5a-b2c2-27c297ceb7c6.png"
                                    alt="Million Bots Logo"
                                    className="relative w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_12px_rgba(0,245,212,0.5)]"
                                />
                            </div>

                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                    Academia Millions
                                    <Sparkles size={18} className="text-[#00F5D4] hidden sm:block" />
                                </h1>
                                <p className="text-xs sm:text-sm text-[#00F5D4]/70 tracking-wide">
                                    Mastering High-Frequency Trading
                                </p>
                            </div>
                        </div>

                        {/* Right - Progress Bar (Professional Style) */}
                        <div className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 border border-white/10">
                            <Trophy size={16} className="text-[#00FF88] hidden sm:block" />
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg sm:text-xl font-bold text-white font-mono">
                                        {watchedLessons.length}
                                    </span>
                                    <span className="text-white/40 text-sm">/</span>
                                    <span className="text-white/60 text-sm font-mono">
                                        {lessons.length}
                                    </span>
                                </div>
                                <div className="w-20 sm:w-28 h-1.5 academy-progress-bar mt-1">
                                    <div
                                        className="h-full academy-progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 px-4 sm:px-6 lg:px-8 pb-16 pt-4 sm:pt-8">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                        <div>
                            <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">
                                Biblioteca de Aulas
                            </h2>
                            <p className="text-white/40 text-sm">
                                {lessons.length} lecciones de trading profesional
                            </p>
                        </div>

                        {/* Completion indicator */}
                        {watchedLessons.length === lessons.length && (
                            <div className="flex items-center gap-2 bg-[#00FF88]/10 text-[#00FF88] px-3 py-1.5 rounded-full text-sm font-medium border border-[#00FF88]/20">
                                <Check size={14} />
                                <span className="hidden sm:inline">¡Completado!</span>
                            </div>
                        )}
                    </div>

                    {/* Lessons Carousel with Navigation */}
                    <div className="relative mb-10">
                        {/* Navigation Arrows */}
                        <button
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-cyan-500/20 to-violet-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:from-cyan-500/30 hover:to-violet-500/30 transition-all duration-300 hover:scale-110 shadow-lg shadow-cyan-500/10 -ml-6"
                        >
                            <ChevronLeft className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:from-violet-500/30 hover:to-cyan-500/30 transition-all duration-300 hover:scale-110 shadow-lg shadow-violet-500/10 -mr-6"
                        >
                            <ChevronRight className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        </button>

                        {/* Lessons Grid - Larger Thumbnail Cards */}
                        <div
                            ref={scrollContainerRef}
                            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-8 px-2 scrollbar-hide -mx-2 items-stretch"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {lessons.map((lesson, index) => (
                                <div key={lesson.id} className="min-w-[280px] w-[280px] sm:w-[300px] flex-shrink-0 snap-center">
                                    <LessonCard
                                        lesson={lesson}
                                        index={index}
                                        isWatched={watchedLessons.includes(lesson.id)}
                                        isActive={currentlyPlaying === lesson.id}
                                        onClick={() => handleCardClick(lesson)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tip Section */}
                    <div className="mt-12 p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] max-w-3xl mx-auto">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#00F5D4]/10 flex items-center justify-center flex-shrink-0">
                                <Sparkles size={20} className="text-[#00F5D4]" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium mb-1">
                                    💡 Consejo Pro
                                </h3>
                                <p className="text-white/50 text-sm leading-relaxed">
                                    Te recomendamos ver todas las aulas en orden para dominar las estrategias de trading.
                                    Cada aula se marca como completada después de 30 segundos de visualización.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Video Modal */}
            <VideoModal
                lesson={selectedLesson}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />

            {/* Bottom Gradient Fade */}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black to-transparent pointer-events-none z-30" />

            {/* CSS for animated gradient border */}
            <style>{`
                @keyframes gradient-x {
                    0%, 100% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 3s ease infinite;
                }
            `}</style>
        </div>
    );
};

export default Academy;
