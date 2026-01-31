import React from 'react';
import { AstronPanel } from '../components/bots/AstronPanel';

const AstronBot = () => {
    return (
        <AstronPanel
            isActive={true}
            onToggle={() => { }}
            onBack={() => window.history.back()}
        />
    );
};

export default AstronBot;
