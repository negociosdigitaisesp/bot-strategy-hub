import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const TelegramFloatingButton = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleTelegramClick = () => {
    // Show notification in Spanish (Latin America)
    toast.success("Recibe Notificaciones de los Mejores Robots en Telegram", {
      description: "Únete a nuestro canal para recibir las mejores estrategias y actualizaciones",
      duration: 6000,
      action: {
        label: "Unirse",
        onClick: () => window.open("https://t.me/+mlo5W8H-8BxjOGQ5", "_blank")
      }
    });
  };

  return (
    <>
      {/* Floating Button Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Explanatory Text */}
        <div className="mb-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-2 py-1.5 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-medium max-w-44 text-center">
          📱 <span className="text-blue-600 dark:text-blue-400 font-semibold">Recibe Notificaciones</span>
          <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">de los Mejores Robots</div>
        </div>
        
        {/* Floating Button */}
        <button
          onClick={handleTelegramClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
          aria-label="Notificaciones Telegram"
        >
          {/* Telegram Icon using Send from lucide-react */}
          <Send className="w-6 h-6 transform group-hover:translate-x-0.5" />
          
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20"></div>
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap shadow-lg">
            Notificaciones Telegram
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
    </>
  );
};

export default TelegramFloatingButton;