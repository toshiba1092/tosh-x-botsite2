import { useState, useEffect, useRef } from 'react';
import { Shield, TrendingUp, Activity, BarChart3, MessageCircle, Youtube, ChevronDown, Zap, AlertTriangle, Play, Square, ArrowLeft, Settings, Users, UserCheck, TrendingUp as TrendingUpIcon, X, Check, Target, Wallet, DollarSign, Timer, Brain, Wifi } from 'lucide-react';
import { derivApi } from './services/derivApi';
import { supabase } from './services/supabase';
import type { DerivAccount, MarketStrength } from './types';

// Admin Account IDs (hardcoded bypass)
const ADMIN_ACCOUNT_IDS = ['CR918987', 'VRTC918987'];

// Bot configurations
const BOTS = [
  { id: 'alpha', name: 'TOSH Alpha Bot', strategy: 'Trend-following strategy with EMA crossovers and momentum confirmation on 1-tick intervals', isPremium: false, usesHighPayout: true, icon: '🎯' },
  { id: 'quantum', name: 'TOSH Quantum Bot', strategy: 'Volatility breakout strategy with Bollinger Band width expansions and ATR spike analysis', isPremium: false, usesHighPayout: true, icon: '⚛️' },
  { id: 'velocity', name: 'TOSH Velocity Bot', strategy: 'Short-term hyper-scalping with high-frequency directional momentum detection', isPremium: false, usesHighPayout: false, icon: '⚡' },
  { id: 'phantom', name: 'TOSH Phantom Bot', strategy: 'Pattern recognition matching consecutive micro-candle tick signatures for reversals', isPremium: false, usesHighPayout: false, icon: '👻' },
  { id: 'nova', name: 'TOSH Nova Bot', strategy: 'Classic horizontal support/resistance breakout tracking recent high/low boundaries', isPremium: false, usesHighPayout: false, icon: '🌟' },
  { id: 'titan', name: 'TOSH Titan Bot', strategy: 'Macro-trend confirmation ensuring trades align with 50-tick market directional velocity', isPremium: false, usesHighPayout: false, icon: '🏛️' },
  { id: 'matrix', name: 'TOSH Matrix Bot', strategy: 'Multi-indicator consensus requiring EMA, ATR, and momentum confirmation concurrently', isPremium: true, usesHighPayout: true, icon: '🔮' },
  { id: 'elite', name: 'TOSH Elite Bot', strategy: 'Advanced multi-layer defense with dynamic trend scalping and adaptive micro-candle confirmations', isPremium: true, usesHighPayout: false, icon: '💎' }
];

const SOCIAL_LINKS = [
  { name: 'WhatsApp', url: 'https://www.whatsapp.com/business/' },
  { name: 'YouTube', url: 'https://www.youtube.com/@toshderivsignalbot' },
  { name: 'Telegram', url: 'https://t.me/tosh_freesignal' },
  { name: 'TikTok', url: '#' }
];

type ViewType = 'dashboard' | 'bot-builder' | 'analysis' | 'live-chat';

interface Trade {
  id: string;
  asset: string;
  contractType: string;
  entrySpot: number;
  exitSpot?: number;
  buyPrice: number;
  grossPayout: number;
  netProfit?: number;
  status: 'won' | 'lost' | 'open';
  timestamp: Date;
}

function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accounts, setAccounts] = useState<DerivAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<DerivAccount | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('USD');
  const [token, setToken] = useState<string | null>(null);

  // UI state
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [activeBot, setActiveBot] = useState<typeof BOTS[0] | null>(null);
  const [showDisciplineModal, setShowDisciplineModal] = useState(false);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [liveSyncPulse, setLiveSyncPulse] = useState(false);

  // Trading state
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [stake, setStake] = useState(1);
  const [takeProfit, setTakeProfit] = useState(10);
  const [stopLoss, setStopLoss] = useState(5);
  const [maxMartingaleSteps, setMaxMartingaleSteps] = useState(4);
  const [currentStake, setCurrentStake] = useState(stake);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalStake, setTotalStake] = useState(0);
  const [totalPayout, setTotalPayout] = useState(0);
  const [contractsWon, setContractsWon] = useState(0);
  const [contractsLost, setContractsLost] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [marketStrength, setMarketStrength] = useState<MarketStrength>({ value: 85, momentum: 'neutral', volatility: 'low', strength: 85 });

  // Bot simulation state for logged-out users
  const [botConfidence, setBotConfidence] = useState<{ [key: string]: number }>({});
  const [botRiskStatus, setBotRiskStatus] = useState<{ [key: string]: 'optimal' | 'risky' }>({});

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeBots: 0,
    premiumAccounts: 0,
    totalTrades: 0
  });

  // Live Chat market ticker state
  const [marketPatternLog, setMarketPatternLog] = useState<{ direction: 'RISE' | 'FALL'; spot: number; time: string; prevSpot: number }[]>([]);
  const [currentTickSpot, setCurrentTickSpot] = useState<number>(0);
  const prevTickSpotRef = useRef<number>(0);
  const tickerConnectedRef = useRef<boolean>(false);

  // Refs
  const tradingIntervalRef = useRef<number | null>(null);
  const cooldownIntervalRef = useRef<number | null>(null);
  const simulationIntervalRef = useRef<number | null>(null);

  // Initialize confidence and risk status for bots
  useEffect(() => {
    const initialConfidence: { [key: string]: number } = {};
    const initialRisk: { [key: string]: 'optimal' | 'risky' } = {};
    BOTS.forEach(bot => {
      initialConfidence[bot.id] = Math.floor(Math.random() * 30) + 60;
      initialRisk[bot.id] = Math.random() > 0.5 ? 'optimal' : 'risky';
    });
    setBotConfidence(initialConfidence);
    setBotRiskStatus(initialRisk);
  }, []);

  // Simulation loop for logged-out users
  useEffect(() => {
    if (!isAuthenticated) {
      simulationIntervalRef.current = window.setInterval(() => {
        setBotConfidence(prev => {
          const updated = { ...prev };
          BOTS.forEach(bot => {
            const change = Math.floor(Math.random() * 10) - 5;
            updated[bot.id] = Math.min(100, Math.max(50, (prev[bot.id] || 75) + change));
          });
          return updated;
        });
        setBotRiskStatus(prev => {
          const updated = { ...prev };
          BOTS.forEach(bot => {
            if (Math.random() > 0.85) {
              updated[bot.id] = updated[bot.id] === 'optimal' ? 'risky' : 'optimal';
            }
          });
          return updated;
        });
      }, 3000);
    }

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isAuthenticated]);

  // Handle OAuth redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token1') || urlParams.get('token');
    const acctParam = urlParams.get('acct1') || urlParams.get('acct');

    if (tokenParam) {
      localStorage.setItem('deriv_token', tokenParam);
      setToken(tokenParam);
      if (acctParam) {
        localStorage.setItem('deriv_account', acctParam);
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedToken = localStorage.getItem('deriv_token');
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  // Live Chat - Connect to Deriv for market ticker (runs once on mount)
  useEffect(() => {
    if (tickerConnectedRef.current) return;
    tickerConnectedRef.current = true;

    const connectMarketTicker = async () => {
      try {
        if (!derivApi.getConnectionStatus()) {
          await derivApi.connect();
        }

        derivApi.subscribeToTicks('R_100', (tick: any) => {
          const spot = tick.quote || tick.ask || tick.bid;
          const prevSpot = prevTickSpotRef.current;
          setCurrentTickSpot(spot);
          prevTickSpotRef.current = spot;

          if (prevSpot > 0 && Math.abs(spot - prevSpot) > 0.001) {
            const direction: 'RISE' | 'FALL' = spot > prevSpot ? 'RISE' : 'FALL';
            const now = new Date();
            const timeStr = now.toLocaleTimeString();

            setMarketPatternLog(prev => {
              const newLog = [{
                direction,
                spot,
                time: timeStr,
                prevSpot
              }, ...prev.slice(0, 49)];
              return newLog;
            });
          }
        });
      } catch (error) {
        console.error('Market ticker connection error:', error);
      }
    };

    connectMarketTicker();
  }, []);

  // Initialize Deriv API and authorize
  useEffect(() => {
    if (token) {
      initializeDeriv();
    }
  }, [token]);

  const initializeDeriv = async () => {
    try {
      await derivApi.connect();
      const authResponse = await derivApi.authorize(token!);

      const accounts = authResponse.authorize.account_list || authResponse.account_list;
      setAccounts(accounts);

      const firstAcc = accounts[0];
      setActiveAccount(firstAcc);
      setBalance(firstAcc.balance);
      setCurrency(firstAcc.currency);

      setIsAuthenticated(true);

      // Check if admin
      const accId = firstAcc.id || firstAcc.loginid;
      if (ADMIN_ACCOUNT_IDS.includes(accId)) {
        setIsAdmin(true);
      }

      // Subscribe to balance
      derivApi.subscribeToAccountBalance((bal: any) => {
        setBalance(bal.balance);
        setCurrency(bal.currency);
        setLiveSyncPulse(true);
        setTimeout(() => setLiveSyncPulse(false), 200);
      });

      // Fetch tick for live indicator
      derivApi.subscribeToTicks('R_100', () => {
        setLiveSyncPulse(true);
        setTimeout(() => setLiveSyncPulse(false), 100);
      });

      // Load admin stats if admin
      if (ADMIN_ACCOUNT_IDS.includes(accId)) {
        loadAdminStats();
      }
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  };

  const loadAdminStats = async () => {
    const { data: usersData } = await supabase.from('users').select('*');
    const { data: tradesData } = await supabase.from('trades').select('*');

    setAdminStats({
      totalUsers: usersData?.length || 0,
      activeBots: tradesData?.filter(t => t.status === 'open').length || 0,
      premiumAccounts: usersData?.filter(u => u.is_premium_status).length || 0,
      totalTrades: tradesData?.length || 0
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('deriv_token');
    localStorage.removeItem('deriv_account');
    setToken(null);
    setIsAuthenticated(false);
    setAccounts([]);
    setActiveAccount(null);
    setBalance(0);
    derivApi.disconnect();
  };

  const switchAccount = (account: DerivAccount) => {
    setActiveAccount(account);
    setBalance(account.balance);
    setCurrency(account.currency);
    setShowAccountSwitcher(false);

    const accId = account.id || account.loginid;
    setIsAdmin(ADMIN_ACCOUNT_IDS.includes(accId));
  };

  const loadBot = (bot: typeof BOTS[0]) => {
    if (bot.isPremium && !isAdmin && !activeAccount?.is_virtual) {
      return;
    }
    setActiveBot(bot);
    setTrades([]);
    setTotalProfit(0);
    setTotalStake(0);
    setTotalPayout(0);
    setContractsWon(0);
    setContractsLost(0);
    setConsecutiveLosses(0);
    setCurrentStake(stake);
  };

  const startEngine = async () => {
    if (!activeBot) return;

    // Demo mode simulation for logged-out users
    if (!isAuthenticated) {
      setIsEngineRunning(true);
      tradingIntervalRef.current = window.setInterval(() => {
        // Simulate demo trades
        const won = Math.random() > 0.4;
        const spot = 1240 + Math.random() * 20;
        const entrySpot = spot - (Math.random() * 2);
        const profit = won ? currentStake * 0.95 : -currentStake;

        const demoTrade: Trade = {
          id: `demo-${Date.now()}`,
          asset: 'R_100',
          contractType: 'CALL',
          entrySpot,
          exitSpot: spot,
          buyPrice: currentStake,
          grossPayout: won ? currentStake * 1.95 : 0,
          netProfit: profit,
          status: won ? 'won' : 'lost',
          timestamp: new Date()
        };

        setTrades(prev => [demoTrade, ...prev.slice(0, 99)]);
        setTotalStake(prev => prev + currentStake);

        if (won) {
          setContractsWon(prev => prev + 1);
          setTotalPayout(prev => prev + currentStake * 1.95);
          setTotalProfit(prev => prev + profit);
          setConsecutiveLosses(0);
          setCurrentStake(stake);
        } else {
          setContractsLost(prev => prev + 1);
          setTotalProfit(prev => prev + profit);
          const newLosses = consecutiveLosses + 1;
          setConsecutiveLosses(newLosses);

          if (activeBot.usesHighPayout && newLosses <= maxMartingaleSteps) {
            setCurrentStake(prev => prev * 2);
          } else {
            setCurrentStake(stake);
            setConsecutiveLosses(0);
          }
        }
      }, 3000);
      return;
    }

    setIsEngineRunning(true);

    // Check market conditions
    await derivApi.checkMarketConditions('R_100', {
      onEMA: () => {},
      onATR: () => {},
      onBandWidth: () => {},
      onMarketStrength: (strength, momentum) => {
        setMarketStrength(prev => ({
          ...prev,
          strength,
          momentum: momentum as 'bullish' | 'bearish' | 'neutral',
          value: strength
        }));
      }
    });

    tradingIntervalRef.current = window.setInterval(async () => {
      if (cooldownActive) return;

      // Check slippage protection
      if (marketStrength.strength < 80) {
        setMarketStrength(prev => ({ ...prev, volatility: 'high' }));
        return;
      }

      await executeTrade();
    }, 5000);
  };

  const executeTrade = async () => {
    if (!isEngineRunning || !activeBot) return;

    const symbol = 'R_100';
    const duration = 5;
    const durationUnit = 't';

    try {
      const buyResult = await derivApi.buyContract(
        symbol,
        'CALL',
        duration,
        durationUnit,
        currentStake
      );

      const contractId = buyResult.buy.contract_id;
      let entryTick = 0;

      // Get entry tick
      derivApi.subscribeToTicks(symbol, (tick: any) => {
        if (!entryTick) {
          entryTick = tick.quote || tick.ask;
        }
      });

      // Wait for contract completion
      const result = await derivApi.waitForContractCompletion(contractId);

      const tradeRecord: Trade = {
        id: contractId.toString(),
        asset: symbol,
        contractType: 'CALL',
        entrySpot: entryTick,
        exitSpot: result.status === 'won' ? entryTick + 0.01 : entryTick - 0.01,
        buyPrice: result.buy_price,
        grossPayout: result.payout,
        netProfit: result.profit,
        status: result.status === 'won' ? 'won' : 'lost',
        timestamp: new Date()
      };

      setTrades(prev => [tradeRecord, ...prev]);

      if (result.status === 'won') {
        setContractsWon(prev => prev + 1);
        setTotalPayout(prev => prev + result.payout);
        setTotalProfit(prev => prev + result.profit);
        setConsecutiveLosses(0);
        setCurrentStake(stake);
        setTotalStake(prev => prev + currentStake);

        // Check take profit
        if (totalProfit + result.profit >= takeProfit) {
          stopEngine();
          alert('Take Profit target reached! Stopping engine.');
        }
      } else {
        setContractsLost(prev => prev + 1);
        setTotalProfit(prev => prev + result.profit);
        setTotalStake(prev => prev + currentStake);

        // Check stop loss
        if (totalProfit + result.profit <= -stopLoss) {
          stopEngine();
          alert('Stop Loss limit reached! Stopping engine.');
        }

        const newConsecutiveLosses = consecutiveLosses + 1;
        setConsecutiveLosses(newConsecutiveLosses);

        // High payout recovery for specific bots
        if (activeBot.usesHighPayout) {
          if (newConsecutiveLosses >= 3) {
            // Trigger cooldown
            setCooldownActive(true);
            setCooldownRemaining(45);
            startCooldown();
          }

          // Martingale logic
          if (newConsecutiveLosses <= maxMartingaleSteps) {
            setCurrentStake(prev => prev * 2);
          } else {
            setCurrentStake(stake);
            setConsecutiveLosses(0);
          }
        }
      }
    } catch (error) {
      console.error('Trade execution error:', error);
    }
  };

  const startCooldown = () => {
    cooldownIntervalRef.current = window.setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          setCooldownActive(false);
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopEngine = () => {
    setIsEngineRunning(false);
    if (tradingIntervalRef.current) {
      clearInterval(tradingIntervalRef.current);
    }
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }
    setCooldownActive(false);
    setCooldownRemaining(0);
  };

  const isPremiumLocked = (bot: typeof BOTS[0]) => {
    return bot.isPremium && !isAdmin && !(activeAccount?.is_virtual === false && true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* Live Sync Pulse Overlay */}
      <div
        className={`fixed top-4 right-4 z-50 w-3 h-3 rounded-full transition-all duration-150 ${
          liveSyncPulse ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 scale-125' : 'bg-emerald-400/50'
        }`}
      />

      {/* Header */}
      <header className="border-b border-amber-500/20 bg-gray-950/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full" />
                <h1 className="relative text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  TOSH-X-BOT
                </h1>
              </div>
              {!isAuthenticated && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
                  <div className="w-2 h-2 rounded-full bg-amber-500/50 animate-pulse" />
                  <span className="text-xs text-amber-400/70">Demo Mode</span>
                </div>
              )}
            </div>

            {/* Auth Buttons / Balance */}
            <div className="flex items-center gap-3">
              {/* Discipline Protocol Button - Always visible in top-right */}
              <button
                onClick={() => setShowDisciplineModal(true)}
                className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center hover:bg-amber-500/30 transition-all group"
                title="TOSH Systemic Discipline Protocol"
              >
                <Shield className="w-5 h-5 text-amber-400 shield-icon-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              </button>

              {!isAuthenticated ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const redirectUrl = `${window.location.origin}${window.location.pathname}`;
                      const authUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=1089&client_redirect_url=${encodeURIComponent(redirectUrl)}`;
                      window.location.href = authUrl;
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-semibold hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20"
                  >
                    Login
                  </button>
                  <a
                    href="https://partner-tracking.deriv.com/click?a=31609&o=1&c=3&link_id=1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg border border-amber-500/50 text-amber-400 font-semibold hover:bg-amber-500/10 transition-all"
                  >
                    Sign Up
                  </a>
                </div>
              ) : (
                <>
                  {/* Balance Display */}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400">Balance</span>
                      <span className="text-lg font-bold text-amber-400">
                        {currency} {balance?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${liveSyncPulse ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400/50'}`}
                      title="Live Sync"
                    />
                  </div>

                  {/* Account Switcher */}
                  <div className="relative">
                    <button
                      onClick={() => setShowAccountSwitcher(!showAccountSwitcher)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 transition-all"
                    >
                      <span className={`w-2 h-2 rounded-full ${activeAccount?.is_virtual ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                      <span className="text-sm">
                        {activeAccount?.is_virtual ? 'Demo' : 'Real'}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {showAccountSwitcher && (
                      <div className="absolute right-0 mt-2 w-48 py-2 rounded-lg bg-gray-800 border border-gray-700 shadow-xl">
                        {accounts.map((acc, i) => (
                          <button
                            key={i}
                            onClick={() => switchAccount(acc)}
                            className="w-full px-4 py-2 text-left hover:bg-gray-700/50 flex items-center gap-2"
                          >
                            <span className={`w-2 h-2 rounded-full ${acc.is_virtual ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                            <div className="flex flex-col">
                              <span className="text-sm">{acc.is_virtual ? 'Demo' : 'Real'}</span>
                              <span className="text-xs text-gray-400">{acc.currency} {acc.balance?.toFixed(2)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all text-sm"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Header */}
      <nav className="border-b border-gray-800 bg-gray-950/50 backdrop-blur-lg sticky top-[60px] z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
              { id: 'bot-builder', icon: Settings, label: 'Bot Builder' },
              { id: 'analysis', icon: TrendingUp, label: 'Analysis' },
              { id: 'live-chat', icon: MessageCircle, label: 'Live Chat' }
            ].map(nav => (
              <button
                key={nav.id}
                onClick={() => setActiveView(nav.id as ViewType)}
                className={`relative px-4 py-3 flex items-center gap-2 whitespace-nowrap transition-all ${
                  activeView === nav.id
                    ? 'text-amber-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <nav.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{nav.label}</span>
                {activeView === nav.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/50" />
                )}
              </button>
            ))}

            {/* Admin Panel Access */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="relative px-4 py-3 flex items-center gap-2 whitespace-nowrap transition-all text-purple-400 hover:text-purple-300"
              >
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Admin</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Dashboard View */}
        {activeView === 'dashboard' && !activeBot && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BOTS.map(bot => (
              <div
                key={bot.id}
                className={`relative group rounded-xl border transition-all overflow-hidden ${
                  isPremiumLocked(bot)
                    ? 'border-gray-700/50 bg-gray-900/50'
                    : 'border-amber-500/20 bg-gray-900/80 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10'
                }`}
              >
                {/* Premium Lock Overlay */}
                {isPremiumLocked(bot) && (
                  <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                      <Shield className="w-8 h-8 text-amber-500" />
                    </div>
                    <span className="text-amber-400 font-bold text-lg mb-2">PREMIUM</span>
                    <span className="text-gray-400 text-sm">Upgrade to unlock</span>
                  </div>
                )}

                <div className="p-4">
                  {/* Bot Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                      bot.isPremium ? 'bg-amber-500/20' : 'bg-gray-800'
                    }`}>
                      {bot.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{bot.name}</h3>
                      <div className="flex items-center gap-2">
                        {bot.isPremium && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            PRO
                          </span>
                        )}
                        {bot.usesHighPayout && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            High Payout
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confidence Meter */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Confidence</span>
                      <span className={`font-medium ${
                        (botConfidence[bot.id] || 75) >= 75
                          ? 'text-emerald-400'
                          : (botConfidence[bot.id] || 75) >= 60
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}>
                        {botConfidence[bot.id] || 75}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          (botConfidence[bot.id] || 75) >= 75
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                            : (botConfidence[bot.id] || 75) >= 60
                              ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                              : 'bg-gradient-to-r from-red-500 to-red-400'
                        }`}
                        style={{ width: `${botConfidence[bot.id] || 75}%` }}
                      />
                    </div>
                  </div>

                  {/* Risk Status */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Status</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      botRiskStatus[bot.id] === 'optimal'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {botRiskStatus[bot.id] === 'optimal' ? '✓ Optimal Entry' : '⚡ Risky to Trade'}
                    </span>
                  </div>

                  {/* Strategy Info */}
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{bot.strategy}</p>

                  {/* Action Button */}
                  <button
                    onClick={() => loadBot(bot)}
                    className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                      !isAuthenticated
                        ? 'bg-gradient-to-r from-amber-600/50 to-yellow-600/50 text-amber-100 hover:from-amber-500/60 hover:to-yellow-500/60 border border-amber-500/30'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 hover:from-amber-400 hover:to-yellow-400 shadow-lg shadow-amber-500/20'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    {!isAuthenticated ? 'LOAD BOT (DEMO MODE)' : 'LOAD BOT'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trading Workspace */}
        {activeView === 'dashboard' && activeBot && (
          <div className="space-y-4">
            {/* Back Button */}
            <button
              onClick={() => {
                stopEngine();
                setActiveBot(null);
              }}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>

            {/* Workspace Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-amber-500/20 flex items-center justify-center text-4xl">
                  {activeBot.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">{activeBot.name}</h2>
                    {!isAuthenticated && (
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-medium">
                        DEMO MODE
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400">{activeBot.strategy}</p>
                </div>
              </div>

              {/* Market Strength Indicator */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-400">Market Strength</span>
                  <span className={`text-lg font-bold ${
                    marketStrength.strength >= 80
                      ? 'text-emerald-400'
                      : marketStrength.strength >= 60
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}>
                    {marketStrength.strength}%
                  </span>
                </div>
                <div className="w-24 h-24 rounded-full border-4 border-gray-700 relative flex items-center justify-center">
                  <div
                    className={`absolute inset-0 rounded-full ${
                      marketStrength.strength >= 80
                        ? 'border-emerald-400'
                        : marketStrength.strength >= 60
                          ? 'border-amber-400'
                          : 'border-red-400'
                    }`}
                    style={{
                      clipPath: `polygon(50% 50%, 50% 0%, ${50 + marketStrength.strength * 0.5}% 0%, 50% 50%)`
                    }}
                  />
                  <span className="text-xs text-gray-400">{marketStrength.momentum.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Configuration Panel */}
              <div className="lg:col-span-1 space-y-4">
                <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
                  <h3 className="font-bold text-amber-400 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configuration
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Stake Amount ($)</label>
                      <input
                        type="number"
                        value={stake}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          setStake(val);
                          setCurrentStake(val);
                        }}
                        disabled={isEngineRunning}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Take Profit ($)</label>
                      <input
                        type="number"
                        value={takeProfit}
                        onChange={e => setTakeProfit(parseFloat(e.target.value))}
                        disabled={isEngineRunning}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">Stop Loss ($)</label>
                      <input
                        type="number"
                        value={stopLoss}
                        onChange={e => setStopLoss(parseFloat(e.target.value))}
                        disabled={isEngineRunning}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                      />
                    </div>

                    {activeBot.usesHighPayout && (
                      <div>
                        <label className="text-sm text-gray-400 mb-1 block">Max Martingale Steps</label>
                        <input
                          type="number"
                          value={maxMartingaleSteps}
                          onChange={e => setMaxMartingaleSteps(parseInt(e.target.value))}
                          disabled={isEngineRunning}
                          max={4}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Engine Controls */}
                  <div className="mt-6 flex gap-2">
                    {!isEngineRunning ? (
                      <button
                        onClick={startEngine}
                        className="flex-1 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-bold flex items-center justify-center gap-2 hover:from-emerald-400 hover:to-emerald-300 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Play className="w-5 h-5" />
                        RUN ENGINE
                      </button>
                    ) : (
                      <button
                        onClick={stopEngine}
                        className="flex-1 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-400 text-white font-bold flex items-center justify-center gap-2 hover:from-red-400 hover:to-red-300 transition-all shadow-lg shadow-red-500/20"
                      >
                        <Square className="w-5 h-5" />
                        STOP ENGINE
                      </button>
                    )}
                  </div>

                  {/* Cooldown Warning */}
                  {cooldownActive && (
                    <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                      <Timer className="w-6 h-6 text-amber-400 animate-pulse" />
                      <div>
                        <p className="text-amber-400 font-bold">Cooldown Active</p>
                        <p className="text-sm text-gray-400">{cooldownRemaining}s remaining</p>
                      </div>
                    </div>
                  )}

                  {/* Market Warning */}
                  {marketStrength.strength < 80 && isEngineRunning && (
                    <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                      <div>
                        <p className="text-red-400 font-bold">Slippage Protection Active</p>
                        <p className="text-sm text-gray-400">Waiting for market stabilization</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Panel */}
              <div className="lg:col-span-2 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
                    <DollarSign className="w-5 h-5 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-400">Total Stake</p>
                    <p className="text-xl font-bold text-white">${totalStake.toFixed(2)}</p>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
                    <Target className="w-5 h-5 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-400">Payout</p>
                    <p className="text-xl font-bold text-amber-400">${totalPayout.toFixed(2)}</p>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
                    <Check className="w-5 h-5 text-emerald-400 mb-2" />
                    <p className="text-xs text-gray-400">Won</p>
                    <p className="text-xl font-bold text-emerald-400">{contractsWon}</p>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4">
                    <X className="w-5 h-5 text-red-400 mb-2" />
                    <p className="text-xs text-gray-400">Lost</p>
                    <p className="text-xl font-bold text-red-400">{contractsLost}</p>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 col-span-2 sm:col-span-1">
                    <TrendingUp className="w-5 h-5 text-gray-400 mb-2" />
                    <p className="text-xs text-gray-400">Net P/L</p>
                    <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Current Stake Display */}
                {activeBot.usesHighPayout && isEngineRunning && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Current Stake (Martingale)</p>
                      <p className="text-2xl font-bold text-amber-400">${currentStake.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Recovery Progress</p>
                      <p className="text-sm text-amber-400">{consecutiveLosses} loss(es) in streak</p>
                    </div>
                  </div>
                )}

                {/* Trade History */}
                <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-amber-400" />
                      Live Trade History
                    </h3>
                  </div>

                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    {trades.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No trades yet. Start the engine to begin.</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-800/50 sticky top-0">
                          <tr className="text-xs text-gray-400">
                            <th className="px-4 py-3 text-left">Asset</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-right">Entry</th>
                            <th className="px-4 py-3 text-right">Exit</th>
                            <th className="px-4 py-3 text-right">Buy Price</th>
                            <th className="px-4 py-3 text-right">P/L</th>
                            <th className="px-4 py-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades.map((trade, i) => (
                            <tr key={trade.id + i} className="border-t border-gray-800 hover:bg-gray-800/30">
                              <td className="px-4 py-3 text-sm text-white">{trade.asset}</td>
                              <td className="px-4 py-3 text-sm text-gray-400">{trade.contractType}</td>
                              <td className="px-4 py-3 text-sm text-gray-400 text-right font-mono">
                                {trade.entrySpot?.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-400 text-right font-mono">
                                {trade.exitSpot?.toFixed(2) || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-400 text-right">
                                ${trade.buyPrice.toFixed(2)}
                              </td>
                              <td className={`px-4 py-3 text-sm text-right font-bold ${
                                (trade.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {trade.netProfit !== undefined
                                  ? `${trade.netProfit >= 0 ? '+' : ''}${trade.netProfit.toFixed(2)}`
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  trade.status === 'won'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {trade.status === 'won' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                  {trade.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bot Builder View */}
        {activeView === 'bot-builder' && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">Bot Builder</h2>
            </div>

            <p className="text-gray-400 mb-8">
              Create and customize your trading strategies by adjusting mathematical indicators.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h3 className="font-bold text-amber-400 mb-4">EMA Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Short EMA Period</label>
                    <input
                      type="number"
                      defaultValue={9}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Long EMA Period</label>
                    <input
                      type="number"
                      defaultValue={21}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h3 className="font-bold text-amber-400 mb-4">Bollinger Bands</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Period</label>
                    <input
                      type="number"
                      defaultValue={20}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Standard Deviation</label>
                    <input
                      type="number"
                      defaultValue={2}
                      step={0.5}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h3 className="font-bold text-amber-400 mb-4">ATR Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">ATR Period</label>
                    <input
                      type="number"
                      defaultValue={14}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">ATR Multiplier</label>
                    <input
                      type="number"
                      defaultValue={1.5}
                      step={0.1}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h3 className="font-bold text-amber-400 mb-4">Contract Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Contract Duration</label>
                    <input
                      type="number"
                      defaultValue={5}
                      className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Duration Unit</label>
                    <select className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-amber-500">
                      <option value="t">Ticks</option>
                      <option value="s">Seconds</option>
                      <option value="m">Minutes</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                disabled
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold opacity-50 cursor-not-allowed"
              >
                Coming Soon: Save Custom Strategy
              </button>
            </div>
          </div>
        )}

        {/* Analysis View */}
        {activeView === 'analysis' && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold text-white">Performance Analysis</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <p className="text-gray-400 text-sm">Total Trades</p>
                <p className="text-3xl font-bold text-white">{contractsWon + contractsLost}</p>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {contractsWon + contractsLost > 0
                    ? ((contractsWon / (contractsWon + contractsLost)) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <p className="text-gray-400 text-sm">Total Profit</p>
                <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${totalProfit.toFixed(2)}
                </p>
              </div>

              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <p className="text-gray-400 text-sm">Net ROI</p>
                <p className={`text-3xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalStake > 0 ? ((totalProfit / totalStake) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            {/* Bot Performance Grid */}
            <div className="rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-bold text-white">Bot Strategy Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr className="text-xs text-gray-400">
                      <th className="px-4 py-3 text-left">Bot Name</th>
                      <th className="px-4 py-3 text-right">Trades</th>
                      <th className="px-4 py-3 text-right">Win Rate</th>
                      <th className="px-4 py-3 text-right">Avg P/L</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BOTS.map(bot => (
                      <tr key={bot.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                        <td className="px-4 py-3 flex items-center gap-2">
                          <span className="text-xl">{bot.icon}</span>
                          <span className="text-sm text-white">{bot.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 text-right">-</td>
                        <td className="px-4 py-3 text-sm text-gray-400 text-right">-</td>
                        <td className="px-4 py-3 text-sm text-gray-400 text-right">-</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 rounded-full bg-gray-700 text-gray-400 text-xs">
                            No Data
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Live Chat View - Market Ticker */}
        {activeView === 'live-chat' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Live Market Ticker</h2>
                  <p className="text-sm text-gray-400">Volatility 100 Index - Real-time Rise/Fall Patterns</p>
                </div>
              </div>

              {/* Current Spot Display */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-gray-400">Current Spot</span>
                  <p className="text-2xl font-bold text-amber-400 font-mono">
                    {currentTickSpot > 0 ? currentTickSpot.toFixed(2) : '---.--'}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  currentTickSpot > 0
                    ? 'bg-emerald-500/20'
                    : 'bg-gray-800'
                }`}>
                  <Zap className={`w-6 h-6 ${currentTickSpot > 0 ? 'text-emerald-400' : 'text-gray-500'}`} />
                </div>
              </div>
            </div>

            {/* Pattern Log */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden">
              <div className="p-4 border-b border-gray-800 bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                    Market Structure Log
                  </h3>
                  <span className="text-xs text-gray-400">
                    {marketPatternLog.length} patterns tracked
                  </span>
                </div>
              </div>

              <div className="h-96 overflow-y-auto p-4 space-y-2">
                {marketPatternLog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <Activity className="w-12 h-12 mb-4 animate-pulse" />
                    <p>Connecting to market feed...</p>
                    <p className="text-sm mt-2">Patterns will appear here in real-time</p>
                  </div>
                ) : (
                  marketPatternLog.slice(0, 50).map((pattern, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                        pattern.direction === 'RISE'
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}
                    >
                      {/* Direction Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        pattern.direction === 'RISE'
                          ? 'bg-emerald-500/20'
                          : 'bg-red-500/20'
                      }`}>
                        {pattern.direction === 'RISE' ? (
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-red-400 rotate-180" />
                        )}
                      </div>

                      {/* Pattern Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            pattern.direction === 'RISE' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {pattern.direction === 'RISE' ? '[RISE]' : '[FALL]'}
                          </span>
                          <span className="text-gray-400 font-mono text-sm">
                            Spot {pattern.spot.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Previous: {pattern.prevSpot.toFixed(2)} | Delta: {(pattern.spot - pattern.prevSpot).toFixed(2)}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="text-right">
                        <span className="text-xs text-gray-400">{pattern.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Community CTA */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm text-white font-medium">Join the Community</p>
                  <p className="text-xs text-gray-400">Discuss strategies with fellow traders</p>
                </div>
              </div>
              <a
                href="https://t.me/tosh_freesignal"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-semibold text-sm hover:from-amber-400 hover:to-yellow-400 transition-all"
              >
                Join Telegram
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Admin Panel Modal */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-xl border border-gray-700 bg-gray-900 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Admin Control Panel
              </h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                  <UserCheck className="w-5 h-5 text-purple-400 mb-2" />
                  <p className="text-xs text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{adminStats.totalUsers}</p>
                </div>

                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <Zap className="w-5 h-5 text-emerald-400 mb-2" />
                  <p className="text-xs text-gray-400">Active Bots</p>
                  <p className="text-2xl font-bold text-white">{adminStats.activeBots}</p>
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <Shield className="w-5 h-5 text-amber-400 mb-2" />
                  <p className="text-xs text-gray-400">Premium Accounts</p>
                  <p className="text-2xl font-bold text-white">{adminStats.premiumAccounts}</p>
                </div>

                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                  <TrendingUpIcon className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-xs text-gray-400">Total Trades</p>
                  <p className="text-2xl font-bold text-white">{adminStats.totalTrades}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                  <h3 className="font-bold text-white">Bot Win Rate Analysis</h3>
                </div>
                <div className="p-4">
                  <p className="text-gray-400 text-center py-8">
                    Win rate data will populate as users execute trades.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discipline Protocol Modal */}
      {showDisciplineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-amber-500/30 bg-gray-900 shadow-2xl shadow-amber-500/10">
            <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-amber-500/10 to-yellow-500/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white">TOSH Systemic Discipline Protocol</h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {[
                'Risk Capital Only: Never trade with money you cannot afford to lose.',
                'No Revenge Trading: Accept manual or automated losses gracefully; let the system\'s cooling loops work.',
                'Lock in Profits: Once your daily take-profit target is achieved, forcefully close your session.',
                'Trust the Math Engine: Avoid repeatedly starting and pausing live bots mid-cycle.',
                'Active Session Oversight: Do not leave automated execution windows unmonitored during high-impact events.',
                'Psychology First: If emotional fatigue, greed, or panic sets in, terminate execution instantly.'
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-amber-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-gray-300">{rule}</p>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-800">
              <button
                onClick={() => setShowDisciplineModal(false)}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold hover:from-amber-400 hover:to-yellow-400 transition-all"
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-950/50 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              <span className="text-gray-400 text-sm">
                Powered by Deriv API
              </span>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social, i) => (
                <a
                  key={i}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group"
                  title={social.name}
                >
                  {i === 0 && (
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.866 9.866 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  )}
                  {i === 1 && <Youtube className="w-5 h-5 text-gray-400 group-hover:text-amber-400" />}
                  {i === 2 && (
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.326-.023.468.06.112.06.22.182.26.338.035.103.05.298.05.5v4.5c0 .2-.015.396-.05.5-.04.156-.148.277-.26.338-.142.083-.368.062-.468.06H7.094c-.1 0-.326.023-.468-.06-.112-.06-.22-.182-.26-.338-.035-.104-.05-.298-.05-.5v-4.5c0-.2.015-.396.05-.5.04-.156.148-.277.26-.338.142-.083.368-.062.468-.06h9.812zM12 9.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-4z"/>
                    </svg>
                  )}
                  {i === 3 && (
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.1 1.04-1.28 1.77-.21.71-.19 1.5.07 2.19.37.99 1.27 1.74 2.28 1.95.72.15 1.49.07 2.14-.24.66-.32 1.18-.87 1.44-1.54.2-.52.15-1.09.15-1.63.01-3.04 0-6.07.01-9.11.01-2.32 0-4.65.01-6.97 0-.02-1.91 0-3.83.01-5.75h-.01z"/>
                    </svg>
                  )}
                </a>
              ))}
            </div>

            <p className="text-gray-500 text-sm">
              &copy; 2024 TOSH-X-BOT. Trade responsibly.
            </p>
          </div>

          {/* Ownership Branding */}
          <div className="mt-4 pt-4 border-t border-gray-800/50 text-center">
            <p className="text-[11px] tracking-wider uppercase" style={{ color: 'rgba(180, 140, 80, 0.6)' }}>
              Owned by: <span className="font-medium" style={{ color: 'rgba(245, 158, 11, 0.7)' }}>Chigozie Michael Ihuoma</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
