import React, { useState, useEffect, useRef } from 'react';
import { BotConfig, LogEntry, TradingStats } from '../types';
import { 
  Rocket, 
  Settings2, 
  Play, 
  Square, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Layers,
  Cpu,
  List,
  Info,
  BarChart3,
  Sliders,
  Bug,
  Terminal,
  ShieldAlert,
  Wifi,
  Code
} from 'lucide-react';

// Enhanced Progress Bar with Glow
const ProgressBar = ({ value, color, glowColor, height = "h-1.5" }: { value: number, color: string, glowColor: string, height?: string }) => (
    <div className={`w-full bg-[#0B0E14] ${height} rounded-full mt-3 overflow-hidden relative shadow-inner border border-white/5`}>
        <div 
            className="h-full rounded-full relative transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)" 
            style={{ 
                width: `${Math.max(value, 2)}%`, // Minimum visible width
                backgroundColor: color,
                boxShadow: `0 0 12px ${glowColor}`
            }}
        >
            <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-white/80 opacity-50 shadow-[0_0_5px_white]"></div>
        </div>
    </div>
);

interface TickData {
  id: string;
  price: string;
  lastDigit: number;
  signal: string;
  change: string;
  isUp: boolean;
}

export const Dashboard: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  
  // Config State
  const [config, setConfig] = useState<BotConfig>({
    stake: 0.35,
    stopLoss: 50.00,
    takeProfit: 50.00,
    useMartingale: true,
  });

  // Internal state for simulation
  const [currentStake, setCurrentStake] = useState(config.stake);
  // Track active trade to resolve in next tick
  const [activeTrade, setActiveTrade] = useState<{ type: 'OVER' | 'UNDER', entryDigit: number } | null>(null);

  // Tick History State
  const [ticks, setTicks] = useState<TickData[]>([]);
  const lastPriceRef = useRef<number>(124169.50);

  // Stats State
  const [stats, setStats] = useState<TradingStats>({
    balance: 9863.38,
    totalProfit: 0.00,
    wins: 0,
    losses: 0,
    totalOps: 0,
  });

  // Logs/Activity State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(1);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry['type'], message: string, subMessage?: string, profit?: number) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newLog: LogEntry = {
      id: logIdCounter.current.toString(),
      timestamp: timeString,
      type,
      message,
      subMessage,
      profit
    };
    logIdCounter.current += 1;
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  // Auto-scroll logs
  useEffect(() => {
    if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  // Bot Logic Simulation & Tick Generation
  useEffect(() => {
    let interval: any;
    
    // Always generate ticks for the dashboard, even if bot is not running (Market Data)
    interval = setInterval(() => {
        // --- 1. GENERATE MARKET DATA ---
        const volatility = (Math.random() - 0.5) * 2.5;
        const newPrice = lastPriceRef.current + volatility;
        lastPriceRef.current = newPrice;
        
        const priceStr = newPrice.toFixed(2);
        const lastDigit = parseInt(priceStr.slice(-1));
        const isUp = volatility >= 0;
        const changeStr = (volatility >= 0 ? '+' : '') + volatility.toFixed(3);
        
        // Signal Simulation (Random factor similar to image '0.10023')
        const signalVal = (0.1 + (Math.random() * 0.0005)).toFixed(5);

        const newTick: TickData = {
            id: Date.now().toString() + Math.random().toString(),
            price: priceStr,
            lastDigit: lastDigit,
            signal: signalVal,
            change: changeStr,
            isUp: isUp
        };

        setTicks(prev => [newTick, ...prev].slice(0, 15)); // Keep last 15 ticks

        // --- 2. BOT LOGIC (Only if Running) ---
        if (isRunning) {
            if (activeTrade) {
                // --- RESOLVE TRADE ---
                let isWin = false;
                if (activeTrade.type === 'OVER') {
                    isWin = lastDigit > 2; // Strategy: Win if > 2
                } else {
                    isWin = lastDigit < 8; // Strategy: Win if < 8
                }

                const profit = isWin ? currentStake * 0.95 : -currentStake;

                if (isWin) {
                    setStats(prev => ({ 
                        ...prev, 
                        balance: prev.balance + profit, 
                        totalProfit: prev.totalProfit + profit, 
                        wins: prev.wins + 1, 
                        totalOps: prev.totalOps + 1 
                    }));
                    addLog('SUCCESS', `BYPASS SUCCESS (${activeTrade.type})`, `Injection matched digit ${lastDigit}`, profit);
                    
                    if (config.useMartingale) setCurrentStake(config.stake);
                } else {
                    setStats(prev => ({ 
                        ...prev, 
                        balance: prev.balance + profit, 
                        totalProfit: prev.totalProfit + profit, 
                        losses: prev.losses + 1, 
                        totalOps: prev.totalOps + 1 
                    }));
                    addLog('ERROR', `FIREWALL DETECTED (${activeTrade.type})`, `Digit ${lastDigit} blocked exploit`, profit);
                    
                    if (config.useMartingale) setCurrentStake(prev => prev * 2);
                }
                setActiveTrade(null);

                // Check Limits
                if (stats.totalProfit <= -config.stopLoss || stats.totalProfit >= config.takeProfit) {
                    setIsRunning(false);
                    addLog(stats.totalProfit >= config.takeProfit ? 'INFO' : 'WARNING', 'System Halted', 'Target threshold reached');
                }

            } else {
                // --- FIND ENTRY ---
                // Simulate 30% chance to find a signal on this tick
                const isSignal = Math.random() > 0.7; 
                
                if (isSignal) {
                    const type = lastDigit < 5 ? 'OVER' : 'UNDER';
                    const strategyName = type === 'OVER' ? 'Over 2' : 'Under 8';
                    
                    setActiveTrade({ type, entryDigit: lastDigit });
                    addLog('INFO', `VULNERABILITY FOUND: ${lastDigit}`, `Injecting payload ${strategyName}...`);
                }
            }
        }
    }, 1000); // 1 tick per second

    return () => clearInterval(interval);
  }, [isRunning, config, currentStake, activeTrade, stats.totalProfit]);

  // Handle Config Change
  const handleConfigChange = (key: keyof BotConfig, value: any) => {
      setConfig(prev => ({ ...prev, [key]: value }));
      if (key === 'stake') {
          setCurrentStake(Number(value));
      }
  };

  const winRate = stats.totalOps > 0 ? ((stats.wins / stats.totalOps) * 100).toFixed(1) : '0.0';

  return (
    <div className="py-8 text-white">
      <div className="flex justify-between items-center mb-8 bg-surface/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4">
              <div className="bg-[#00E5FF]/10 p-2.5 rounded-lg border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                  <Bug size={24} className="text-[#00E5FF] animate-pulse" />
              </div>
              <div>
                  <h1 className="text-2xl font-black text-white tracking-wide glitch-text uppercase" data-text="BUG DERIV">BUG DERIV</h1>
                  <p className="text-[10px] text-textSec font-mono tracking-[0.2em] uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    System Override v3.0
                  </p>
              </div>
          </div>
          
          <div className="flex items-center gap-6">
               <div className="hidden md:flex flex-col items-end">
                    <span className="text-[10px] text-textSec font-mono uppercase">Connected API</span>
                    <div className="flex items-center gap-2">
                        <Wifi size={12} className="text-green-500" />
                        <span className="text-xs font-bold text-white">CR-449102</span>
                    </div>
               </div>
               <div className={`px-4 py-2 rounded-lg border ${isRunning ? 'bg-[#00E5FF]/10 border-[#00E5FF] text-[#00E5FF] shadow-neon-cyan' : 'bg-gray-800 border-gray-700 text-gray-400'} flex items-center gap-2 text-xs font-bold font-mono transition-all duration-300`}>
                    <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#00E5FF] animate-ping' : 'bg-gray-500'}`}></div>
                    {isRunning ? 'EXPLOIT ACTIVE' : 'SYSTEM IDLE'}
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls & Key Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Market Result (Overview) */}
            <div className="glass-card rounded-2xl p-6 relative flex flex-col justify-between group overflow-hidden transition-all duration-500 hover:shadow-glow hover:border-[#00E5FF]/30">
                {/* Ambient Background Glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00E5FF]/10 blur-[80px] rounded-full pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                        <Terminal size={18} className="text-[#00E5FF]" />
                        <h3 className="text-white font-bold text-sm tracking-wide font-mono">EXPLOIT_RESULT</h3>
                    </div>
                    <ShieldAlert size={14} className="text-textSec cursor-pointer hover:text-white transition-colors" />
                </div>

                <div className="text-center mb-6 relative z-10">
                    <p className="text-[11px] font-bold text-textSec tracking-widest uppercase mb-1">Total Net Profit</p>
                    <div className={`text-4xl font-black flex items-center justify-center gap-2 ${stats.totalProfit >= 0 ? 'text-[#00E5FF] drop-shadow-[0_0_15px_rgba(0,229,255,0.6)]' : 'text-[#FF3D00] drop-shadow-[0_0_15px_rgba(255,61,0,0.6)]'} transition-all duration-300 scale-100`}>
                        {stats.totalProfit >= 0 ? '+' : ''}${Math.abs(stats.totalProfit).toFixed(2)}
                    </div>
                    <div className="flex justify-center mt-2">
                        <span className="text-[10px] bg-white/5 px-3 py-0.5 rounded-full text-textSec font-mono border border-white/5">
                            YIELD: {stats.totalOps > 0 ? ((stats.totalProfit / stats.totalOps) * 100).toFixed(2) : '0.00'}%
                        </span>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-2 relative z-10">
                    {/* Wins Block */}
                    <div className="flex flex-col items-center group/item">
                        <div className="bg-[#111625]/80 backdrop-blur-sm rounded-xl p-3 w-full border border-gray-800 relative overflow-hidden group-hover/item:border-[#00E5FF]/30 transition-all duration-300 shadow-lg">
                            <div className="text-center mb-1">
                                <span className="text-xl font-bold text-[#00E5FF]">{stats.wins}</span>
                            </div>
                            <ProgressBar 
                                value={stats.totalOps > 0 ? (stats.wins / stats.totalOps) * 100 : 0} 
                                color="#00E5FF" 
                                glowColor="rgba(0, 229, 255, 0.5)" 
                            />
                        </div>
                        <span className="text-[10px] text-textSec mt-2 font-bold tracking-wider uppercase font-mono">Success</span>
                    </div>

                    {/* Win Rate Block */}
                    <div className="flex flex-col items-center group/item">
                        <div className="bg-[#111625]/80 backdrop-blur-sm rounded-xl p-3 w-full border border-gray-800 relative overflow-hidden group-hover/item:border-[#2F80ED]/30 transition-all duration-300 shadow-lg">
                            <div className="text-center mb-1">
                                <span className="text-xl font-bold text-[#2F80ED]">{winRate}%</span>
                            </div>
                            <ProgressBar 
                                value={Number(winRate)} 
                                color="#2F80ED" 
                                glowColor="rgba(47, 128, 237, 0.5)" 
                            />
                        </div>
                        <span className="text-[10px] text-textSec mt-2 font-bold tracking-wider uppercase font-mono">Precision</span>
                    </div>

                    {/* Losses Block */}
                    <div className="flex flex-col items-center group/item">
                        <div className="bg-[#111625]/80 backdrop-blur-sm rounded-xl p-3 w-full border border-gray-800 relative overflow-hidden group-hover/item:border-[#FF3D00]/30 transition-all duration-300 shadow-lg">
                            <div className="text-center mb-1">
                                <span className="text-xl font-bold text-[#FF3D00]">{stats.losses}</span>
                            </div>
                            <ProgressBar 
                                value={stats.totalOps > 0 ? (stats.losses / stats.totalOps) * 100 : 0} 
                                color="#FF3D00" 
                                glowColor="rgba(255, 61, 0, 0.5)" 
                            />
                        </div>
                        <span className="text-[10px] text-textSec mt-2 font-bold tracking-wider uppercase font-mono">Fail</span>
                    </div>
                </div>
            </div>

            {/* Strategy Configuration */}
            <div className="glass-card rounded-2xl p-6 flex flex-col shadow-2xl transition-transform hover:scale-[1.005] duration-300 border-t border-t-[#00E5FF]/10">
                <div className="flex items-center gap-2 mb-6">
                    <Code size={18} className="text-[#00E5FF]" />
                    <h3 className="text-white font-bold text-sm tracking-wide font-mono">INJECTION_CONFIG</h3>
                </div>

                <div className="flex-1 space-y-6">
                    <div>
                        <label className="text-[10px] text-textSec font-bold uppercase tracking-wider mb-2 block pl-1 font-mono">Entry Stake ($)</label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#00E5FF] transition-colors font-medium font-mono">$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                value={config.stake}
                                onChange={(e) => handleConfigChange('stake', e.target.value)}
                                disabled={isRunning}
                                className="w-full bg-[#05050F] border border-gray-800 rounded-xl py-4 pl-8 pr-4 text-white font-mono text-lg font-bold focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/50 focus:outline-none transition-all disabled:opacity-50 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-[#FF782C] font-bold uppercase tracking-wider mb-2 block pl-1 font-mono">Stop Limit ($)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={config.stopLoss}
                                    onChange={(e) => handleConfigChange('stopLoss', Number(e.target.value))}
                                    disabled={isRunning}
                                    className="w-full bg-[#05050F] border border-[#FF3D00]/20 rounded-xl py-3 px-4 text-[#FF3D00] font-mono font-bold focus:border-[#FF3D00] focus:ring-1 focus:ring-[#FF3D00]/50 focus:outline-none transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-[#00D1FF] font-bold uppercase tracking-wider mb-2 block pl-1 font-mono">Target Profit ($)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={config.takeProfit}
                                    onChange={(e) => handleConfigChange('takeProfit', Number(e.target.value))}
                                    disabled={isRunning}
                                    className="w-full bg-[#05050F] border border-[#00D1FF]/20 rounded-xl py-3 px-4 text-[#00D1FF] font-mono font-bold focus:border-[#00D1FF] focus:ring-1 focus:ring-[#00D1FF]/50 focus:outline-none transition-all disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0B0E14] rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors shadow-inner">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-bold text-white font-mono">Martingale Protocol</span>
                            <div 
                                onClick={() => !isRunning && handleConfigChange('useMartingale', !config.useMartingale)}
                                className={`w-12 h-7 rounded-full relative cursor-pointer transition-all duration-300 ${config.useMartingale ? 'bg-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.4)]' : 'bg-gray-700'} ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${config.useMartingale ? 'left-6' : 'left-1'}`}></div>
                            </div>
                        </div>
                        <p className="text-[11px] text-textSec leading-relaxed opacity-80 font-mono">
                            Auto-recovery: Doubling payload size after rejection to force profit recovery.
                        </p>
                    </div>
                    
                    <div className="mt-auto pt-6 border-t border-gray-800/50">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-textSec font-medium font-mono">Exploit Vector</span>
                            <button className="text-[10px] font-bold text-[#00E5FF] bg-[#00E5FF]/10 px-3 py-1.5 rounded-lg border border-[#00E5FF]/20 hover:bg-[#00E5FF]/20 transition-colors font-mono tracking-wide">
                                OVER 2 / UNDER 8
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Data & Logs */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Top Row: Tick & Bots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Tick Analysis Card */}
                <div className="glass-card rounded-2xl p-0 overflow-hidden flex flex-col relative group border border-white/5 shadow-2xl h-[380px]">
                    <div className="p-5 pb-3 flex justify-between items-center bg-[#111625] border-b border-white/5 z-20 relative">
                        <div className="flex items-center gap-2">
                            <List size={16} className="text-[#00E5FF]" />
                            <h3 className="text-white font-bold text-sm tracking-wide font-mono">DATA_STREAM</h3>
                        </div>
                        <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 bg-[#00E5FF]/10 px-2 py-1 rounded-md border border-[#00E5FF]/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
                            <span className="text-[10px] text-[#00E5FF] font-bold tracking-wider font-mono">LIVE_FEED</span>
                        </div>
                        </div>
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-3 px-6 py-2.5 text-[10px] font-bold text-textSec uppercase tracking-wider bg-[#0B0E14] z-10 font-mono">
                        <div>Price / Digit</div>
                        <div className="text-center">Signal</div>
                        <div className="text-right">Delta</div>
                    </div>

                    {/* Table Body - Tick List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#05050F]">
                        {ticks.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-textSec text-xs opacity-50 font-mono">
                                <Activity className="mb-2 animate-bounce" size={20} />
                                Awaiting data packet...
                            </div>
                        )}
                        <div className="flex flex-col">
                        {ticks.map((tick, index) => (
                            <div key={tick.id} className={`
                                grid grid-cols-3 px-6 py-2.5 border-b border-white/[0.03] items-center 
                                transition-all duration-500 font-mono
                                ${index === 0 ? 'bg-[#00E5FF]/5 animate-enter-row border-l-2 border-l-[#00E5FF]' : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'}
                            `}>
                                <div className={`text-sm font-medium ${tick.isUp ? 'text-[#2F80ED]' : 'text-red-500'} flex items-baseline gap-1`}>
                                    <span className="opacity-60 text-xs tracking-tighter">{tick.price.slice(0, -1)}</span>
                                    <span className={`text-base font-bold ${tick.isUp ? 'text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : 'text-red-400'}`}>{tick.price.slice(-1)}</span>
                                </div>
                                <div className="text-center">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${index === 0 ? 'bg-white/10 text-white' : 'text-textSec opacity-60'}`}>
                                        {tick.signal}
                                    </span>
                                </div>
                                <div className={`text-right text-xs font-bold ${tick.change.startsWith('+') ? 'text-[#00E5FF]' : 'text-[#FF3D00]'}`}>
                                    {tick.change}
                                </div>
                            </div>
                        ))}
                        </div>
                        {/* Gradient Overlay at bottom for fade effect */}
                        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#05050F] to-transparent pointer-events-none z-10"></div>
                    </div>
                </div>

                {/* Active Bots Card */}
                <div className="glass-card rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-2xl h-[380px]">
                    {/* Background Effect - Moving Gradient */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -mr-10 -mt-10 animate-pulse-glow"></div>
                    
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="text-textSec font-bold text-sm tracking-wide font-mono">ACTIVE_EXPLOITS</h3>
                        <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>

                    <div className="flex-1 space-y-4 relative z-10">
                        <div className="bg-[#0B0E14] rounded-xl p-4 border border-[#00E5FF]/30 relative overflow-hidden group hover:border-[#00E5FF]/60 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.3)]">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isRunning ? 'bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]' : 'bg-gray-600'} transition-all duration-300`}></div>
                            <div className="flex justify-between items-start mb-2 pl-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-[#00E5FF]/10 rounded-xl border border-[#00E5FF]/20">
                                        <Bug className="text-[#00E5FF]" size={22} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-white text-base tracking-tight font-mono">BUG DERIV v3</h4>
                                        <p className="text-[10px] text-textSec font-medium mt-0.5 font-mono">VECTOR: DIGIT DIFF</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-5 pl-2">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-textSec font-bold uppercase tracking-wider mb-0.5 font-mono">Session Gain</span>
                                    <span className={`text-base font-black ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} font-mono`}>
                                        {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => setIsRunning(!isRunning)}
                                    className={`px-6 py-2.5 rounded-lg text-xs font-black tracking-wide transition-all duration-300 shadow-lg transform active:scale-95 flex items-center gap-2 font-mono ${
                                        isRunning 
                                        ? 'bg-red-500/10 text-red-500 border border-red-500 hover:bg-red-500/20 shadow-neon-red' 
                                        : 'bg-gradient-to-r from-[#2F80ED] to-[#00E5FF] text-black hover:brightness-110 shadow-neon-blue'
                                    }`}
                                >
                                    {isRunning ? (
                                        <><Square size={12} fill="currentColor" /> ABORT</>
                                    ) : (
                                        <><Play size={12} fill="currentColor" /> INJECT</>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#0B0E14]/30 rounded-xl p-3 border border-gray-800/50 flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity cursor-not-allowed grayscale">
                            <div className="flex items-center gap-3">
                                <Layers className="text-textSec" size={18} />
                                <span className="text-sm text-textSec font-medium font-mono">Accumulator Hack</span>
                            </div>
                            <span className="text-[9px] border border-gray-700 rounded px-1.5 py-0.5 text-gray-500 font-bold uppercase font-mono">Patching...</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Live Activity */}
            <div className="glass-card rounded-2xl p-6 flex flex-col h-[400px] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Terminal size={18} className="text-[#00E5FF]" />
                        <h3 className="text-white font-bold text-sm tracking-wide font-mono">SYSTEM_LOGS</h3>
                    </div>
                    <div className="flex gap-8 text-[10px] font-bold text-textSec tracking-wider bg-[#0B0E14] px-4 py-1.5 rounded-lg border border-white/5 font-mono">
                        <span className="hidden sm:block w-20 text-gray-500">TIMESTAMP</span>
                        <span className="w-full text-left text-gray-300">PROCESS</span>
                        <span className="w-20 text-right text-gray-500">NET</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 custom-scrollbar flex flex-col" ref={logsContainerRef}>
                    {logs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 animate-pulse">
                                <Terminal size={32} className="text-blue-400" />
                            </div>
                            <p className="text-sm font-medium tracking-wide font-mono">Waiting for injection...</p>
                        </div>
                    )}
                    {logs.map((log) => {
                        return (
                            <div key={log.id} className={`animate-enter-log group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 hover:scale-[1.01] ${
                                log.type === 'SUCCESS' ? 'bg-[#00E5FF]/5 border-[#00E5FF]/20 shadow-[0_0_10px_rgba(0,229,255,0.05)]' : 
                                log.type === 'ERROR' ? 'bg-red-500/5 border-red-500/20 shadow-[0_0_10px_rgba(255,61,0,0.05)]' : 
                                'bg-[#0B0E14]/50 border-gray-800 hover:bg-[#0B0E14]'
                            }`}>
                                <div className="flex items-center gap-4 flex-1">
                                    <div className={`p-2 rounded-lg shrink-0 ${
                                        log.type === 'SUCCESS' ? 'bg-[#00E5FF]/10 text-[#00E5FF]' : 
                                        log.type === 'ERROR' ? 'bg-red-500/10 text-red-500' : 
                                        'bg-blue-500/10 text-blue-400'
                                    }`}>
                                        {log.type === 'SUCCESS' ? <ArrowUpRight size={18} strokeWidth={3} /> : 
                                        log.type === 'ERROR' ? <ArrowDownRight size={18} strokeWidth={3} /> : 
                                        <Code size={18} />}
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 flex-1">
                                        <span className="text-[10px] font-mono text-textSec w-20 shrink-0 opacity-70">{log.timestamp}</span>
                                        <div className="flex-1">
                                            <h4 className={`text-xs font-bold tracking-wide font-mono ${log.type === 'SUCCESS' ? 'text-white' : log.type === 'ERROR' ? 'text-white' : 'text-gray-300'}`}>{log.message}</h4>
                                            {log.subMessage && <p className="text-[10px] text-textSec mt-0.5 font-medium font-mono">{log.subMessage}</p>}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-right w-24 shrink-0">
                                    {log.profit !== undefined ? (
                                        <span className={`font-mono font-black text-sm ${log.profit >= 0 ? 'text-[#00E5FF] drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]' : 'text-[#FF3D00] drop-shadow-[0_0_5px_rgba(255,61,0,0.5)]'}`}>
                                            {log.profit > 0 ? '+' : ''}{log.profit.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-textSec opacity-30">-</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};