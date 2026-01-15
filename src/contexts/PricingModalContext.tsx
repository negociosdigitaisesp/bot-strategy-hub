import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PricingModalContextType {
    isOpen: boolean;
    openPricingModal: () => void;
    closePricingModal: () => void;
}

const PricingModalContext = createContext<PricingModalContextType | undefined>(undefined);

export const PricingModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    const openPricingModal = useCallback(() => {
        setIsOpen(true);
    }, []);

    const closePricingModal = useCallback(() => {
        setIsOpen(false);
    }, []);

    return (
        <PricingModalContext.Provider value={{ isOpen, openPricingModal, closePricingModal }}>
            {children}
        </PricingModalContext.Provider>
    );
};

export const usePricingModal = (): PricingModalContextType => {
    const context = useContext(PricingModalContext);
    if (context === undefined) {
        throw new Error('usePricingModal must be used within a PricingModalProvider');
    }
    return context;
};
