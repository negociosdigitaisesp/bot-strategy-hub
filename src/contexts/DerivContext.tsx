import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';

// Define types for Deriv API
interface DerivAccount {
  loginid: string;
  balance: string;
  currency: string;
  email?: string;
  fullname?: string;
}

interface DerivContextType {
  isConnected: boolean;
  isConnecting: boolean;
  account: DerivAccount | null;
  token: string | null;
  connect: (token: string) => Promise<boolean>;
  disconnect: () => void;
  lastError: string | null;
  socket: WebSocket | null;
}

const DerivContext = createContext<DerivContextType | undefined>(undefined);

// App ID for Deriv API usage - Standard is 1089
const APP_ID = 1089;

export const DerivProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<DerivAccount | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('deriv_active_token'));
  const [lastError, setLastError] = useState<string | null>(null);
  const [keepAliveInterval, setKeepAliveInterval] = useState<NodeJS.Timeout | null>(null);

  // Ref to track if disconnection was intentional (user clicked logout) or accidental (network error)
  const shouldReconnect = React.useRef(true);

  // Function to initialize WebSocket connection
  const initWebSocket = useCallback((apiToken: string) => {
    // Prevent multiple connection attempts
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      return socket;
    }

    setIsConnecting(true);
    setLastError(null);
    shouldReconnect.current = true; // Enable auto-reconnect by default when starting

    const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);

    ws.onopen = () => {
      console.log('Deriv WS Connected');
      // Send authorize request immediately upon connection
      ws.send(JSON.stringify({ authorize: apiToken }));
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);

      if (data.error) {
        console.error('Deriv API Error:', data.error);
        if (data.error.code === 'InvalidToken') {
          setLastError('Token inválido ou expirado.');
          // Fatal error, do not reconnect automatically
          shouldReconnect.current = false;

          localStorage.removeItem('deriv_active_token');
          setToken(null);
          setIsConnected(false);
          setAccount(null);
          toast.error('Token da Deriv inválido. Por favor, faça login novamente.');
        } else {
          setLastError(`${data.error.code}: ${data.error.message}`);
        }
        setIsConnecting(false);
        return;
      }

      if (data.msg_type === 'authorize') {
        setIsConnected(true);
        setIsConnecting(false);
        const { loginid, fullname, email } = data.authorize;
        setAccount(prev => ({
          ...prev,
          loginid,
          fullname,
          email,
          balance: '...',
          currency: '...'
        }));

        // Save token if successful
        setToken(apiToken);
        localStorage.setItem('deriv_active_token', apiToken);

        // Request balance
        ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));

        toast.success(`Conectado: ${loginid}`);
      }

      if (data.msg_type === 'balance') {
        const { balance, currency } = data.balance;
        setAccount(prev => {
          if (!prev) return null;
          return { ...prev, balance: balance.toString(), currency };
        });
      }
    };

    ws.onclose = () => {
      console.log('Deriv WS Closed. Should Reconnect?', shouldReconnect.current);
      setIsConnected(false);
      setIsConnecting(false);
      setSocket(null);

      // Auto-Reconnect Logic
      if (shouldReconnect.current) {
        toast.info('Conexão perdida. Tentando reconectar...');
        setTimeout(() => {
          const activeToken = localStorage.getItem('deriv_active_token');
          if (activeToken) {
            console.log('Attempting auto-reconnect...');
            initWebSocket(activeToken);
          }
        }, 3000); // Wait 3 seconds before reconnecting
      }
    };

    ws.onerror = (error) => {
      console.error('Deriv WS Error:', error);
      setLastError('Erro na conexão com a Deriv');
      setIsConnecting(false);
    };

    setSocket(ws);
    return ws;
  }, [socket]); // Added socket dependency to prevent duplicate connections logic

  // Connect function exposed to consumers
  const connect = async (apiToken: string): Promise<boolean> => {
    if (socket) {
      // If manually connecting, we close any existing socket first
      shouldReconnect.current = false; // Disable reconnect for the old socket
      socket.close();
    }
    // Small delay to ensure clean state
    setTimeout(() => initWebSocket(apiToken), 100);
    return true;
  };

  // Disconnect function
  const disconnect = useCallback(() => {
    shouldReconnect.current = false; // Explicit logout, do not reconnect
    if (socket) {
      socket.close();
    }
    localStorage.removeItem('deriv_active_token');
    setToken(null);
    setAccount(null);
    setIsConnected(false);
    toast.info('Desconectado com sucesso');
  }, [socket]);

  // Keep alive ping - 20 seconds interval
  useEffect(() => {
    if (isConnected && socket) {
      const interval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ ping: 1 }));
        }
      }, 20000); // 20 seconds ping (Safe Keep-Alive)
      setKeepAliveInterval(interval);

      return () => clearInterval(interval);
    }
  }, [isConnected, socket]);

  // Auto-reconnect on mount if token exists
  useEffect(() => {
    const storedToken = localStorage.getItem('deriv_active_token');
    // Only connect if we have a token and we are not already connected/connecting
    if (storedToken && !isConnected && !isConnecting && !socket) {
      initWebSocket(storedToken);
    }

    // Cleanup on unmount
    return () => {
      // Ideally we don't close socket on unmount to keep connection during navigation
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    };
  }, []); // Only run once on mount

  return (
    <DerivContext.Provider
      value={{
        isConnected,
        isConnecting,
        account,
        token,
        connect,
        disconnect,
        lastError,
        socket
      }}
    >
      {children}
    </DerivContext.Provider>
  );
};

export const useDeriv = () => {
  const context = useContext(DerivContext);
  if (context === undefined) {
    throw new Error('useDeriv must be used within a DerivProvider');
  }
  return context;
};
