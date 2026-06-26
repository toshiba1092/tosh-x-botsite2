// Deriv API Types
export interface DerivTick {
  tick: {
    ask: number;
    bid: number;
    epoch: number;
    id: string;
    pip_size: number;
    quote: number;
    symbol: string;
  };
}

export interface DerivCandle {
  close: number;
  epoch: number;
  high: number;
  low: number;
  open: number;
}

export interface DerivContract {
  contract_id: number;
  buy_price: number;
  payout: number;
  profit: number;
  entry_tick: number;
  exit_tick?: number;
  contract_type: string;
  symbol: string;
  status: 'open' | 'sold' | 'won' | 'lost';
  current_spot?: number;
}

export interface DerivBalance {
  balance: number;
  currency: string;
  loginid: string;
}

export interface DerivAuthorization {
  account_list: DerivAccount[];
  authorize: {
    account_list: DerivAccount[];
    balance: number;
    country: string;
    currency: string;
    email: string;
    fullname: string;
    loginid: string;
  };
}

export interface DerivAccount {
  account_type: 'demographic' | 'real';
  balance: number;
  currency: string;
  id: string;
  is_disabled: boolean;
  is_virtual: boolean;
  landing_company_shortcode: string;
  loginid: string;
}

export interface TradeResult {
  contract_id: number;
  buy_price: number;
  payout: number;
  profit: number;
  status: 'won' | 'lost' | 'open';
}

// Bot Types
export interface Bot {
  id: string;
  bot_name: string;
  underlying_strategy: string;
  is_premium: boolean;
  uses_high_payout_recovery: boolean;
  confidence: number;
  risk_status: 'optimal' | 'risky';
}

export interface BotConfig {
  stake: number;
  takeProfit: number;
  stopLoss: number;
  maxMartingaleSteps: number;
  martingaleMultiplier: number;
}

export interface TradeState {
  isRunning: boolean;
  currentStake: number;
  baseStake: number;
  consecutiveLosses: number;
  totalProfit: number;
  totalStake: number;
  totalPayout: number;
  contractsWon: number;
  contractsLost: number;
  trades: TradeRecord[];
}

export interface TradeRecord {
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

// App Types
export interface User {
  id: string;
  deriv_account_id: string;
  account_type_active: 'real' | 'demo';
  is_premium_status: boolean;
}

export type ViewType = 'dashboard' | 'bot-builder' | 'analysis' | 'live-chat' | 'admin' | 'workspace';

export interface MarketStrength {
  value: number;
  momentum: 'bullish' | 'bearish' | 'neutral';
  volatility: 'high' | 'medium' | 'low';
  strength: number;
}
