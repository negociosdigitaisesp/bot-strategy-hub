import React from 'react';
import { 
  Zap, 
  ShieldCheck, 
  BookOpen, 
  LayoutGrid, 
  Cpu, 
  Rocket, 
  FileText, 
  LogOut, 
  Wifi, 
  User,
  MoreVertical
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <div className="w-72 h-screen bg-surface border-r border-[#161B2E] flex flex-col fixed left-0 top-0 z-50 overflow-y-auto shadow-2xl">
      {/* Header Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">M</div>
          <div>
              <h1 className="text-lg font-bold text-white">Million Bots</h1>
              <p className="text-[10px] text-muted tracking-widest">TRADING INTELLIGENCE</p>
          </div>
        </div>
        <button className="text-gray-500 hover:text-white">
            <MoreVertical size={16} />
        </button>
      </div>

      {/* Connection Status Card */}
      <div className="px-4 mb-6">
        <div className="bg-gradient-to-br from-[#161B2E] to-[#0F121E] rounded-xl p-4 border border-[#1E2329] relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#1A1F2E] border border-gray-800 flex items-center justify-center shadow-inner">
                <Wifi size={14} className="text-green-400" />
            </div>
            <div>
                <h3 className="font-bold text-xs text-white">DERIV API</h3>
                <p className="text-[10px] text-green-400 font-mono tracking-wide">CONNECTED</p>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex justify-between items-end mb-1">
                 <span className="text-[10px] text-gray-500 uppercase tracking-wider">Account ID</span>
                 <span className="text-xs text-white font-mono">CR449102</span>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-800/50 flex justify-between items-center">
                <div className="text-[10px] text-gray-500">BALANCE</div>
                <div className="text-right">
                    <p className="text-lg font-bold text-white tracking-tight">$9,863.38</p>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2">
        <NavItem icon={LayoutGrid} label="Dashboard" sub="" />
        <NavItem icon={Zap} label="Strategies" sub="3 Active" active />
        <NavItem icon={ShieldCheck} label="Risk Management" sub="" />
        <NavItem icon={BookOpen} label="Market Analysis" sub="" />
        <NavItem icon={Cpu} label="Bot Settings" sub="" />
      </nav>

      {/* Footer User Profile */}
      <div className="p-4 mt-auto border-t border-[#161B2E]">
        <div className="bg-[#0F121E] rounded-xl p-3 border border-[#161B2E] flex items-center justify-between hover:border-gray-700 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-800 p-0.5 ring-2 ring-primary/20">
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden">
                           <User size={18} className="text-gray-400" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0F121E] rounded-full"></div>
                </div>
                <div>
                    <div className="flex items-center gap-1">
                        <h4 className="text-xs font-bold text-white group-hover:text-primary transition-colors">Miguel Trader</h4>
                    </div>
                     <span className="text-[10px] text-gray-500">Pro Plan</span>
                </div>
            </div>
            <LogOut size={14} className="text-gray-600 hover:text-white" />
        </div>
      </div>
    </div>
  );
};

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    sub: string;
    active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, sub, active }) => (
    <div className={`group flex items-center px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200
        ${active 
            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
            : 'text-gray-500 hover:bg-[#161B2E] hover:text-white'
        }
    `}>
        <Icon size={18} className={`${active ? 'text-white' : 'group-hover:text-primary transition-colors'}`} />
        <div className="ml-3 flex-1">
            <p className="text-sm font-medium leading-none">{label}</p>
            {sub && <p className={`text-[10px] mt-1 ${active ? 'text-blue-100' : 'text-gray-600 group-hover:text-gray-400'}`}>{sub}</p>}
        </div>
        {active && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
    </div>
);