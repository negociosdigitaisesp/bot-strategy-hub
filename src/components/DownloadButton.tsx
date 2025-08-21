import React from 'react';

interface DownloadButtonProps {
  downloadUrl: string;
  children: React.ReactNode;
  className?: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ 
  downloadUrl, 
  children, 
  className = '' 
}) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Abrir download em nova aba
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      type="button"
      className={`descargar-btn no-auto-scroll ${className}`}
      onClick={handleDownload}
      data-download-url={downloadUrl}
    >
      {children}
    </button>
  );
};

export default DownloadButton;