import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { convertLoginIdForMarketing, getCurrentUserEmail } from '../hooks/useMarketingMode';
import { supabase } from '../lib/supabaseClient';

// Marketing accounts - always bypass real account restrictions
const MARKETING_EMAILS = ['brendacostatmktcp@outlook.com'];

// Paid plans list (same as useFreemiumLimiter)
const PAID_PLANS = ['pro', 'premium', 'elite', 'whale', 'vitalicio', 'iniciado', 'mensual', 'anual'];

// Helper function to check if loginid is a REAL account (not demo)
const isRealAccount = (loginid: string): boolean => {
  // Real accounts start with CR or CRTC
  // Demo accounts start with VR or VRTC
  return loginid.startsWith('CR') || loginid.startsWith('CRTC');
};

// Define types for Deriv API
interface DerivAccount {
  loginid: string;
  balance: string;
  currency: string;
  email?: string;
  fullname?: string;
}

export interface DerivAPI {
  send: (request: any) => Promise<any>;
  onMessage: (callback: (data: any) => void) => () => void;
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
  api: DerivAPI | null; // New API object
  contractSettlements: React.MutableRefObject<Map<number, (tx: any) => void>>;
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

  // API State
  const reqIdCounter = useRef(1);
  const pendingRequests = useRef<Map<number, { resolve: (data: any) => void; reject: (err: any) => void }>>(new Map());
  const observers = useRef<Set<(data: any) => void>>(new Set());

  // Transaction Stream: Map<contract_id, callback> — resolves when Deriv sends sell notification
  const contractSettlements = useRef<Map<number, (tx: any) => void>>(new Map());

  // Ref to track if disconnection was intentional (user clicked logout) or accidental (network error)
  const shouldReconnect = React.useRef(true);
  // Ref to the live socket — avoids stale closure issues in initWebSocket
  const socketRef = React.useRef<WebSocket | null>(null);
  // Exponential backoff counter
  const reconnectAttemptsRef = React.useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Function to initialize WebSocket connection
  const initWebSocket = useCallback((apiToken: string) => {
    // Prevent multiple connection attempts — use socketRef to avoid stale closure
    if (socketRef.current && (socketRef.current.readyState === WebSocket.CONNECTING || socketRef.current.readyState === WebSocket.OPEN)) {
      return socketRef.current;
    }

    setIsConnecting(true);
    setLastError(null);
    shouldReconnect.current = true; // Enable auto-reconnect by default when starting

    const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`);
    socketRef.current = ws; // Keep ref in sync immediately

    ws.onopen = () => {
      console.log('Deriv WS Connected');
      // Send authorize request immediately upon connection
      ws.send(JSON.stringify({ authorize: apiToken }));
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);

      // 1. Resolve pending promises (API Layer)
      if (data.req_id && pendingRequests.current.has(data.req_id)) {
        const { resolve, reject } = pendingRequests.current.get(data.req_id)!;
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data);
        }
        pendingRequests.current.delete(data.req_id);
      }

      // 2. Notify observers (API Layer)
      observers.current.forEach((callback) => callback(data));

      // 3. Handle Transaction Stream (contract settlements)
      if (data.msg_type === 'transaction') {
        const tx = data.transaction;
        if (tx && tx.action === 'sell' && tx.contract_id) {
          const callback = contractSettlements.current.get(tx.contract_id);
          if (callback) {
            callback(tx);
            contractSettlements.current.delete(tx.contract_id);
          }
        }
      }

      // 4. Handle Internal Context Logic
      if (data.error) {
        // Only log/handle critical errors here, specific request errors are handled by promise rejection above
        if (data.error.code === 'InvalidToken') {
          console.error('Deriv API Error (Critical):', data.error);
          setLastError('Token inválido ou expirado.');
          // Fatal error, do not reconnect automatically
          shouldReconnect.current = false;

          localStorage.removeItem('deriv_active_token');
          setToken(null);
          setIsConnected(false);
          setAccount(null);
          toast.error('Token da Deriv inválido. Por favor, faça login novamente.');
        } else if (!data.req_id) {
          // Log errors that don't belong to a specific request (e.g. general stream errors)
          setLastError(`${data.error.code}: ${data.error.message}`);
        }

        // Note: We don't stop connecting state here always, depends on error severity
        if (data.error.code === 'InvalidToken') setIsConnecting(false);
        return;
      }

      if (data.msg_type === 'authorize') {
        const { loginid, fullname, email } = data.authorize;

        // Check if this is a REAL account
        const isReal = isRealAccount(loginid);

        if (isReal) {
          // Need to verify if user has a paid plan
          // First check if it's a marketing account (bypass restrictions)
          const userEmail = getCurrentUserEmail();
          const isMarketingAccount = MARKETING_EMAILS.includes(userEmail?.toLowerCase() || '');

          if (!isMarketingAccount) {
            // Fetch user plan from Supabase to check if they have a paid plan
            (async () => {
              try {
                // Get user ID from localStorage or session
                const sessionData = localStorage.getItem('supabase.auth.token');
                let userId: string | null = null;

                if (sessionData) {
                  try {
                    const parsed = JSON.parse(sessionData);
                    userId = parsed?.currentSession?.user?.id || null;
                  } catch {
                    // Ignore parse errors
                  }
                }

                if (!userId) {
                  // Try alternative method to get user
                  const { data: authData } = await supabase.auth.getUser();
                  userId = authData?.user?.id || null;
                }

                if (userId) {
                  const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('plan_type')
                    .eq('id', userId)
                    .single();

                  console.log('🔍 Plan Check Debug:', {
                    userId,
                    profileData,
                    profileError,
                    loginid,
                    isRealAccount: isReal
                  });

                  // If there's an error fetching profile, ALLOW connection (fail-open for Pro users)
                  if (profileError) {
                    console.warn('⚠️ Error fetching profile, allowing connection (fail-open):', profileError);
                    completeAuthorization();
                    return;
                  }

                  if (profileData) {
                    const planType = profileData.plan_type?.toLowerCase() || 'free';
                    const isPaidPlan = PAID_PLANS.includes(planType);

                    console.log('📊 Plan Validation:', {
                      rawPlanType: profileData.plan_type,
                      normalizedPlanType: planType,
                      isPaidPlan,
                      PAID_PLANS,
                      willBlock: !isPaidPlan
                    });

                    if (!isPaidPlan) {
                      // FREE USER TRYING TO USE REAL ACCOUNT - BLOCK IT!
                      console.warn('🚫 Cuenta Real bloqueada para plan gratuito:', loginid);

                      // Close connection
                      shouldReconnect.current = false;
                      ws.close();

                      // Clear any saved token
                      localStorage.removeItem('deriv_active_token');
                      setToken(null);
                      setIsConnected(false);
                      setIsConnecting(false);
                      setAccount(null);

                      // Set error message in Spanish
                      setLastError('🔒 Cuenta Real no disponible en Plan Gratuito. Usa una cuenta Demo o actualiza tu plan a PRO.');

                      toast.error(
                        '🚫 Acceso Restringido: Las cuentas reales solo están disponibles para usuarios PRO. Por favor, utiliza una cuenta Demo o actualiza tu plan.',
                        { duration: 8000 }
                      );

                      return; // Stop execution
                    } else {
                      console.log('✅ PRO user verified - allowing real account connection');
                    }
                  } else {
                    // No profile data found - allow connection (fail-open)
                    console.warn('⚠️ No profile data found, allowing connection (fail-open)');
                  }
                } else {
                  // No userId found - allow connection (fail-open)
                  console.warn('⚠️ No userId found, allowing connection (fail-open)');
                }
              } catch (err) {
                console.error('Error checking user plan for real account:', err);
                // On error, ALLOW connection (fail-open)
              }

              // If we reach here, user has a paid plan or we couldn't verify - allow connection
              completeAuthorization();
            })();

            return; // Wait for async check
          }
        }

        // Complete authorization for demo accounts, marketing accounts, or paid users
        completeAuthorization();

        async function completeAuthorization() {
          // 🛡️ ANTI-ABUSE: Registrar conta Deriv e verificar se já foi usada por outro usuário
          try {
            // Get user ID for anti-abuse check
            let currentUserId: string | null = null;
            const sessionData = localStorage.getItem('supabase.auth.token');

            if (sessionData) {
              try {
                const parsed = JSON.parse(sessionData);
                currentUserId = parsed?.currentSession?.user?.id || null;
              } catch {
                // Ignore parse errors
              }
            }

            if (!currentUserId) {
              const { data: authData } = await supabase.auth.getUser();
              currentUserId = authData?.user?.id || null;
            }

            if (currentUserId) {
              // Call RPC to register Deriv account (validates uniqueness)
              const { data: registerResult, error: rpcError } = await supabase.rpc('register_deriv_account', {
                p_user_id: currentUserId,
                p_deriv_account_id: loginid
              });

              if (rpcError) {
                console.error('Error calling register_deriv_account RPC:', rpcError);
                // Continue anyway if RPC fails (don't block user due to DB issues)
              } else if (registerResult && !registerResult.success) {
                // 🚫 BLOQUEIO: Conta Deriv já usada por outro usuário!
                console.error('🚫 ANTI-ABUSE BLOCK:', registerResult.error, registerResult.message);

                shouldReconnect.current = false;
                ws.close();

                localStorage.removeItem('deriv_active_token');
                setToken(null);
                setIsConnected(false);
                setIsConnecting(false);
                setAccount(null);

                setLastError('🚫 Esta cuenta Deriv ya fue utilizada en nuestro sistema. Por favor, inicia sesión en tu cuenta original o suscríbete al plan PRO.');

                toast.error(
                  '🚫 Esta cuenta Deriv ya fue utilizada en nuestro sistema. Por favor, inicia sesión en tu cuenta original o suscríbete al plan PRO.',
                  { duration: 12000 }
                );

                return; // Stop authorization
              } else {
                console.log('✅ Cuenta Deriv registrada/verificada:', loginid);
              }
            }
          } catch (antiAbuseError) {
            console.error('Anti-abuse check error (non-blocking):', antiAbuseError);
            // Continue anyway - don't block users due to anti-abuse system errors
          }

          // ✅ Authorization complete - set connected state
          setIsConnected(true);
          setIsConnecting(false);
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

          // Transaction stream — notifies ALL buy/sell events on the account
          // Re-subscribes automatically on reconnect (completeAuthorization runs on every authorize)
          ws.send(JSON.stringify({ transaction: 1, subscribe: 1 }));

          // Convert loginid for marketing mode display
          const userEmail = getCurrentUserEmail();
          const displayLoginId = convertLoginIdForMarketing(loginid, userEmail);
          toast.success(`Conectado: ${displayLoginId}`);
        }
      }

      if (data.msg_type === 'balance') {
        const rawBalance = data.balance?.balance;
        const currency = data.balance?.currency || 'USD';
        // Defensive parse: handle null/undefined/NaN
        const parsedBalance = parseFloat(rawBalance);
        const safeBalance = isNaN(parsedBalance) ? 0.00 : parsedBalance;
        setAccount(prev => {
          if (!prev) return null;
          return { ...prev, balance: safeBalance.toFixed(2), currency };
        });
      }
    };

    ws.onclose = () => {
      console.log('Deriv WS Closed. Should Reconnect?', shouldReconnect.current);
      setIsConnected(false);
      setIsConnecting(false);
      setSocket(null);

      // Reject all pending requests
      pendingRequests.current.forEach(({ reject }) => reject(new Error('Connection closed')));
      pendingRequests.current.clear();

      // [RECONNECT] Auto-Reconnect com Exponential Backoff
      if (shouldReconnect.current) {
        reconnectAttemptsRef.current += 1;
        if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
          toast.error('Deriv: Falha persistente. Recarregue a página.', { id: 'deriv-reconnect-fail' });
          return;
        }
        // Backoff: 3s, 6s, 12s, 24s, 48s
        const delay = Math.min(3000 * Math.pow(2, reconnectAttemptsRef.current - 1), 48000);
        toast.info(`Conexão perdida. Reconectando em ${Math.round(delay / 1000)}s... (tentativa ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`, { id: 'deriv-reconnect' });
        setTimeout(() => {
          const activeToken = localStorage.getItem('deriv_active_token');
          if (activeToken) {
            console.log(`[DrCtx] Auto-reconnect attempt ${reconnectAttemptsRef.current}...`);
            initWebSocket(activeToken);
          }
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('Deriv WS Error:', error);
      setLastError('Erro na conexão com a Deriv');
      setIsConnecting(false);
      // onerror is always followed by onclose — reconnect handled there
    };

    setSocket(ws);
    socketRef.current = ws; // keep ref in sync
    return ws;
  }, []); // [FIXED] removed 'socket' dep — use socketRef.current instead to avoid stale closures

  // Connect function exposed to consumers
  const connect = async (apiToken: string): Promise<boolean> => {
    if (socketRef.current) {
      // If manually connecting, close any existing socket first
      shouldReconnect.current = false;
      reconnectAttemptsRef.current = 0; // Reset backoff on manual connect
      socketRef.current.close();
      socketRef.current = null;
    }
    // Small delay to ensure clean state
    setTimeout(() => { shouldReconnect.current = true; initWebSocket(apiToken); }, 100);
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
      }, 15000); // [PASSO 1] 15s ping (mais agressivo para evitar timeout em produção)
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

  // API Object Implementation
  const api = useMemo<DerivAPI | null>(() => {
    if (!socket || !isConnected) return null;

    return {
      send: (request: any) => {
        return new Promise((resolve, reject) => {
          if (socket.readyState !== WebSocket.OPEN) {
            reject(new Error('Socket not open'));
            return;
          }
          const req_id = reqIdCounter.current++;
          pendingRequests.current.set(req_id, { resolve, reject });
          socket.send(JSON.stringify({ ...request, req_id }));
        });
      },
      onMessage: (callback: (data: any) => void) => {
        observers.current.add(callback);
        return () => {
          observers.current.delete(callback);
        };
      }
    };
  }, [socket, isConnected]);

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
        socket,
        api,
        contractSettlements
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
