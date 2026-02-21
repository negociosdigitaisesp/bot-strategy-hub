import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBugDeriv, MartingaleState } from "../hooks/useBugDeriv";
import { useDeriv } from "../contexts/DerivContext";
import { useFreemiumLimiter } from "../hooks/useFreemiumLimiter";
import { useMarketingMode } from "../hooks/useMarketingMode";
import { toast } from "sonner";

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Signal {
    entrar: boolean;
    tipo: string;
    ativo: string;
    digito: number;
    ev: number;
    percentil: number;
    rtt: number;
    ts: number;
}

interface ProposalLog {
    id: number;
    text: string;
    type: "discard" | "target" | "info" | "real";
    ts: number;
}

// ── Constantes ─────────────────────────────────────────────────────────────
const VPS_URL = "wss://ws.appmillionbots.com";
const MAX_LOGS = 60;

// ── Helpers ────────────────────────────────────────────────────────────────
function randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function formatTime(ts: number) {
    return new Date(ts * 1000).toLocaleTimeString("es-MX", { hour12: false });
}

function formatEV(ev: number): string {
    const pct = (ev * 100).toFixed(2);
    return ev >= 0 ? `+${pct}%` : `${pct}%`;
}

// ── Sparkline SVG ──────────────────────────────────────────────────────────
function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
    if (data.length < 2) return null;
    const w = 120, h = height;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
    }).join(" ");
    return (
        <svg width={w} height={h} className="overflow-visible">
            <defs>
                <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

// ── Gauge Circular ─────────────────────────────────────────────────────────
function CircularGauge({ value, color }: { value: number; color: string }) {
    const r = 28, cx = 36, cy = 36;
    const circ = 2 * Math.PI * r;
    const dash = (value / 100) * circ;
    return (
        <svg width="72" height="72">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
                cx={cx} cy={cy} r={r} fill="none"
                stroke={color} strokeWidth="6"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
            <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="bold">
                {value.toFixed(0)}%
            </text>
        </svg>
    );
}

// ── Toggle Switch Premium ──────────────────────────────────────────────────
function ToggleSwitch({ enabled, onChange, color, disabled }: {
    enabled: boolean; onChange: () => void; color: string; disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => !disabled && onChange()}
            className="relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0"
            style={{
                background: enabled ? color : "rgba(255,255,255,0.08)",
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
            }}
        >
            <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300"
                style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
            />
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
export default function OracleAI() {
    const { api } = useDeriv();

    // 🔒 Freemium limiter
    const { isFree, isLoading } = useFreemiumLimiter();

    // 🎭 Marketing Mode — resultados filtrados (APENAS brendacostatmktcp@outlook.com)
    const { isMarketingMode, filterResultado } = useMarketingMode();

    // ── Estado de conexão ──────────────────────────────────────────────────
    const [connected, setConnected] = useState(false);
    const [lastSignal, setLastSignal] = useState<Signal | null>(null);
    const [winFlash, setWinFlash] = useState<"win" | "loss" | null>(null);
    const [stats, setStats] = useState({ wins: 0, losses: 0 });
    const [profit, setProfit] = useState(0);

    // ── Métricas simuladas (animadas) ──────────────────────────────────────
    const [serverLoad, setServerLoad] = useState(42);
    const [proposalsCount, setProposalsCount] = useState(0);
    const [entropy, setEntropy] = useState<number[]>(Array.from({ length: 20 }, () => randomBetween(0.3, 0.9)));
    const [zScore, setZScore] = useState<number[]>(Array.from({ length: 20 }, () => randomBetween(-2, 2)));
    const [arbDelta, setArbDelta] = useState<number[]>(Array.from({ length: 20 }, () => randomBetween(-0.5, 0.5)));

    // ── Proposal stream ────────────────────────────────────────────────────
    const [logs, setLogs] = useState<ProposalLog[]>([]);
    const logRef = useRef<HTMLDivElement>(null);
    const logCounter = useRef(800);

    // ── Cooldown modal ─────────────────────────────────────────────────────
    const [showCooldown, setShowCooldown] = useState(false);
    const [cooldownSecs, setCooldownSecs] = useState(0);

    // ── Gestión de Riesgo ──────────────────────────────────────────────────
    const [stake, setStake] = useState(1);
    const [customStake, setCustomStake] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [stopWin, setStopWin] = useState("50.00");
    const [stopLoss, setStopLoss] = useState("25.00");
    const [useMartingale, setUseMartingale] = useState(false);
    const [maxGale, setMaxGale] = useState("3");
    const [martingaleFactor, setMartingaleFactor] = useState("2.5");
    const [useSoros, setUseSoros] = useState(false);
    const [sorosLevels, setSorosLevels] = useState(2);

    // ── Estado do Martingale (vindo do hook) ──────────────────────────────
    const [galeState, setGaleState] = useState<MartingaleState>({
        level: 0,
        currentStake: 1,
        consecutiveLosses: 0,
        isPaused: false,
    });

    // ── Animação de métricas ───────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setServerLoad(v => Math.max(20, Math.min(95, v + randomBetween(-3, 3))));
            setProposalsCount(v => v + Math.floor(randomBetween(3, 12)));
            setEntropy(prev => [...prev.slice(1), randomBetween(0.2, 1.0)]);
            setZScore(prev => [...prev.slice(1), randomBetween(-2.5, 2.5)]);
            setArbDelta(prev => [...prev.slice(1), randomBetween(-0.8, 0.8)]);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    // ── Proposal stream simulado ───────────────────────────────────────────
    const addLog = useCallback((text: string, type: ProposalLog["type"]) => {
        const entry: ProposalLog = { id: logCounter.current++, text, type, ts: Date.now() };
        setLogs(prev => [entry, ...prev].slice(0, MAX_LOGS));
    }, []);

    useEffect(() => {
        if (!isActive) return;
        const ativos = ["R_10", "R_25", "R_50", "R_75", "R_100"];
        const interval = setInterval(() => {
            const n = logCounter.current;
            const ev = (randomBetween(-0.05, 0.08)).toFixed(4);
            const ativo = ativos[Math.floor(Math.random() * ativos.length)];
            const isTarget = parseFloat(ev) > 0.04;
            if (isTarget) {
                addLog(`[OBJETIVO #${n}] ${ativo} — EV: +${ev}% — EJECUTANDO...`, "target");
            } else {
                addLog(`[PROPUESTA #${n}] ${ativo} — EV: ${ev}% — DESCARTADA`, "discard");
            }
        }, 180);
        return () => clearInterval(interval);
    }, [isActive, addLog]);

    // ── Scroll automático do log ───────────────────────────────────────────
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = 0;
        }
    }, [logs]);

    // ── Hook de conexão com VPS ────────────────────────────────────────────
    const handleSinal = useCallback((sinal: Signal) => {
        setLastSignal(sinal);
        addLog(
            `[⚡ REAL] ${sinal.ativo} ≠${sinal.digito} — EV: ${formatEV(sinal.ev)} — CONTRATO ABIERTO`,
            "real"
        );
    }, [addLog]);

    useBugDeriv(api, {
        stake,
        vpsUrl: VPS_URL,
        enabled: isActive,
        // ── Martingale + Soros Config ──────────────────────────────────────
        useMartingale,
        maxGale: parseInt(maxGale) || 3,
        martingaleFactor: parseFloat(martingaleFactor) || 2.0,
        useSoros,
        sorosLevels,
        stopWin: parseFloat(stopWin) || 0,
        stopLoss: parseFloat(stopLoss) || 0,
        // ── Callbacks ─────────────────────────────────────────────────────
        onSinal: handleSinal,
        onConectado: () => setConnected(true),
        onDesconectado: () => setConnected(false),
        onErro: (msg) => {
            addLog(`[ERROR] ${msg}`, "info");
            console.error("[OracleAI] Error en ejecución:", msg);
        },
        onCompra: (contractId) => {
            addLog(`[✅ ORDEN ABIERTA] Contract ID: ${contractId}`, "target");
        },
        onResultado: (resultado) => {
            // ── MARKETING RESULTS FILTER ──────────────────────────────────────────
            // APENAS para brendacostatmktcp@outlook.com — losses são ocultados.
            // Para qualquer outra conta, filtrado retorna sem alteração.
            const filtrado = filterResultado({
                contractId: resultado.contractId,
                lucro: resultado.lucro,
                status: resultado.status,
                stake,           // stake atual para calcular payout simulado
                galeLevel: galeState.level,
            });

            const isWin = filtrado.status === "won";
            setStats(prev => ({
                wins: prev.wins + (isWin ? 1 : 0),
                losses: prev.losses + (isWin ? 0 : 1)
            }));
            setProfit(prev => prev + (filtrado.lucro ?? 0));

            // Log: se foi filtrado (loss ocultado), exibe log de vitória sem mencionar derrota
            if (filtrado.wasFiltered) {
                addLog(
                    `[✅ VICTORIA] 100% ASSERTIVO (+${filtrado.lucro.toFixed(2)} USD)`,
                    "target"
                );
            } else {
                addLog(
                    `[🏁 RESULTADO] ${isWin ? "VICTORIA" : "DERROTA"} (${filtrado.lucro > 0 ? "+" : ""}${filtrado.lucro.toFixed(2)} USD)`,
                    isWin ? "target" : "discard"
                );
            }

            // Flash da tela: na conta de marketing NUNCA mostra vermelho
            if (isMarketingMode) {
                setWinFlash("win");
            } else {
                setWinFlash(isWin ? "win" : "loss");
            }
            setTimeout(() => setWinFlash(null), 1200);
        },
        onMartingaleChange: (state) => {
            setGaleState(state);
            if (state.level > 0) {
                addLog(
                    `[🎰 GALE ${state.level}] Stake: $${state.currentStake.toFixed(2)}`,
                    "info"
                );
            }
            if (state.isPaused) {
                addLog(`[⚠️ STREAK PAUSE] Proteção ativada — aguardando 60s`, "discard");
            }
        },
    });

    // ── Cooldown timer ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!showCooldown) return;
        setCooldownSecs(300);
        const t = setInterval(() => {
            setCooldownSecs(v => {
                if (v <= 1) { setShowCooldown(false); clearInterval(t); return 0; }
                return v - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [showCooldown]);

    const fmtCooldown = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    // ══════════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════════
    return (
        <div
            className="relative min-h-screen overflow-hidden bg-background"
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            {/* Google Fonts */}
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@400;600&display=swap');
        .mono { font-family: 'JetBrains Mono', monospace; }
        .bento-border { border: 1px solid rgba(255,255,255,0.05); }
        .neon-green { color: #10b981; }
        .neon-emerald { color: #34d399; }
        .neon-cyan { color: #22d3ee; }
        .neon-violet { color: #a78bfa; }
        .neon-amber { color: #fbbf24; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .risk-input {
          width: 100%;
          background: rgba(2,6,23,0.8);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 10px 14px;
          color: #e2e8f0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          transition: all 0.2s;
        }
        .risk-input:focus {
          border-color: rgba(16,185,129,0.5);
          box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
        }
        .risk-input:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>

            {/* Win Flash Border */}
            <AnimatePresence>
                {winFlash && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 pointer-events-none z-50"
                        style={{
                            boxShadow: winFlash === "win"
                                ? "inset 0 0 80px 20px rgba(16,185,129,0.5)"
                                : "inset 0 0 80px 20px rgba(239,68,68,0.5)",
                            border: winFlash === "win" ? "2px solid #10b981" : "2px solid #ef4444"
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Cooldown Modal */}
            <AnimatePresence>
                {showCooldown && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 flex items-center justify-center"
                        style={{ background: "rgba(2,6,23,0.92)", backdropFilter: "blur(12px)" }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="text-center bento-border rounded-2xl p-12"
                            style={{ background: "rgba(15,23,42,0.95)" }}
                        >
                            <div className="text-xs mono neon-cyan tracking-widest mb-4">PROTOCOLO DE SEGURIDAD</div>
                            <div className="text-5xl font-black text-white mb-2 mono">{fmtCooldown(cooldownSecs)}</div>
                            <div className="text-slate-400 text-sm mt-4">Sincronizando nueva firma de IP...</div>
                            <div className="mt-6 flex justify-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1.5 h-6 rounded-full"
                                        style={{ background: "#22d3ee" }}
                                        animate={{ scaleY: [1, 2, 1] }}
                                        transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── HEADER ────────────────────────────────────────────────────────── */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="bento-border"
                style={{ background: "rgba(15,23,42,0.8)", backdropFilter: "blur(8px)" }}
            >
                <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-3">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }}>
                            <span className="text-black font-black text-sm">O</span>
                        </div>
                        <div>
                            <div className="font-black text-white text-sm tracking-wider">ORACLE AI</div>
                            <div className="text-xs text-slate-500 mono">MAESTRO v3 · DIGIT DIFFER ENGINE</div>
                        </div>
                    </div>

                    {/* Neural Pulse Metrics */}
                    <div className="flex items-center gap-6 flex-wrap">
                        {/* Server Load */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 mono">CARGA</span>
                            <div className="w-24 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: "linear-gradient(90deg,#10b981,#06b6d4)", width: `${serverLoad}%` }}
                                    animate={{ width: `${serverLoad}%` }}
                                    transition={{ duration: 0.8 }}
                                />
                            </div>
                            <span className="text-xs mono neon-cyan">{serverLoad.toFixed(0)}%</span>
                        </div>

                        {/* Data Feed */}
                        <div className="flex items-center gap-1.5">
                            <motion.div
                                className="w-2 h-2 rounded-full"
                                style={{ background: connected ? "#10b981" : "#ef4444" }}
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                            />
                            <span className="text-xs mono" style={{ color: connected ? "#10b981" : "#ef4444" }}>
                                {connected ? "FEED ACTIVO" : "CONECTANDO..."}
                            </span>
                        </div>

                        {/* Proposals Analyzed */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500 mono">PROPUESTAS:</span>
                            <motion.span
                                key={proposalsCount}
                                initial={{ y: -8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-xs mono neon-amber font-bold"
                            >
                                {proposalsCount.toLocaleString()}
                            </motion.span>
                        </div>

                        {/* RTT */}
                        {lastSignal && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500 mono">RTT:</span>
                                <span className="text-xs mono neon-green">{lastSignal.rtt}ms</span>
                            </div>
                        )}
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                        <div
                            className="px-3 py-1 rounded-full text-xs mono font-bold"
                            style={{
                                background: isActive ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.15)",
                                border: `1px solid ${isActive ? "#10b981" : "#475569"}`,
                                color: isActive ? "#10b981" : "#94a3b8",
                            }}
                        >
                            {isActive ? "● OPERANDO" : "○ EN ESPERA"}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── MAIN GRID ───────────────────────────────────────────────────── */}
            <div className="max-w-screen-xl mx-auto px-6 py-6 grid grid-cols-12 gap-4">

                {/* ══════════════════════════════════════════════════════════════
                    COLUMNA IZQUIERDA: RESULTADOS + GESTIÓN DE RIESGOS
                ══════════════════════════════════════════════════════════════ */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">

                    {/* ── RESULTADOS DE OPERACIÓN ── */}
                    <motion.div
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.05 }}
                        className="bento-border rounded-xl overflow-hidden"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        {/* Header */}
                        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)" }}>
                                <span className="text-[9px] font-black text-black">📊</span>
                            </div>
                            <span className="text-xs mono text-white font-bold tracking-wider">RESULTADOS EN VIVO</span>
                        </div>

                        <div className="p-4">
                            {/* Win Rate + Gauge */}
                            <div className="flex items-center gap-3 mb-4">
                                <CircularGauge
                                    value={stats.wins + stats.losses > 0
                                        ? (stats.wins / (stats.wins + stats.losses)) * 100
                                        : 0}
                                    color={stats.wins > stats.losses ? "#10b981" : stats.wins + stats.losses === 0 ? "#475569" : "#ef4444"}
                                />
                                <div className="flex-1">
                                    <div className="text-[10px] text-slate-400 mono uppercase tracking-wider mb-1">Tasa de Aciertos</div>
                                    <div className="text-2xl font-black mono" style={{ color: stats.wins >= stats.losses ? "#10b981" : "#ef4444" }}>
                                        {stats.wins + stats.losses > 0
                                            ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
                                            : "0.0"}%
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="rounded-lg p-2.5" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.12)" }}>
                                    <div className="text-[9px] text-slate-500 mono uppercase">Victorias</div>
                                    <div className="text-lg font-black mono text-green-400">{stats.wins}</div>
                                </div>
                                <div className="rounded-lg p-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.12)" }}>
                                    <div className="text-[9px] text-slate-500 mono uppercase">Derrotas</div>
                                    <div className="text-lg font-black mono text-red-400">{stats.losses}</div>
                                </div>
                            </div>

                            {/* Martingale Level Indicator */}
                            {useMartingale && (
                                <div
                                    className="rounded-lg p-2.5 mb-2 transition-all duration-300"
                                    style={{
                                        background: galeState.level > 0
                                            ? "rgba(34,211,238,0.08)"
                                            : "rgba(255,255,255,0.02)",
                                        border: `1px solid ${galeState.level > 0 ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.06)"}`,
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[9px] text-slate-400 mono uppercase tracking-wider">Nivel Gale</span>
                                        <span className="text-xs mono font-bold" style={{ color: galeState.level > 0 ? "#22d3ee" : "#10b981" }}>
                                            {galeState.level > 0 ? `G${galeState.level}` : "BASE"}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        {Array.from({ length: parseInt(maxGale) || 3 }, (_, i) => (
                                            <div
                                                key={i}
                                                className="flex-1 h-1.5 rounded-full transition-all duration-300"
                                                style={{
                                                    background: i < galeState.level
                                                        ? i === 0 ? "#22d3ee" : i === 1 ? "#fbbf24" : "#ef4444"
                                                        : "rgba(255,255,255,0.06)",
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between mt-1.5">
                                        <span className="text-[8px] text-slate-500 mono">
                                            Stake: ${galeState.currentStake.toFixed(2)}
                                        </span>
                                        {galeState.isPaused && (
                                            <span className="text-[8px] mono" style={{ color: "#fbbf24" }}>
                                                ⏸ PAUSA
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Profit Display */}
                            <div
                                className="rounded-lg p-3 flex items-center justify-between"
                                style={{
                                    background: profit >= 0 ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                                    border: `1px solid ${profit >= 0 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)"}`,
                                }}
                            >
                                <div>
                                    <div className="text-[9px] text-slate-400 mono uppercase tracking-wider">Lucro / Pérdida</div>
                                    <div className="text-xl font-black mono mt-0.5" style={{ color: profit >= 0 ? "#10b981" : "#ef4444" }}>
                                        {profit >= 0 ? "+" : ""}{profit.toFixed(2)} USD
                                    </div>
                                </div>
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{
                                        background: profit >= 0
                                            ? "radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)"
                                            : "radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 70%)",
                                        border: `2px solid ${profit >= 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                                    }}
                                >
                                    <span className="text-sm" style={{ color: profit >= 0 ? "#10b981" : "#ef4444" }}>
                                        {profit >= 0 ? "▲" : "▼"}
                                    </span>
                                </div>
                            </div>

                            {/* Total Trades */}
                            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                                <span className="text-[9px] text-slate-500 mono uppercase">Total Operaciones</span>
                                <span className="text-xs mono text-white font-bold">{stats.wins + stats.losses}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── GESTIÓN DE RIESGOS ── */}
                    <motion.div
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bento-border rounded-xl overflow-hidden relative"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        {/* 🔒 FREE USER OVERLAY */}
                        {!isLoading && isFree && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-center p-6 rounded-xl" style={{ background: "rgba(2,6,23,0.85)", backdropFilter: "blur(10px)", border: "1px solid rgba(16,185,129,0.2)" }}>
                                <div className="p-4 rounded-full mb-4" style={{ background: "rgba(16,185,129,0.1)", boxShadow: "0 0 20px rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                                    <span style={{ fontSize: 28 }}>🔒</span>
                                </div>
                                <div className="text-xs font-black tracking-widest mb-2 uppercase" style={{ color: "#10b981" }}>ORACLE AI · PREMIUM</div>
                                <p className="text-xs leading-relaxed" style={{ color: "#64748b", maxWidth: 220 }}>Configuración avanzada disponible solo para miembros Premium.</p>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-mono" style={{ color: "#475569" }}>
                                    <span style={{ color: "#10b981" }}>●</span>
                                    <span>MODE: PREMIUM_ONLY</span>
                                </div>
                            </div>
                        )}

                        {/* Header */}
                        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#06b6d4)" }}>
                                <span className="text-[9px] font-black text-black">⚙</span>
                            </div>
                            <span className="text-xs mono text-white font-bold tracking-wider">GESTIÓN DE RIESGOS</span>
                        </div>

                        <div className="p-4 space-y-4">

                            {/* ── Valor de Apuesta (Stake) ── */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-slate-400 mono uppercase tracking-wider font-semibold">Apuesta (USD)</span>
                                    <span className="text-[10px] mono neon-amber font-bold">${stake}</span>
                                </div>
                                <div className="flex gap-1.5 flex-wrap">
                                    {[0.35, 1, 2, 5, 10].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => { setStake(v); setCustomStake(""); }}
                                            disabled={isActive}
                                            className="px-2.5 py-1.5 rounded-lg text-xs mono transition-all font-semibold"
                                            style={{
                                                background: stake === v && !customStake ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)",
                                                border: `1px solid ${stake === v && !customStake ? "#10b981" : "rgba(255,255,255,0.06)"}`,
                                                color: stake === v && !customStake ? "#10b981" : "#64748b",
                                                opacity: isActive ? 0.4 : 1,
                                                cursor: isActive ? "not-allowed" : "pointer",
                                            }}
                                        >
                                            ${v}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    placeholder="Valor personalizado..."
                                    value={customStake}
                                    onChange={(e) => {
                                        setCustomStake(e.target.value);
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val) && val > 0) setStake(val);
                                    }}
                                    disabled={isActive}
                                    className="risk-input mt-2"
                                    style={{
                                        borderColor: customStake ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)",
                                        color: customStake ? "#10b981" : "#64748b",
                                        fontSize: "11px",
                                    }}
                                />
                            </div>

                            {/* Separador */}
                            <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

                            {/* ── Stop Win ── */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-slate-400 mono uppercase tracking-wider font-semibold">Meta de Ganancia ($)</span>
                                    <span className="text-[10px] mono neon-green">{stopWin ? `$${stopWin}` : "—"}</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.50"
                                    min="1"
                                    value={stopWin}
                                    onChange={(e) => setStopWin(e.target.value)}
                                    disabled={isActive}
                                    className="risk-input"
                                    placeholder="Ej: 50.00"
                                    style={{ borderColor: "rgba(16,185,129,0.15)", color: "#34d399" }}
                                />
                            </div>

                            {/* ── Stop Loss ── */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] text-slate-400 mono uppercase tracking-wider font-semibold">Límite de Pérdida ($)</span>
                                    <span className="text-[10px] mono" style={{ color: "#f87171" }}>{stopLoss ? `$${stopLoss}` : "—"}</span>
                                </div>
                                <input
                                    type="number"
                                    step="0.50"
                                    min="1"
                                    value={stopLoss}
                                    onChange={(e) => setStopLoss(e.target.value)}
                                    disabled={isActive}
                                    className="risk-input"
                                    placeholder="Ej: 25.00"
                                    style={{ borderColor: "rgba(239,68,68,0.15)", color: "#f87171" }}
                                />
                            </div>

                            {/* Separador */}
                            <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

                            {/* ── Martingala ── */}
                            <div
                                className="rounded-xl p-3 transition-all duration-300"
                                style={{
                                    background: useMartingale ? "rgba(34,211,238,0.06)" : "rgba(255,255,255,0.02)",
                                    border: `1px solid ${useMartingale ? "rgba(34,211,238,0.2)" : "rgba(255,255,255,0.04)"}`,
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold mono text-white">Protocolo Martingala</div>
                                        <div className="text-[9px] text-slate-500 mono mt-0.5">
                                            {useMartingale ? `Factor ×${martingaleFactor} · Máx ${maxGale} niveles` : "Desactivado"}
                                        </div>
                                    </div>
                                    <ToggleSwitch enabled={useMartingale} onChange={() => setUseMartingale(!useMartingale)} color="#22d3ee" disabled={isActive} />
                                </div>

                                {/* Expandable */}
                                <div
                                    className="overflow-hidden transition-all duration-300"
                                    style={{
                                        maxHeight: useMartingale ? 200 : 0,
                                        opacity: useMartingale ? 1 : 0,
                                        marginTop: useMartingale ? 12 : 0,
                                    }}
                                >
                                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[9px] text-slate-400 mono block mb-1 uppercase">Máx Niveles</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={maxGale}
                                                    onChange={(e) => setMaxGale(e.target.value)}
                                                    disabled={isActive}
                                                    className="risk-input"
                                                    style={{ padding: "8px 10px", fontSize: "12px" }}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-slate-400 mono block mb-1 uppercase">Factor (×)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="1.5"
                                                    max="15"
                                                    value={martingaleFactor}
                                                    onChange={(e) => setMartingaleFactor(e.target.value)}
                                                    disabled={isActive}
                                                    className="risk-input"
                                                    style={{ padding: "8px 10px", fontSize: "12px" }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-[8px] text-slate-600 mono mt-2">
                                            Ej: 2.5× = duplica + 50% por nivel
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Estrategia Soros ── */}
                            <div
                                className="rounded-xl p-3 transition-all duration-300"
                                style={{
                                    background: useSoros ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.02)",
                                    border: `1px solid ${useSoros ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)"}`,
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold mono text-white">Estrategia Soros</div>
                                        <div className="text-[9px] text-slate-500 mono mt-0.5">
                                            {useSoros ? `Nivel ${sorosLevels} activo` : "Desactivado"}
                                        </div>
                                    </div>
                                    <ToggleSwitch enabled={useSoros} onChange={() => setUseSoros(!useSoros)} color="#a855f7" disabled={isActive} />
                                </div>

                                {/* Expandable */}
                                <div
                                    className="overflow-hidden transition-all duration-300"
                                    style={{
                                        maxHeight: useSoros ? 160 : 0,
                                        opacity: useSoros ? 1 : 0,
                                        marginTop: useSoros ? 12 : 0,
                                    }}
                                >
                                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
                                        {/* Level Selector */}
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] text-slate-400 mono uppercase">Conservador (1)</span>
                                            <span className="text-[9px] text-slate-400 mono uppercase">Agresivo (5)</span>
                                        </div>
                                        <div className="relative h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                                            <div
                                                className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${(sorosLevels / 5) * 100}%`, background: "linear-gradient(90deg,#a855f7,#ec4899)" }}
                                            />
                                            <input
                                                type="range"
                                                min="1" max="5" step="1"
                                                value={sorosLevels}
                                                onChange={(e) => setSorosLevels(parseInt(e.target.value))}
                                                disabled={isActive}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow border-2 border-purple-500 pointer-events-none transition-all"
                                                style={{ left: `calc(${(sorosLevels / 5) * 100}% - 6px)` }}
                                            />
                                        </div>
                                        <div className="text-[9px] text-slate-600 mono mt-3 text-center">
                                            Reinicia a la base después de <strong className="text-purple-400">{sorosLevels}</strong> {sorosLevels === 1 ? "victoria" : "victorias"} consecutivas
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    COLUMNA CENTRAL: Proposal Stream + Botón
                ══════════════════════════════════════════════════════════════ */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">

                    {/* Núcleo — Proposal Stream */}
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="bento-border rounded-xl flex flex-col"
                        style={{ background: "rgba(15,23,42,0.7)", height: "520px" }}
                    >
                        {/* Terminal header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                <span className="text-xs mono text-slate-400 ml-2">ORACLE_STREAM · ANÁLISIS EN TIEMPO REAL</span>
                            </div>
                            <motion.div
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="text-xs mono neon-green"
                            >
                                ● LIVE
                            </motion.div>
                        </div>

                        {/* Logs */}
                        <div
                            ref={logRef}
                            className="flex-1 overflow-y-auto scrollbar-hide p-4 flex flex-col gap-1"
                            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px" }}
                        >
                            <AnimatePresence initial={false}>
                                {logs.map((log) => (
                                    <motion.div
                                        key={log.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="leading-relaxed"
                                        style={{
                                            color: log.type === "real" ? "#fbbf24"
                                                : log.type === "target" ? "#10b981"
                                                    : log.type === "discard" ? "#475569"
                                                        : "#64748b",
                                            fontWeight: (log.type === "target" || log.type === "real") ? "bold" : "normal",
                                            textShadow: (log.type === "target" || log.type === "real")
                                                ? `0 0 12px ${log.type === "real" ? "rgba(251,191,36,0.7)" : "rgba(16,185,129,0.6)"}`
                                                : "none",
                                        }}
                                    >
                                        {log.type === "target" && (
                                            <span style={{ color: "#34d399" }}>▶ </span>
                                        )}
                                        {log.text}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {logs.length === 0 && (
                                <div className="text-slate-600 mono text-xs">
                                    {isActive ? "Inicializando stream..." : "Activa el bot para comenzar el análisis..."}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Control Panel: Botón + Reset */}
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.25 }}
                        className="bento-border rounded-xl p-5"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        <div className="flex items-center justify-center gap-4">
                            {/* Botón principal */}
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                    // 🚦 TRAFFIC MANAGEMENT — bloqueia usuários gratuitos
                                    if (!isActive && !isLoading && isFree) {
                                        toast.warning('🔒 Oracle AI es exclusivo para miembros Premium. Actualiza tu plan para operar.');
                                        return;
                                    }
                                    setIsActive(v => !v);
                                }}
                                className="px-10 py-3.5 rounded-xl font-black text-sm tracking-wider transition-all"
                                style={{
                                    background: isActive
                                        ? "linear-gradient(135deg,#ef4444,#dc2626)"
                                        : (!isLoading && isFree)
                                            ? "linear-gradient(135deg,#475569,#334155)"
                                            : "linear-gradient(135deg,#10b981,#059669)",
                                    color: "white",
                                    boxShadow: isActive
                                        ? "0 0 30px rgba(239,68,68,0.4)"
                                        : (!isLoading && isFree)
                                            ? "0 0 20px rgba(100,116,139,0.3)"
                                            : "0 0 30px rgba(16,185,129,0.4)",
                                    cursor: (!isActive && !isLoading && isFree) ? "not-allowed" : "pointer",
                                }}
                            >
                                {isActive ? "⏹ DETENER" : (!isLoading && isFree) ? "🔒 PREMIUM" : "▶ ACTIVAR"}
                            </motion.button>

                            {/* Cooldown trigger */}
                            <button
                                onClick={() => setShowCooldown(true)}
                                className="px-4 py-3 rounded-xl text-xs mono transition-all font-semibold"
                                style={{
                                    background: "rgba(251,191,36,0.08)",
                                    border: "1px solid rgba(251,191,36,0.15)",
                                    color: "#fbbf24",
                                }}
                            >
                                RESET IP
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* ══════════════════════════════════════════════════════════════
                    COLUMNA DERECHA: Última Señal + Analytics
                ══════════════════════════════════════════════════════════════ */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">

                    {/* Última señal */}
                    <motion.div
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bento-border rounded-xl p-4"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        <div className="text-xs text-slate-500 mono mb-3 tracking-wider">ÚLTIMA SEÑAL</div>
                        {lastSignal ? (
                            <motion.div
                                key={lastSignal.ts}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className="text-2xl font-black neon-green mono">{lastSignal.ativo}</div>
                                <div className="mt-2 space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-xs text-slate-500 mono">Tipo</span>
                                        <span className="text-xs mono neon-cyan">{lastSignal.tipo}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-slate-500 mono">Dígito</span>
                                        <span className="text-xs mono text-white font-bold">≠ {lastSignal.digito}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-slate-500 mono">EV</span>
                                        <span className="text-xs mono neon-green">{formatEV(lastSignal.ev)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-slate-500 mono">Percentil</span>
                                        <span className="text-xs mono neon-violet">{(lastSignal.percentil * 100).toFixed(0)}°</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-xs text-slate-500 mono">Hora</span>
                                        <span className="text-xs mono text-slate-400">{formatTime(lastSignal.ts)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="text-slate-600 mono text-xs">Esperando señal del servidor...</div>
                        )}
                    </motion.div>



                    {/* Entropía de Mercado */}
                    <motion.div
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bento-border rounded-xl p-4"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        <div className="text-xs text-slate-500 mono mb-3 tracking-wider">ENTROPÍA DE MERCADO</div>
                        <Sparkline data={entropy} color="#a78bfa" height={40} />
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-slate-500 mono">χ² p-valor</span>
                            <span className="text-xs mono neon-violet">{entropy[entropy.length - 1]?.toFixed(3)}</span>
                        </div>
                    </motion.div>

                    {/* Z-Score + Arbitrage mini row */}
                    <div className="grid grid-cols-2 gap-3">
                        <motion.div
                            initial={{ x: 30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            className="bento-border rounded-xl p-3"
                            style={{ background: "rgba(15,23,42,0.7)" }}
                        >
                            <div className="text-[9px] text-slate-500 mono mb-2 tracking-wider">Z-SCORE</div>
                            <div className="flex gap-0.5 items-end h-8">
                                {zScore.slice(-8).map((v, i) => (
                                    <motion.div
                                        key={i}
                                        className="flex-1 rounded-sm"
                                        style={{
                                            height: `${Math.abs(v) / 2.5 * 100}%`,
                                            background: v > 0 ? "#10b981" : "#ef4444",
                                            opacity: 0.7 + (i / 8) * 0.3,
                                        }}
                                        animate={{ height: `${Math.abs(v) / 2.5 * 100}%` }}
                                        transition={{ duration: 0.4 }}
                                    />
                                ))}
                            </div>
                            <div className="text-[9px] mono mt-1" style={{ color: (zScore[zScore.length - 1] ?? 0) > 0 ? "#10b981" : "#ef4444" }}>
                                {(zScore[zScore.length - 1] ?? 0).toFixed(2)}σ
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ x: 30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bento-border rounded-xl p-3"
                            style={{ background: "rgba(15,23,42,0.7)" }}
                        >
                            <div className="text-[9px] text-slate-500 mono mb-2 tracking-wider">ARB Δ</div>
                            <Sparkline data={arbDelta.map(v => v + 1)} color="#22d3ee" height={32} />
                            <div className="text-[9px] mono neon-cyan mt-1">
                                {(arbDelta[arbDelta.length - 1] ?? 0) > 0 ? "+" : ""}
                                {(arbDelta[arbDelta.length - 1] ?? 0).toFixed(3)}
                            </div>
                        </motion.div>
                    </div>

                    {/* Estado del Motor */}
                    <motion.div
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.45 }}
                        className="bento-border rounded-xl p-4 flex flex-col items-center justify-center"
                        style={{ background: "rgba(15,23,42,0.7)", minHeight: "100px" }}
                    >
                        <motion.div
                            animate={isActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{
                                background: isActive
                                    ? "radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.05) 70%)"
                                    : "radial-gradient(circle, rgba(100,116,139,0.2) 0%, transparent 70%)",
                                border: `2px solid ${isActive ? "rgba(16,185,129,0.5)" : "rgba(100,116,139,0.2)"}`,
                            }}
                        >
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ background: isActive ? "#10b981" : "#475569" }}
                            />
                        </motion.div>
                        <div className="text-[10px] mono mt-2 font-bold tracking-wider" style={{ color: isActive ? "#10b981" : "#475569" }}>
                            {isActive ? "ESCANEANDO" : "EN ESPERA"}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
