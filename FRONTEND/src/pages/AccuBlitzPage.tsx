import React, { useState } from 'react';
import { AccuBlitzPanel } from '../components/bots/AccuBlitzPanel';


const AccuBlitzPage = () => {
    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            <AccuBlitzPanel
                isActive={true}
                onToggle={() => { }}
                onBack={() => window.history.back()}
            />
        </div>
    );
};

export default AccuBlitzPage;
