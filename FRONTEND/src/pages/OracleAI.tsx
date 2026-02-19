import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBugDeriv } from "../hooks/useBugDeriv";
import { useDeriv } from "../contexts/DerivContext";

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
const VPS_URL = "ws://191.252.182.208:8000";
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

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
export default function OracleAI() {
    const { api } = useDeriv();

    // ── Estado de conexão ──────────────────────────────────────────────────
    const [connected, setConnected] = useState(false);
    const [lastSignal, setLastSignal] = useState<Signal | null>(null);
    const [winFlash, setWinFlash] = useState<"win" | "loss" | null>(null);
    const [stats, setStats] = useState({ wins: 0, losses: 0 });

    // ── Métricas simuladas (animadas) ──────────────────────────────────────
    const [serverLoad, setServerLoad] = useState(42);
    const [proposalsCount, setProposalsCount] = useState(0);
    const [successProb, setSuccessProb] = useState(67);
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

    // ── Stake ──────────────────────────────────────────────────────────────
    const [stake, setStake] = useState(1);
    const [isActive, setIsActive] = useState(false);

    // ── Animação de métricas ───────────────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            setServerLoad(v => Math.max(20, Math.min(95, v + randomBetween(-3, 3))));
            setProposalsCount(v => v + Math.floor(randomBetween(3, 12)));
            setSuccessProb(v => Math.max(50, Math.min(92, v + randomBetween(-2, 2))));
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
            `[⚡ REAL] ${sinal.ativo} ≠${sinal.digito} — EV: ${formatEV(sinal.ev)} — CONTRATO ABERTO`,
            "real"
        );
    }, [addLog]);

    useBugDeriv(api, {
        stake,
        vpsUrl: VPS_URL,
        enabled: isActive,
        onSinal: handleSinal,
        onConectado: () => setConnected(true),
        onDesconectado: () => setConnected(false),
        onErro: (msg) => {
            addLog(`[ERRO] ${msg}`, "info");
            console.error("[OracleAI] Erro na execução:", msg);
        },
        onCompra: (contractId) => {
            addLog(`[✅ ORDEM ABERTA] Contract ID: ${contractId}`, "target");
        },
        onResultado: (resultado) => {
            const isWin = resultado.status === "won";
            setStats(prev => ({
                wins: prev.wins + (isWin ? 1 : 0),
                losses: prev.losses + (isWin ? 0 : 1)
            }));

            addLog(
                `[🏁 RESULTADO] ${isWin ? "VITÓRIA" : "DERROTA"} (${resultado.lucro > 0 ? "+" : ""}${resultado.lucro.toFixed(2)} USD)`,
                isWin ? "target" : "discard"
            );

            setWinFlash(isWin ? "win" : "loss");
            setTimeout(() => setWinFlash(null), 1200);
        }
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
      `}</style>

            {/* Win Flash Border */}
            {/* Win/Loss Flash Border */}
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

            {/* ── HEADER: THE NEURAL PULSE ────────────────────────────────────── */}
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
                            <span className="text-xs text-slate-500 mono">CARGA DEL SERVIDOR</span>
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

                {/* ── COLUMNA IZQUIERDA: Quantum Insights ─────────────────────── */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">

                    {/* Card 1: Assertividade Real */}
                    <motion.div
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bento-border rounded-xl p-4"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        <div className="text-xs text-slate-500 mono mb-3 tracking-wider">TASA DE ACIERTOS (REAL)</div>
                        <div className="flex items-center gap-3">
                            <CircularGauge
                                value={stats.wins + stats.losses > 0
                                    ? (stats.wins / (stats.wins + stats.losses)) * 100
                                    : 0}
                                color={stats.wins > stats.losses ? "#10b981" : "#fbbf24"}
                            />
                            <div>
                                <div className="text-2xl font-black neon-green mono">
                                    {stats.wins + stats.losses > 0
                                        ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
                                        : "0.0"}%
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    <span className="text-green-500">{stats.wins}W</span> / <span className="text-red-500">{stats.losses}L</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card 2: Entropía de Mercado */}
                    <motion.div
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
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

                    {/* Card 3: Z-Score Velocity */}
                    <motion.div
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bento-border rounded-xl p-4"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        <div className="text-xs text-slate-500 mono mb-3 tracking-wider">Z-SCORE VELOCITY</div>
                        <div className="flex gap-1 items-end h-10">
                            {zScore.slice(-12).map((v, i) => (
                                <motion.div
                                    key={i}
                                    className="flex-1 rounded-sm"
                                    style={{
                                        height: `${Math.abs(v) / 2.5 * 100}%`,
                                        background: v > 0 ? "#10b981" : "#ef4444",
                                        opacity: 0.7 + (i / 12) * 0.3,
                                    }}
                                    animate={{ height: `${Math.abs(v) / 2.5 * 100}%` }}
                                    transition={{ duration: 0.4 }}
                                />
                            ))}
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-slate-500 mono">z</span>
                            <span className="text-xs mono" style={{ color: (zScore[zScore.length - 1] ?? 0) > 0 ? "#10b981" : "#ef4444" }}>
                                {(zScore[zScore.length - 1] ?? 0).toFixed(3)}σ
                            </span>
                        </div>
                    </motion.div>

                    {/* Card 4: Arbitrage Delta */}
                    <motion.div
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bento-border rounded-xl p-4"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        <div className="text-xs text-slate-500 mono mb-3 tracking-wider">ARBITRAGE DELTA</div>
                        <Sparkline data={arbDelta.map(v => v + 1)} color="#22d3ee" height={40} />
                        <div className="flex justify-between mt-2">
                            <span className="text-xs text-slate-500 mono">Δ spread</span>
                            <span className="text-xs mono neon-cyan">
                                {(arbDelta[arbDelta.length - 1] ?? 0) > 0 ? "+" : ""}
                                {(arbDelta[arbDelta.length - 1] ?? 0).toFixed(4)}
                            </span>
                        </div>
                    </motion.div>
                </div>

                {/* ── COLUMNA CENTRAL: Proposal Stream ────────────────────────── */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">

                    {/* Núcleo — Proposal Stream */}
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="bento-border rounded-xl flex flex-col"
                        style={{ background: "rgba(15,23,42,0.7)", height: "420px" }}
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

                    {/* Control Panel */}
                    <motion.div
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.25 }}
                        className="bento-border rounded-xl p-5"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        <div className="grid grid-cols-3 gap-4 items-center">
                            {/* Stake */}
                            <div>
                                <div className="text-xs text-slate-500 mono mb-2">STAKE (USD)</div>
                                <div className="flex gap-1">
                                    {[1, 2, 5, 10].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setStake(v)}
                                            className="px-2 py-1 rounded text-xs mono transition-all"
                                            style={{
                                                background: stake === v ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                                                border: `1px solid ${stake === v ? "#10b981" : "rgba(255,255,255,0.08)"}`,
                                                color: stake === v ? "#10b981" : "#64748b",
                                            }}
                                        >
                                            ${v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Botón principal */}
                            <div className="flex justify-center">
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setIsActive(v => !v)}
                                    className="px-8 py-3 rounded-xl font-black text-sm tracking-wider transition-all"
                                    style={{
                                        background: isActive
                                            ? "linear-gradient(135deg,#ef4444,#dc2626)"
                                            : "linear-gradient(135deg,#10b981,#059669)",
                                        color: "white",
                                        boxShadow: isActive
                                            ? "0 0 30px rgba(239,68,68,0.4)"
                                            : "0 0 30px rgba(16,185,129,0.4)",
                                    }}
                                >
                                    {isActive ? "DETENER" : "ACTIVAR"}
                                </motion.button>
                            </div>

                            {/* Cooldown trigger */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowCooldown(true)}
                                    className="px-3 py-2 rounded-lg text-xs mono transition-all"
                                    style={{
                                        background: "rgba(251,191,36,0.1)",
                                        border: "1px solid rgba(251,191,36,0.2)",
                                        color: "#fbbf24",
                                    }}
                                >
                                    RESET IP
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ── COLUMNA DERECHA: Último Sinal + Stats ───────────────────── */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">

                    {/* Último sinal */}
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

                    {/* Breathing indicator */}
                    <motion.div
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bento-border rounded-xl p-4 flex flex-col items-center justify-center"
                        style={{ background: "rgba(15,23,42,0.7)", minHeight: "140px" }}
                    >
                        <div className="text-xs text-slate-500 mono mb-4 tracking-wider">ESTADO DEL MOTOR</div>
                        <motion.div
                            animate={isActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{
                                background: isActive
                                    ? "radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.05) 70%)"
                                    : "radial-gradient(circle, rgba(100,116,139,0.2) 0%, transparent 70%)",
                                border: `2px solid ${isActive ? "rgba(16,185,129,0.5)" : "rgba(100,116,139,0.2)"}`,
                            }}
                        >
                            <div
                                className="w-6 h-6 rounded-full"
                                style={{ background: isActive ? "#10b981" : "#475569" }}
                            />
                        </motion.div>
                        <div className="text-xs mono mt-3" style={{ color: isActive ? "#10b981" : "#475569" }}>
                            {isActive ? "ESCANEANDO" : "EN ESPERA"}
                        </div>
                    </motion.div>

                    {/* Info técnica */}
                    <motion.div
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bento-border rounded-xl p-4"
                        style={{ background: "rgba(15,23,42,0.7)" }}
                    >
                        <div className="text-xs text-slate-500 mono mb-3 tracking-wider">PARÁMETROS DEL SISTEMA</div>
                        <div className="space-y-1.5">
                            {[
                                ["Activos", "R10·R25·R50·R75·R100"],
                                ["Estrategia", "DIGIT DIFFER ≠5"],
                                ["Ventana payout", "200 ticks"],
                                ["Ventana χ²", "100 dígitos"],
                                ["LGN mín.", "30 trades"],
                                ["RTT máx.", "500ms"],
                                ["Servidor", "VPS BR · 2GB"],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between">
                                    <span className="text-xs text-slate-600 mono">{k}</span>
                                    <span className="text-xs mono text-slate-300">{v}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
