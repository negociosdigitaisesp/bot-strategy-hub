import React from 'react';
import { AstronPanel } from '../components/bots/AstronPanel';
import Sidebar from '../components/Sidebar';
import { useState } from 'react';

const AstronBot = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => !prev);
    };

    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar collapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />
            <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'main-content-expanded' : 'main-content'}`}>
                <AstronPanel
                    isActive={true}
                    onToggle={() => { }}
                    onBack={() => window.history.back()}
                />
            </main>
        </div>
    );
};

export default AstronBot;
