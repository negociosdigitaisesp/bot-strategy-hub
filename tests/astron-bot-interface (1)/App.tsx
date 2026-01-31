import React from 'react';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30 selection:text-white flex justify-center">
      {/* Background Gradients for ambience */}
      <div className="fixed top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#00E5FF]/5 to-transparent pointer-events-none z-0"></div>
      <div className="fixed top-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#00E5FF]/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00E5FF]/20 to-transparent z-0"></div>
      
      {/* Cyber Grid Lines (Optional subtle texture) */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none z-0"></div>

      <main className="w-full max-w-[1600px] min-h-screen relative z-10 px-4">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;