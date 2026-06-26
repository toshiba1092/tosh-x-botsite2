import type { DerivTick, DerivAuthorization, DerivBalance, DerivCandle, TradeResult } from '../types';

type MessageHandler = (data: unknown) => void;

class DerivAPI {
  private ws: WebSocket | null = null;
  private requestId = 1;
  private pendingRequests: Map<number, { resolve: Function; reject: Function }> = new Map();
  private tickCallbacks: Map<string, MessageHandler[]> = new Map();
  private candleCallbacks: Map<string, MessageHandler[]> = new Map();
  private balanceCallbacks: MessageHandler[] = [];
  private contractCallbacks: Map<number, MessageHandler[]> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private token: string | null = null;
  private accountType: 'real' | 'demo' = 'demo';
  private connectionPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (this.isConnected) return Promise.resolve();
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket('wss://ws.derivws.com/websockets/v3?app_id=1089');

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startPing();
          resolve();
        };

        this.ws.onmessage = (event) => {
          const response = JSON.parse(event.data);
          this.handleMessage(response);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          this.connectionPromise = null;
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private startPing(): void {
    setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send({ ping: 1 });
      }
    }, 30000);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, 2000 * this.reconnectAttempts);
    }
  }

  private handleMessage(response: any): void {
    const reqId = response.req_id;

    if (reqId && this.pendingRequests.has(reqId)) {
      const { resolve, reject } = this.pendingRequests.get(reqId)!;
      this.pendingRequests.delete(reqId);

      if (response.error) {
        reject(response.error);
      } else {
        resolve(response);
      }
      return;
    }

    if (response.msg_type === 'tick' && response.tick) {
      const symbol = response.tick.symbol;
      const handlers = this.tickCallbacks.get(symbol) || [];
      handlers.forEach(handler => handler(response.tick));
    }

    if (response.msg_type === 'ohlc' && response.ohlc) {
      const symbol = response.ohlc.symbol;
      const handlers = this.candleCallbacks.get(symbol) || [];
      handlers.forEach(handler => handler(response.ohlc));
    }

    if (response.msg_type === 'balance' && response.balance) {
      this.balanceCallbacks.forEach(handler => handler(response.balance));
    }

    if (response.msg_type === 'proposal_open_contract' && response.proposal_open_contract) {
      const contract = response.proposal_open_contract;
      const contractId = contract.contract_id;
      const handlers = this.contractCallbacks.get(contractId) || [];
      handlers.forEach(handler => handler(contract));
    }
  }

  private async send(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const reqId = this.requestId++;
      const message = { ...data, req_id: reqId };

      this.pendingRequests.set(reqId, { resolve, reject });
      this.ws.send(JSON.stringify(message));

      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  async authorize(token: string): Promise<DerivAuthorization> {
    this.token = token;
    const response = await this.send({ authorize: token });
    return response as DerivAuthorization;
  }

  async getBalance(): Promise<DerivBalance> {
    const payload: any = { balance: 1 };
    if (this.accountType === 'demo' && this.token) {
      payload.account = '_demo';
    }
    const response = await this.send(payload);
    return response.balance;
  }

  setAccountType(type: 'real' | 'demo'): void {
    this.accountType = type;
  }

  async subscribeToTicks(symbol: string, callback: (tick: DerivTick['tick']) => void): Promise<string> {
    // Add callback first
    const handler = (tick: unknown) => callback(tick as DerivTick['tick']);
    const handlers = this.tickCallbacks.get(symbol) || [];
    handlers.push(handler);
    this.tickCallbacks.set(symbol, handlers);

    // Only subscribe if this is the first handler for this symbol
    if (handlers.length === 1) {
      const response = await this.send({
        ticks: symbol,
        subscribe: 1
      });
      return response.subscription.id;
    }

    return `existing-${symbol}`;
  }

  async subscribeToCandles(
    symbol: string,
    granularity: number,
    callback: (candle: DerivCandle) => void
  ): Promise<string> {
    const response = await this.send({
      ohlc: symbol,
      granularity,
      subscribe: 1
    });

    const handler = (candle: unknown) => callback(candle as DerivCandle);

    const handlers = this.candleCallbacks.get(symbol) || [];
    handlers.push(handler);
    this.candleCallbacks.set(symbol, handlers);

    return response.subscription.id;
  }

  async subscribeToAccountBalance(callback: (balance: DerivBalance) => void): Promise<void> {
    this.balanceCallbacks.push(callback as MessageHandler);
    await this.send({ balance: 1, subscribe: 1 });
  }

  async getTickHistory(symbol: string, count: number = 50): Promise<DerivTick['tick'][]> {
    const response = await this.send({
      ticks_history: symbol,
      count,
      end: 'latest',
      style: 'ticks'
    });
    return response.history.prices.map((price: number, i: number) => ({
      ask: price,
      bid: price,
      quote: price,
      epoch: response.history.times[i],
      id: `tick-${i}`,
      pip_size: 2,
      symbol
    }));
  }

  async getCandleHistory(
    symbol: string,
    granularity: number,
    count: number = 50
  ): Promise<DerivCandle[]> {
    const response = await this.send({
      ticks_history: symbol,
      count,
      end: 'latest',
      style: 'candles',
      granularity
    });
    return response.candles;
  }

  async buyContract(
    symbol: string,
    contractType: string,
    duration: number,
    durationUnit: string,
    stake: number
  ): Promise<{ buy: { contract_id: number; buy_price: number } }> {
    const proposalParams: any = {
      buy: 1,
      price: stake,
      parameters: {
        amount: stake,
        basis: 'stake',
        contract_type: contractType,
        currency: 'USD',
        duration,
        duration_unit: durationUnit,
        symbol
      }
    };

    // Set demo account if needed
    if (this.accountType === 'demo') {
      proposalParams.parameters.account = 'demo';
    }

    const response = await this.send(proposalParams);
    return response;
  }

  async getProposedContract(
    symbol: string,
    contractType: string,
    duration: number,
    durationUnit: string,
    stake: number
  ): Promise<{ proposal: any }> {
    const params: any = {
      proposal: 1,
      amount: stake,
      basis: 'stake',
      contract_type: contractType,
      currency: 'USD',
      duration,
      duration_unit: durationUnit,
      symbol
    };

    if (this.accountType === 'demo') {
      params.account = 'demo';
    }

    return this.send(params);
  }

  async subscribeToContract(contractId: number, callback: (contract: any) => void): Promise<void> {
    const handlers = this.contractCallbacks.get(contractId) || [];
    handlers.push(callback as MessageHandler);
    this.contractCallbacks.set(contractId, handlers);

    await this.send({
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 1
    });
  }

  async sellContract(contractId: number): Promise<{ sell: { sold_for: number } }> {
    return this.send({
      sell: contractId,
      price: 0
    });
  }

  unsubscribe(subscriptionId: string): void {
    this.send({ forget: subscriptionId });
  }

  forgetAll(): void {
    this.send({ forget_all: ['ticks', 'ohlc', 'balance'] });
    this.tickCallbacks.clear();
    this.candleCallbacks.clear();
    this.balanceCallbacks = [];
    this.contractCallbacks.clear();
  }

  disconnect(): void {
    if (this.ws) {
      this.forgetAll();
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async checkMarketConditions(
    symbol: string,
    callbacks: {
      onEMA: (ema: number) => void;
      onATR: (atr: number) => void;
      onBandWidth: (width: number) => void;
      onMarketStrength: (strength: number, momentum: string) => void;
    }
  ): Promise<void> {
    const candles = await this.getCandleHistory(symbol, 60, 50);

    const closes = candles.map(c => c.close);

    // Calculate EMA (20)
    const ema20 = this.calculateEMA(closes, 20);
    callbacks.onEMA(ema20);

    // Calculate ATR
    const atr = this.calculateATR(candles, 14);
    callbacks.onATR(atr);

    // Calculate Bollinger Band width
    const bb = this.calculateBollingerBands(closes, 20);
    callbacks.onBandWidth(bb.width);

    // Calculate market strength
    const { strength, momentum } = this.calculateMarketStrength(candles);
    callbacks.onMarketStrength(strength, momentum);
  }

  calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1];

    const multiplier = 2 / (period + 1);
    const slice = data.slice(0, period);
    const sma = slice.reduce((a, b) => a + b, 0) / period;

    let ema = sma;
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  calculateATR(candles: { high: number; low: number; close: number }[], period: number = 14): number {
    if (candles.length < period + 1) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const close = candles[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - close),
        Math.abs(low - close)
      );
      trueRanges.push(tr);
    }

    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2): {
    upper: number;
    middle: number;
    lower: number;
    width: number;
  } {
    if (data.length < period) {
      const last = data[data.length - 1];
      return { upper: last, middle: last, lower: last, width: 0 };
    }

    const slice = data.slice(-period);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    return {
      upper: sma + std * stdDev,
      middle: sma,
      lower: sma - std * stdDev,
      width: (std * stdDev * 2) / sma * 100
    };
  }

  calculateMarketStrength(candles: DerivCandle[]): { strength: number; momentum: string } {
    if (candles.length < 10) return { strength: 50, momentum: 'neutral' };

    const recent = candles.slice(-10);
    const closes = recent.map(c => c.close);

    const priceChange = (closes[closes.length - 1] - closes[0]) / closes[0] * 100;

    let strength = 50;
    let direction = 0;

    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) direction++;
      else if (closes[i] < closes[i - 1]) direction--;
    }

    strength = 50 + (direction / closes.length) * 50;
    strength = Math.min(100, Math.max(0, strength + priceChange * 10));

    const momentum = direction > 3 ? 'bullish' : direction < -3 ? 'bearish' : 'neutral';

    return { strength: Math.round(strength), momentum };
  }

  async waitForContractCompletion(contractId: number): Promise<TradeResult> {
    return new Promise(async (resolve) => {
      await this.subscribeToContract(contractId, (contract: any) => {
        if (contract.status !== 'open') {
          const result: TradeResult = {
            contract_id: contract.contract_id,
            buy_price: contract.buy_price,
            payout: contract.payout,
            profit: contract.profit,
            status: contract.status || contract.profit >= 0 ? 'won' : 'lost'
          };

          const handlers = this.contractCallbacks.get(contractId) || [];
          this.contractCallbacks.set(contractId, handlers);

          resolve(result);
        }
      });
    });
  }
}

export const derivApi = new DerivAPI();
export default DerivAPI;
