// Mock data for the TradeBots Dashboard

export interface Bot {
  id: string;
  name: string;
  description: string;
  strategy: string;
  accuracy: number;
  operations: number; // Changed from downloads to operations
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  author: string;
  profitFactor: number;
  expectancy: number;
  drawdown: number;
  riskLevel: number;
  tradedAssets: string[];
  code: string;
  usageInstructions?: string; // Novo campo para instruções de uso
  isFavorite?: boolean; // New field for favorites
  ranking?: number; // New field for ranking
  downloadUrl?: string;
}

export interface PerformanceData {
  date: string;
  value: number;
}

// Generate some performance data
const generatePerformanceData = (length: number, isPositive: boolean, startValue: number): PerformanceData[] => {
  const data: PerformanceData[] = [];
  let current = startValue;
  
  for (let i = 0; i < length; i++) {
    // Generate a date that's i days ago from today
    const date = new Date();
    date.setDate(date.getDate() - (length - i));
    
    // Generate a value that trends upward or downward slightly
    const variation = Math.random() * 5;
    if (isPositive) {
      current += variation;
    } else {
      current -= variation;
      if (current < 0) current = 0; // Prevent negative values
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat(current.toFixed(2))
    });
  }
  
  return data;
};

// Example strategy code snippets
const strategyCode = {
  movingAverage: `// Moving Average Crossover Strategy
function initialize() {
  // Define indicators
  this.fastMA = SMA(14);
  this.slowMA = SMA(28);
}

function onTick(tick) {
  // Calculate indicators
  const fastValue = this.fastMA.calculate(tick.close);
  const slowValue = this.slowMA.calculate(tick.close);
  
  // Trading logic
  if (fastValue > slowValue && !this.position) {
    // Bullish crossover - Buy signal
    this.buy(tick.symbol, 1);
  } else if (fastValue < slowValue && this.position > 0) {
    // Bearish crossover - Sell signal
    this.sell(tick.symbol, 1);
  }
}`,
  
  gridTrading: `// Grid Trading Strategy
function initialize() {
  // Strategy parameters
  this.gridSize = 10;      // Number of grid levels
  this.gridSpacing = 50;   // Price difference between grid levels
  this.basePrice = 1000;   // Base price for grid calculation
  this.grids = [];
  
  // Create grid levels
  this.setupGrids();
}

function setupGrids() {
  for (let i = 0; i < this.gridSize; i++) {
    const buyLevel = this.basePrice - (i * this.gridSpacing);
    const sellLevel = this.basePrice + (i * this.gridSpacing);
    
    this.grids.push({
      buyLevel: buyLevel,
      sellLevel: sellLevel,
      isBuyActive: true,
      isSellActive: true
    });
  }
}

function onTick(tick) {
  const price = tick.close;
  
  // Check each grid level
  for (const grid of this.grids) {
    // Buy orders
    if (price <= grid.buyLevel && grid.isBuyActive) {
      this.buy(tick.symbol, 0.1);
      grid.isBuyActive = false;
    }
    
    // Sell orders
    if (price >= grid.sellLevel && grid.isSellActive) {
      this.sell(tick.symbol, 0.1);
      grid.isSellActive = false;
    }
    
    // Reset grid levels
    if (price > grid.buyLevel + this.gridSpacing) {
      grid.isBuyActive = true;
    }
    
    if (price < grid.sellLevel - this.gridSpacing) {
      grid.isSellActive = true;
    }
  }
}`,
  
  rsi: `// RSI Strategy with trend confirmation
function initialize() {
  this.rsi = RSI(14);
  this.ema = EMA(100);
  
  this.oversold = 30;
  this.overbought = 70;
}

function onTick(tick) {
  const price = tick.close;
  const rsiValue = this.rsi.calculate(price);
  const emaValue = this.ema.calculate(price);
  
  // RSI oversold and price above EMA - bullish
  if (rsiValue <= this.oversold && price > emaValue && !this.position) {
    this.buy(tick.symbol, 1);
    this.setStopLoss(price * 0.95); // 5% stop loss
  }
  
  // RSI overbought and price below EMA - bearish
  if (rsiValue >= this.overbought && price < emaValue && this.position > 0) {
    this.sell(tick.symbol, 1);
  }
}`,

  martingale: `// Martingale Strategy
function initialize() {
  this.baseLot = 0.01;        // Starting lot size
  this.maxTrades = 6;         // Maximum number of martingale steps
  this.multiplier = 2.0;      // Size multiplier after loss
  this.takeProfit = 50;       // Take profit in pips
  this.stopLoss = 20;         // Stop loss per trade in pips
  
  this.currentTrade = 0;      // Current trade number
  this.lotSize = this.baseLot;
}

function onTick(tick) {
  // Trading logic (simplified)
  if (!this.position && this.currentTrade < this.maxTrades) {
    // Open a new position
    this.buy(tick.symbol, this.lotSize);
    this.entryPrice = tick.close;
    
    // Set take profit and stop loss
    this.setTakeProfit(this.entryPrice + this.takeProfit * tick.pipValue);
    this.setStopLoss(this.entryPrice - this.stopLoss * tick.pipValue);
  }
}

function onPositionClosed(result) {
  if (result.profit > 0) {
    // Winning trade - reset martingale
    this.currentTrade = 0;
    this.lotSize = this.baseLot;
  } else {
    // Losing trade - increase lot size
    this.currentTrade++;
    this.lotSize *= this.multiplier;
  }
}`,

  arbitrage: `// Triangular Arbitrage Strategy
function initialize() {
  // Define currency pairs to monitor
  this.pairs = [
    { symbol: "EURUSD", bid: 0, ask: 0 },
    { symbol: "GBPUSD", bid: 0, ask: 0 },
    { symbol: "EURGBP", bid: 0, ask: 0 }
  ];
  
  // Minimum profit threshold to execute arbitrage (in pips)
  this.minProfit = 0.5;
}

function onTick(tick) {
  // Update prices for the relevant pair
  for (let pair of this.pairs) {
    if (tick.symbol === pair.symbol) {
      pair.bid = tick.bid;
      pair.ask = tick.ask;
    }
  }
  
  // Check if we have prices for all pairs
  if (this.pairs.every(pair => pair.bid > 0 && pair.ask > 0)) {
    this.checkArbitrage();
  }
}

function checkArbitrage() {
  // Extract prices
  const eurUsdBid = this.pairs[0].bid;
  const eurUsdAsk = this.pairs[0].ask;
  const gbpUsdBid = this.pairs[1].bid;
  const gbpUsdAsk = this.pairs[1].ask;
  const eurGbpBid = this.pairs[2].bid;
  const eurGbpAsk = this.pairs[2].ask;
  
  // Path 1: EUR -> USD -> GBP -> EUR
  const path1 = (1 / eurUsdAsk) * gbpUsdBid * eurGbpBid;
  
  // Path 2: EUR -> GBP -> USD -> EUR
  const path2 = eurGbpBid * (1 / gbpUsdAsk) * eurUsdBid;
  
  // Calculate potential profit
  const profit1 = path1 - 1;
  const profit2 = path2 - 1;
  
  // Execute trades if profit exceeds minimum threshold
  if (profit1 > this.minProfit / 10000) {
    this.executeArbitrage("path1");
  } else if (profit2 > this.minProfit / 10000) {
    this.executeArbitrage("path2");
  }
}

function executeArbitrage(path) {
  // Trading logic to execute the arbitrage
  console.log("Executing arbitrage path: " + path);
  // Implementation details omitted for brevity
}`,

  contrarian: `// Impulso Contrário Pro - Contrarian Martingale Strategy
function initialize() {
  // Strategy parameters
  this.baseStake = 0.35;        // Base stake amount
  this.maxLoss = 5.0;           // Max acceptable loss (moderate setting)
  this.targetProfit = 3.0;      // Expected profit (moderate setting)
  this.martingaleFactor = 1.071; // Multiplier for stake after loss
  this.nextCondition = "Rise";  // Initial condition
  
  // Tracking variables
  this.currentBalance = 0;
  this.initialBalance = this.getBalance();
  this.currentStake = this.baseStake;
}

function onTick(tick) {
  // Check if we've reached stop conditions
  if (this.currentBalance <= -this.maxLoss || this.currentBalance >= this.targetProfit) {
    this.stop("Target reached: " + this.currentBalance);
    return;
  }
  
  // Contrarian entry logic
  if (this.nextCondition === "Rise") {
    // If next expected is Rise, we bet on opposite (PUT)
    this.buyPut(tick.symbol, this.currentStake);
  } else {
    // If next expected is Fall, we bet on opposite (CALL)
    this.buyCall(tick.symbol, this.currentStake);
  }
}

function onTradeResult(result) {
  if (result.profit > 0) {
    // Winning trade - reset stake to base amount
    this.currentStake = this.baseStake;
    this.currentBalance += result.profit;
  } else {
    // Losing trade - increase stake using martingale and invert condition
    const loss = Math.abs(result.profit);
    this.currentStake = loss * this.martingaleFactor;
    this.currentBalance += result.profit;
    
    // Alternate condition after a loss
    this.nextCondition = this.nextCondition === "Rise" ? "Fall" : "Rise";
  }
}
`,
  
  smaTrendRunner: `// Optin Trade - SMA Crossover Strategy for Runs Contracts
function initialize() {
  // Define indicators
  this.fastSMA = SMA(1);  // Essentially the current price
  this.slowSMA = SMA(20); // 20-period SMA for trend identification
  
  // Strategy parameters
  this.initialStake = 0.35;        // Initial stake amount
  this.stopLoss = 10.0;            // Max acceptable loss
  this.targetProfit = 5.0;         // Expected profit
  this.ticksDuration = 3;          // Contract duration in ticks
  
  // Tracking variables
  this.totalProfit = 0;
  this.lastTradeResult = null;
  this.waitingForSignal = false;
}

function onTick(tick) {
  // Check if we've reached stop conditions
  if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
    this.stop("Target reached: " + this.totalProfit);
    return;
  }
  
  if (this.waitingForSignal) {
    return; // Skip this tick if we're waiting for signal confirmation
  }
  
  // Calculate indicator values
  const fastValue = this.fastSMA.calculate(tick.close);
  const slowValue = this.slowSMA.calculate(tick.close);
  
  // SMA crossover logic
  if (fastValue > slowValue) {
    // Potential uptrend - Buy RUNHIGH
    this.waitingForSignal = true;
    
    // Wait 1 second for confirmation
    setTimeout(() => {
      // Double-check the signal
      const currentFast = this.fastSMA.calculate(this.getLatestTick().close);
      const currentSlow = this.slowSMA.calculate(this.getLatestTick().close);
      
      if (currentFast > currentSlow) {
        // Signal confirmed - Buy RUNHIGH
        const stakeAmount = this.calculateStake();
        this.buyRunHigh(tick.symbol, stakeAmount, this.ticksDuration);
      }
      this.waitingForSignal = false;
    }, 1000);
  } 
  else if (fastValue < slowValue) {
    // Potential downtrend - Buy RUNLOW
    this.waitingForSignal = true;
    
    // Wait 1 second for confirmation
    setTimeout(() => {
      // Double-check the signal
      const currentFast = this.fastSMA.calculate(this.getLatestTick().close);
      const currentSlow = this.slowSMA.calculate(this.getLatestTick().close);
      
      if (currentFast < currentSlow) {
        // Signal confirmed - Buy RUNLOW
        const stakeAmount = this.calculateStake();
        this.buyRunLow(tick.symbol, stakeAmount, this.ticksDuration);
      }
      this.waitingForSignal = false;
    }, 1000);
  }
}

function calculateStake() {
  // Special Martingale recovery system
  if (this.lastTradeResult && this.lastTradeResult.profit < 0) {
    if (this.totalProfit >= -1) {
      // Small overall loss - use fixed stake
      return 0.35;
    } else {
      // Significant loss - aggressive recovery
      return this.totalProfit * -0.45;
    }
  }
  
  // Default or after win
  return this.initialStake;
}

function onTradeResult(result) {
  this.lastTradeResult = result;
  this.totalProfit += result.profit;
  
  // Log the result
  console.log("Trade completed: " + result.type + ", Profit: " + result.profit + ", Total: " + this.totalProfit);
}
`,
  
  smaTrendFollower: `// SMA Trend Follower - SMA Crossover Strategy for Higher/Lower Contracts
function initialize() {
  // Define indicators
  this.fastSMA = SMA(1);  // Essentially the current price
  this.slowSMA = SMA(20); // 20-period SMA for trend identification
  
  // Strategy parameters
  this.initialStake = 0.35;        // Initial stake amount
  this.stopLoss = 10.0;            // Max acceptable loss
  this.targetProfit = 5.0;         // Expected profit
  this.ticksDuration = 10;         // Contract duration in ticks
  
  // Tracking variables
  this.totalProfit = 0;
  this.lastTradeResult = null;
  this.waitingForSignal = false;
}

function onTick(tick) {
  // Check if we've reached stop conditions
  if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
    this.stop("Target reached: " + this.totalProfit);
    return;
  }
  
  if (this.waitingForSignal) {
    return; // Skip this tick if we're waiting for signal confirmation
  }
  
  // Calculate indicator values
  const fastValue = this.fastSMA.calculate(tick.close);
  const slowValue = this.slowSMA.calculate(tick.close);
  
  // SMA crossover logic
  if (fastValue > slowValue) {
    // Potential uptrend - Buy CALL
    this.waitingForSignal = true;
    
    // Wait 1 second for confirmation
    setTimeout(() => {
      // Double-check the signal
      const currentFast = this.fastSMA.calculate(this.getLatestTick().close);
      const currentSlow = this.slowSMA.calculate(this.getLatestTick().close);
      
      if (currentFast > currentSlow) {
        // Signal confirmed - Buy CALL
        const stakeAmount = this.calculateStake();
        this.buyCall(tick.symbol, stakeAmount, this.ticksDuration);
      }
      this.waitingForSignal = false;
    }, 1000);
  } 
  else if (fastValue < slowValue) {
    // Potential downtrend - Buy PUT
    this.waitingForSignal = true;
    
    // Wait 1 second for confirmation
    setTimeout(() => {
      // Double-check the signal
      const currentFast = this.fastSMA.calculate(this.getLatestTick().close);
      const currentSlow = this.slowSMA.calculate(this.getLatestTick().close);
      
      if (currentFast < currentSlow) {
        // Signal confirmed - Buy PUT
        const stakeAmount = this.calculateStake();
        this.buyPut(tick.symbol, stakeAmount, this.ticksDuration);
      }
      this.waitingForSignal = false;
    }, 1000);
  }
}

function calculateStake() {
  // Special Martingale recovery system
  if (this.lastTradeResult && this.lastTradeResult.profit < 0) {
    if (this.totalProfit >= -1) {
      // Small overall loss - use fixed stake
      return 0.35;
    } else {
      // Significant loss - aggressive recovery
      return this.totalProfit * -0.45;
    }
  }
  
  // Default or after win
  return this.initialStake;
}

function onTradeResult(result) {
  this.lastTradeResult = result;
  this.totalProfit += result.profit;
  
  // Log the result
  console.log("Trade completed: " + result.type + ", Profit: " + result.profit + ", Total: " + this.totalProfit);
}
`,

  hunterPro: `// Hunter Pro - Penultimate Digit Filter with SMA Strategy
function initialize() {
  // Define indicators
  this.fastSMA = SMA(1);  // Current price
  this.slowSMA = SMA(20); // 20-period SMA for trend identification
  
  // Strategy parameters
  this.initialStake = 0.35;        // Initial stake amount
  this.stopLoss = 10.0;            // Max acceptable loss
  this.targetProfit = 5.0;         // Expected profit
  this.ticksDuration = 5;          // Contract duration in ticks
  
  // Tracking variables
  this.totalProfit = 0;
  this.lastTradeResult = null;
  this.waitingForSignal = false;
}

function onTick(tick) {
  // Check if we've reached stop conditions
  if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
    this.stop("Target reached: " + this.totalProfit);
    return;
  }
  
  if (this.waitingForSignal) {
    return; // Skip this tick if we're waiting for signal confirmation
  }
  
  // Get the tick price and extract the penultimate digit
  const price = tick.close;
  const priceStr = price.toFixed(2); // Format to 2 decimal places
  const penultimateDigit = priceStr[priceStr.length - 2];
  
  // Primary filter: Only proceed if the penultimate digit is 7
  if (penultimateDigit !== '7') {
    return; // Skip this tick
  }
  
  // Calculate indicator values for secondary confirmation
  const fastValue = this.fastSMA.calculate(tick.close);
  const slowValue = this.slowSMA.calculate(tick.close);
  
  // SMA crossover logic
  if (fastValue > slowValue) {
    // Potential uptrend - Buy CALL
    this.waitingForSignal = true;
    
    // Wait 1 second for confirmation
    setTimeout(() => {
      // Double-check the signal
      const currentFast = this.fastSMA.calculate(this.getLatestTick().close);
      const currentSlow = this.slowSMA.calculate(this.getLatestTick().close);
      
      if (currentFast > currentSlow) {
        // Signal confirmed - Buy CALL
        const stakeAmount = this.calculateStake();
        this.buyCall(tick.symbol, stakeAmount, this.ticksDuration);
      }
      this.waitingForSignal = false;
    }, 1000);
  } 
  else if (fastValue < slowValue) {
    // Potential downtrend - Buy PUT
    this.waitingForSignal = true;
    
    // Wait 1 second for confirmation
    setTimeout(() => {
      // Double-check the signal
      const currentFast = this.fastSMA.calculate(this.getLatestTick().close);
      const currentSlow = this.slowSMA.calculate(this.getLatestTick().close);
      
      if (currentFast < currentSlow) {
        // Signal confirmed - Buy PUT
        const stakeAmount = this.calculateStake();
        this.buyPut(tick.symbol, stakeAmount, this.ticksDuration);
      }
      this.waitingForSignal = false;
    }, 1000);
  }
}

function calculateStake() {
  // Special Martingale recovery system - more aggressive than other bots
  if (this.lastTradeResult && this.lastTradeResult.profit < 0) {
    if (this.totalProfit >= -1) {
      // Small overall loss - use fixed stake
      return 0.35;
    } else {
      // Significant loss - aggressive recovery (0.5 multiplier instead of 0.45)
      return this.totalProfit * -0.5;
    }
  }
  
  // Default or after win
  return this.initialStake;
}

function onTradeResult(result) {
  this.lastTradeResult = result;
  this.totalProfit += result.profit;
  
  // Log the result
  console.log("Trade completed: " + result.type + ", Profit: " + result.profit + ", Total: " + this.totalProfit);
}
`,

  quantumBot: `// Quantum Bot - Simple Alternating Direction Strategy without Martingale
function initialize() {
  // Strategy parameters
  this.baseStake = 0.35;         // Fixed stake amount
  this.stopLoss = 20.0;          // Max acceptable loss
  this.targetProfit = 20.0;      // Expected profit
  this.nextCondition = "Rise";   // Initial condition - will alternate on loss
  
  // Tracking variables
  this.totalProfit = 0;
  this.lastTradeResult = null;
  this.currentStake = this.baseStake; // Always fixed, no martingale
}

function onTick(tick) {
  // Check if we've reached stop conditions
  if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
    this.stop("Target reached: " + this.totalProfit);
    return;
  }
  
  // Simple alternating direction strategy
  if (this.nextCondition === "Rise") {
    // Buy CALL (Rise)
    this.buyCall(tick.symbol, this.currentStake, 1); // 1 tick duration
  } else {
    // Buy PUT (Fall)
    this.buyPut(tick.symbol, this.currentStake, 1); // 1 tick duration
  }
}

function onTradeResult(result) {
  if (result.profit > 0) {
    // Winning trade
    this.totalProfit += result.profit;
    // Keep same condition after win, stake remains fixed
  } else {
    // Losing trade
    this.totalProfit += result.profit;
    // No Martingale: stake remains fixed at base amount
    this.currentStake = this.baseStake;
    
    // Alternate condition after a loss
    this.nextCondition = this.nextCondition === "Rise" ? "Fall" : "Rise";
  }
  
  // Log the result
  console.log("Trade completed: " + result.type + ", Profit: " + result.profit + ", Total: " + this.totalProfit + ", Next: " + this.nextCondition);
}
`,

  xbot: `// XBot - Digit Filter & SMA Strategy with aggressive Martingale
function initialize() {
  // Define indicators
  this.fastSMA = SMA(1);  // Current price
  this.slowSMA = SMA(20); // 20-period SMA for trend identification
  
  // Strategy parameters
  this.initialStake = 0.35;  // Initial stake amount
  this.stopLoss = 20.0;      // Max acceptable loss
  this.targetProfit = 20.0;  // Expected profit
  this.ticksDuration = 5;    // Contract duration in ticks
  
  // Tracking variables
  this.totalProfit = 0;
  this.lastTradeResult = null;
  this.waitingForSignal = false;
}

function onTick(tick) {
  // Check if we've reached stop conditions
  if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
    this.stop("Target reached: " + this.totalProfit);
    return;
  }
  
  if (this.waitingForSignal) {
    return; // Skip this tick if we're waiting for signal confirmation
  }
  
  // Get the tick price as a string for digit analysis
  const priceStr = tick.close.toString();
  
  // Primary filter: Check for digit '7' at specific positions
  const firstSevenIndex = priceStr.indexOf('7');
  
  // Check if '7' is at position 6 OR (position 6 AND position 4)
  // Note: The second condition is logically impossible as the first occurrence can't be in two places
  if (firstSevenIndex !== 6) {
    return; // Skip this tick if digit filter condition isn't met
  }
  
  // Calculate indicator values for secondary confirmation
  const fastValue = this.fastSMA.calculate(tick.close);
  const slowValue = this.slowSMA.calculate(tick.close);
  
  // SMA crossover logic - Both conditions lead to CALL (this appears to be a logical flaw)
  if (fastValue > slowValue) {
    // Uptrend - Buy CALL
    this.waitingForSignal = true;
    
    // Wait 1 second for confirmation
    setTimeout(() => {
      // Double-check the signal
      const currentFast = this.fastSMA.calculate(this.getLatestTick().close);
      const currentSlow = this.slowSMA.calculate(this.getLatestTick().close);
      
      if (currentFast > currentSlow) {
        // Signal confirmed - Buy CALL
        const stakeAmount = this.calculateStake();
        this.buyCall(tick.symbol, stakeAmount, this.ticksDuration);
      }
      this.waitingForSignal = false;
    }, 1000);
  } 
  else if (fastValue < slowValue) {
    // Downtrend - Still Buy CALL (logical flaw in the strategy)
    this.waitingForSignal = true;
    
    // Wait 1 second for confirmation
    setTimeout(() => {
      // Double-check the signal
      const currentFast = this.fastSMA.calculate(this.getLatestTick().close);
      const currentSlow = this.slowSMA.calculate(this.getLatestTick().close);
      
      if (currentFast < currentSlow) {
        // Signal confirmed - But still buying CALL (logical flaw)
        const stakeAmount = this.calculateStake();
        this.buyCall(tick.symbol, stakeAmount, this.ticksDuration);
      }
      this.waitingForSignal = false;
    }, 1000);
  }
}

function calculateStake() {
  // Extremely aggressive Martingale recovery system
  if (this.lastTradeResult && this.lastTradeResult.profit < 0) {
    if (this.totalProfit >= -1) {
      // Small overall loss - use fixed stake
      return 0.35;
    } else {
      // Significant loss - extremely aggressive recovery (1.07 multiplier)
      return this.totalProfit * -1.07;
    }
  }
  
  // Default or after win
  return this.initialStake;
}

function onTradeResult(result) {
  this.lastTradeResult = result;
  this.totalProfit += result.profit;
  
  // Log the result
  console.log("Trade completed: " + result.type + ", Profit: " + result.profit + ", Total: " + this.totalProfit);
}
`
};

// Código para o NexusBot
const nexusBotCode = `// NexusBot - Análise Sequencial de Ticks para Rise/Fall com Venda Antecipada
function initialize() {
  // Parâmetros da estratégia
  this.initialStake = 0.35;        // Valor inicial da ordem
  this.stopLoss = 10.0;            // Limite de perda máximo
  this.targetProfit = 5.0;         // Meta de lucro
  this.contractDuration = 5;       // Duração do contrato em minutos
  
  // Variáveis de rastreamento
  this.totalProfit = 0;
  this.lastTradeResult = null;
  this.tickHistory = [];
}

function onTick(tick) {
  // Verificar se atingimos condições de parada
  if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
    this.stop("Meta atingida: " + this.totalProfit);
    return;
  }
  
  // Adicionar o tick atual ao histórico
  this.tickHistory.push(tick.close);
  
  // Manter apenas os últimos 9 ticks
  if (this.tickHistory.length > 9) {
    this.tickHistory.shift();
  }
  
  // Precisamos de pelo menos 5 ticks para análise
  if (this.tickHistory.length < 5) {
    return;
  }
  
  // Analisar a sequência de ticks
  const tick1 = this.tickHistory[this.tickHistory.length - 1]; // Tick mais recente
  const tick2 = this.tickHistory[this.tickHistory.length - 2];
  const tick3 = this.tickHistory[this.tickHistory.length - 3];
  const tick4 = this.tickHistory[this.tickHistory.length - 4];
  const tick5 = this.tickHistory[this.tickHistory.length - 5];
  
  // Sinal de compra PUT (Desce)
  if (tick5 > tick4 && tick4 > tick3 && tick3 > tick2 && tick1 < tick2) {
    // Sequência de alta seguida por uma possível reversão
    const stakeAmount = this.calculateStake();
    this.buyPut(tick.symbol, stakeAmount, this.contractDuration * 60); // Converter minutos para segundos
    
    // Registrar a operação
    console.log("Sinal PUT detectado. Stake: " + stakeAmount);
  }
  // Sinal de compra CALL (Sobe)
  else if (tick5 < tick4 && tick4 < tick3 && tick3 < tick2 && tick1 > tick2) {
    // Sequência de baixa seguida por uma possível reversão
    const stakeAmount = this.calculateStake();
    this.buyCall(tick.symbol, stakeAmount, this.contractDuration * 60); // Converter minutos para segundos
    
    // Registrar a operação
    console.log("Sinal CALL detectado. Stake: " + stakeAmount);
  }
  else {
    // Nenhuma sequência identificada, aguardar
    setTimeout(() => {
      // Reanalisar após 3.8 segundos
      this.analyzeAgain();
    }, 3800);
  }
}

function analyzeAgain() {
  // Função para reanálise após espera
  console.log("Reanalisando sequência de ticks...");
  // A lógica real seria executada no próximo onTick
}

function checkSell(contract) {
  // Verificar se o contrato está disponível para venda
  if (contract.canBeSold) {
    // Calcular o lucro atual
    const currentProfit = contract.profit;
    const sellThreshold = (contract.buyPrice / 100) * 5; // 5% do valor da aposta
    
    // Vender se o lucro for maior que o limite
    if (currentProfit > sellThreshold) {
      this.sellContract(contract.id);
      console.log("Contrato vendido antecipadamente. Lucro: " + currentProfit);
    }
  }
}

function calculateStake() {
  // Sistema Martingale específico
  if (this.lastTradeResult && this.lastTradeResult.profit < 0) {
    if (this.totalProfit >= -1.4) {
      // Pequenas perdas - usar stake fixo
      return 0.35;
    } else {
      // Grandes perdas - recuperação com fator 0.35
      return this.totalProfit * -0.35;
    }
  }
  
  // Padrão ou após vitória
  return this.initialStake;
}

function onTradeResult(result) {
  this.lastTradeResult = result;
  this.totalProfit += result.profit;
  
  // Registrar o resultado
  console.log("Operação concluída: " + result.type + ", Lucro: " + result.profit + ", Total: " + this.totalProfit);
}
`;

// Bot mock data
export const bots: Bot[] = [
  {
    id: 'wolf-bot',
    name: 'Wolf Bot',
    description: 'Estrategia basada en el análisis de volatilidad y confirmación de tendencia para operar en mercados de alta fluctuación.',
    strategy: 'Análisis de Volatilidad',
    accuracy: 83.9,
    operations: 1500,
    imageUrl: '', // Replace with actual image if available
    createdAt: '2024-07-26',
    updatedAt: '2024-07-26',
    version: '1.0',
    author: 'Equipo de Análisis',
    profitFactor: 2.1,
    expectancy: 35.5,
    drawdown: 12.3,
    riskLevel: 3, // Medio
    tradedAssets: ['Mini-Índice', 'Mini-Dólar'],
    code: `// Estrategia de Wolf Bot
function initialize() {
    // Configuración inicial
    this.volatilityThreshold = 0.5; // Umbral de volatilidad
    this.trendIndicator = EMA(20);    // Indicador de tendencia
}

function onTick(tick) {
    const currentPrice = tick.close;
    const trendValue = this.trendIndicator.calculate(currentPrice);
    
    // Lógica de compra
    if (currentPrice > trendValue && calculateVolatility() > this.volatilityThreshold) {
        if (!this.position) {
            this.buy(tick.symbol, 1);
        }
    }
    
    // Lógica de venta
    if (currentPrice < trendValue) {
        if (this.position > 0) {
            this.sell(tick.symbol, 1);
        }
    }
}

function calculateVolatility() {
    // Simulación del cálculo de volatilidad
    return Math.random();
}`,
    usageInstructions: `Para usar el Wolf Bot, configúralo en un gráfico de 5 minutos en los activos Mini-Índice o Mini-Dólar.\nAsegúrate de que el capital mínimo recomendado esté disponible y ajusta el tamaño del lote según tu gestión de riesgo.\nEl bot funciona mejor en períodos de alta volatilidad, generalmente en la apertura del mercado.\nEnlace de descarga: https://drive.google.com/file/d/18e3irMH35z2UUvjqA4ddS-dHKugOMTG9/view?usp=sharing`,
    isFavorite: false,
    downloadUrl: 'https://drive.google.com/file/d/18e3irMH35z2UUvjqA4ddS-dHKugOMTG9/view?usp=sharing',
  },
  {
    id: "8",    name: "OptinTrade",    description: "Bot designed for Synthetic Indices (R_100) using SMA crossover to identify short-term trends and execute Run High/Low contracts with a specialized Martingale recovery system.",    strategy: "Seguidor de Tendência",    accuracy: 72,
    operations: 632, // Changed from downloads to operations
    imageUrl: "",
    createdAt: "2024-01-10",
    updatedAt: "2024-05-01",
    version: "1.3.2",
    author: "TrendTech Trading",
    profitFactor: 1.6,
    expectancy: 0.38,
    drawdown: 25,
    riskLevel: 7,
    tradedAssets: ["R_100"],
    code: strategyCode.smaTrendRunner,
    usageInstructions: `Acesse a plataforma\nClique aqui para acessar a plataforma Deriv\n@https://track.deriv.be/_XZsgLOqstMrrhBvO3lYd_WNd7ZgqdRLk/1/\n\nFaça login na sua conta\nFaça login na sua conta Deriv (Demo ou Real).\n\nImporte o robô\nNo menu superior, clique em "Importar" (ou "Load" no Binary Bot).\n\nCarregue o arquivo\nLocalize o arquivo .xml do robô Optin Trade no seu computador e carregue-o.\n\nVerifique o carregamento\nO robô aparecerá na área de trabalho da plataforma.\n\nConfigure os parâmetros\nAntes de iniciar, revise e ajuste as configurações (Meta Lucro, Limite Perdas, Valor Inicial da Ordem, Quantidade Tique-Taques) conforme sua gestão de risco.\n\nExecute o robô\nClique no botão "Executar" (ou "Run") para iniciar o robô.`,
    isFavorite: false,
    ranking: 3
  },
  {
    id: "9",
    name: "SMA Trend Follower",
    description: "Bot diseñado para Índices Sintéticos (R_100) que utiliza el cruce de SMA para identificar tendencias de corto plazo y ejecutar contratos Higher/Lower con un sistema especializado de recuperación Martingale.",
    strategy: "Seguidor de Tendencia",
    accuracy: 78,
    operations: 487, // Changed from downloads to operations
    imageUrl: "",
    createdAt: "2024-02-15",
    updatedAt: "2024-05-07",
    version: "1.2.1",
    author: "TrendTech Trading",
    profitFactor: 1.7,
    expectancy: 0.42,
    drawdown: 22,
    riskLevel: 6,
    tradedAssets: ["R_100"],
    code: strategyCode.smaTrendFollower,
    usageInstructions: `Acceda a la plataforma\nHaga clic aquí para acceder a la plataforma Deriv\n@https://track.deriv.be/_XZsgLOqstMrrhBvO3lYd_WNd7ZgqdRLk/1/\n\nInicie sesión en su cuenta\nInicie sesión en su cuenta Deriv (Demo o Real).\n\nImporte el robot\nEn el menú superior, haga clic en "Importar" (o "Load" en Binary Bot).\n\nCargue el archivo\nLocalice el archivo .xml del robot SMA Trend Follower en su computadora y cárguelo.\n\nVerifique la carga\nEl robot aparecerá en el área de trabajo de la plataforma.\n\nConfigure los parámetros\nAntes de iniciar, revise y ajuste las configuraciones (Meta Ganancia, Límite Pérdidas, Valor Inicial de la Orden, Cantidad de Ticks) según su gestión de riesgo.\n\nEjecute el robot\nHaga clic en el botón "Ejecutar" (o "Run") para iniciar el robot.`,
    isFavorite: false,
    ranking: 1
  },
  {
    id: "10",
    name: "Hunter Pro",
    description: "Bot que combina análise do penúltimo dígito do preço tick (filtrado para 7) com estratégia de cruzamento de SMAs para operações Rise/Fall em índices aleatórios, com recuperação Martingale agressiva.",
    strategy: "Digital Filter",
    accuracy: 45,
    operations: 312, // Changed from downloads to operations
    imageUrl: "",
    createdAt: "2024-03-15",
    updatedAt: "2024-05-12",
    version: "1.0.0",
    author: "HunterTech Trading",
    profitFactor: 1.5,
    expectancy: 0.38,
    drawdown: 30,
    riskLevel: 8,
    tradedAssets: ["R_100"],
    code: strategyCode.hunterPro,
    usageInstructions: `Acesse a plataforma\nClique aqui para acessar a plataforma Deriv\n@https://track.deriv.be/_XZsgLOqstMrrhBvO3lYd_WNd7ZgqdRLk/1/\n\nFaça login na sua conta\nFaça login na sua conta Deriv (Demo ou Real).\n\nImporte o robô\nNo menu superior, clique em "Importar" (ou "Load" no Binary Bot).\n\nCarregue o arquivo\nLocalize o arquivo .xml do robô Hunter Pro no seu computador e carregue-o.\n\nVerifique o carregamento\nO robô aparecerá na área de trabalho da plataforma.\n\nConfigure os parâmetros\nAntes de iniciar, revise e ajuste as configurações (Meta Lucro, Limite Perdas, Valor Inicial da Ordem, Quantidade Tique-Taques) conforme sua gestão de risco.\n\nExecute o robô\nClique no botão "Executar" (ou "Run") para iniciar o robô.`,
    isFavorite: false,
    ranking: 4
  },
  {
    id: "11",
    name: "Quantum Bot",
    description: "Bot con estrategia de alternancia simple de dirección. Opera en el mercado de índices sintéticos (R_100) con contratos de 1 tick de duración. Sem Martingale.",
    strategy: "Sin Martingale",
    accuracy: 79.4,
    operations: 245, // Changed from downloads to operations
    imageUrl: "",
    createdAt: "2024-04-18",
    updatedAt: "2024-05-13",
    version: "1.0.0",
    author: "QuantumTech Trading",
    profitFactor: 1.4,
    expectancy: 0.35,
    drawdown: 28,
    riskLevel: 7,
    tradedAssets: ["R_100"],
    code: strategyCode.quantumBot,
    usageInstructions: `Acceda a la plataforma\nHaga clic aquí para acceder a la plataforma Deriv\n@https://track.deriv.be/_XZsgLOqstMrrhBvO3lYd_WNd7ZgqdRLk/1/\n\nInicie sesión en su cuenta\nInicie sesión en su cuenta Deriv (Demo o Real).\n\nImporte el robot\nEn el menú superior, haga clic en \"Importar\" (o \"Load\" en Binary Bot).\n\nCargue el archivo\nLocalice el archivo .xml del robot Quantum Bot en su computadora y cárguelo.\n\nVerifique la carga\nEl robot aparecerá en el área de trabajo de la plataforma.\n\nConfigure los parámetros\nAntes de iniciar, revise y ajuste las configuraciones (Meta Ganancia, Límite Pérdidas, Valor Inicial de la Orden, Cantidad de Ticks) según su gestión de riesgo.\n\nEjecute el robot\nHaga clic en el botón \"Ejecutar\" (o \"Run\") para iniciar el robot.`,
    isFavorite: false,
    ranking: 2
  },
  {
    id: "12",
    name: "XBot",
    description: "Bot que combina análise específica do dígito '7' no preço do tick com estratégia de cruzamento de SMAs para operações Rise/Fall, mas sempre comprando CALL. Utiliza um sistema Martingale extremamente agressivo com fator -1.07.",
    strategy: "Digital Filter",
    accuracy: 40,
    operations: 178,
    imageUrl: "",
    createdAt: "2024-05-12",
    updatedAt: "2024-05-13",
    version: "1.0.0",
    author: "XTech Trading",
    profitFactor: 1.2,
    expectancy: 0.25,
    drawdown: 35,
    riskLevel: 9,
    tradedAssets: ["R_100"],
    code: strategyCode.xbot,
    usageInstructions: `Acesse a plataforma\nClique aqui para acessar a plataforma Deriv\n@https://track.deriv.be/_XZsgLOqstMrrhBvO3lYd_WNd7ZgqdRLk/1/\n\nFaça login na sua conta\nFaça login na sua conta Deriv (Demo ou Real).\n\nImporte o robô\nNo menu superior, clique em "Importar" (ou "Load" no Binary Bot).\n\nCarregue o arquivo\nLocalize o arquivo .xml do robô XBot no seu computador e carregue-o.\n\nVerifique o carregamento\nO robô aparecerá na área de trabalho da plataforma.\n\nConfigure os parâmetros\nAntes de iniciar, revise e ajuste as configurações (Meta Lucro, Limite Perdas, Valor Inicial da Ordem, Quantidade Tique-Taques) conforme sua gestão de risco.\n\nExecute o robô\nClique no botão "Executar" (ou "Run") para iniciar o robô.`,
    isFavorite: false,
    ranking: 5
  },
  {
    id: "13",
    name: "AlphaBot",
    description: "Estrategia automatizada para el Índice Sintético R_100 en Deriv. Opera con contratos de Dígitos Over/Under, basando sus predicciones en el análisis de los últimos 10 dígitos de ticks anteriores (convertidos a un patrón binario). Utiliza un Martingale agresivo para recuperación de pérdidas.",
    strategy: "Digital Filter",
    accuracy: 48,
    operations: 215,
    imageUrl: "",
    createdAt: "2024-05-15",
    updatedAt: "2024-05-20",
    version: "1.0.0",
    author: "AlphaTech Trading",
    profitFactor: 1.3,
    expectancy: 0.32,
    drawdown: 32,
    riskLevel: 8,
    tradedAssets: ["R_100"],
    code: strategyCode.contrarian,
    usageInstructions: `Acceda a la plataforma\nHaga clic aquí para acceder a la plataforma Deriv\n@https://track.deriv.be/_XZsgLOqstMrrhBvO3lYd_WNd7ZgqdRLk/1/\n\nInicie sesión en su cuenta\nInicie sesión en su cuenta Deriv (Demo o Real).\n\nImporte el robot\nEn el menú superior, haga clic en "Importar" (o "Load" en Binary Bot).\n\nCargue el archivo\nLocalice el archivo .xml del robot AlphaBot en su computadora y cárguelo.\n\nVerifique la carga\nEl robot aparecerá en el área de trabajo de la plataforma.\n\nConfigure los parámetros\nAntes de iniciar, revise y ajuste las configuraciones (Meta Ganancia, Límite Pérdidas, Valor Inicial de la Orden, Cantidad de Ticks) según su gestión de riesgo.\n\nEjecute el robot\nHaga clic en el botón "Ejecutar" (o "Run") para iniciar el robot.`,
    isFavorite: false,
    ranking: 3
  },
  {
    id: "14",
    name: "NexusBot",
    description: "O NexusBot opera no Índice Sintético RDBEAR (Random Daily Bear Market Index) da Deriv. Sua estratégia é baseada na análise sequencial de múltiplos ticks anteriores para identificar um padrão de alta ou baixa, realizando operações Rise/Fall (Sobe/Desce) com duração de 5 minutos. Possui um sistema de venda antecipada e um Martingale específico para recuperação de perdas.",
    strategy: "Análise Sequencial",
    accuracy: 79,
    operations: 185,
    imageUrl: "",
    createdAt: "2024-05-25",
    updatedAt: "2024-05-25",
    version: "1.0.0",
    author: "NexusTech Trading",
    profitFactor: 1.4,
    expectancy: 0.36,
    drawdown: 28,
    riskLevel: 6,
    tradedAssets: ["RDBEAR"],
    code: nexusBotCode,
    usageInstructions: `Acesse a plataforma\nClique aqui para acessar a plataforma Deriv\n@https://drive.google.com/file/d/1y2EkNlVY3BSDbDk_4zrprEIs-gSN8x-V/view?usp=sharing\n\nFaça login na sua conta\nFaça login na sua conta Deriv (Demo ou Real).\n\nImporte o robô\nNo menu superior, clique em "Importar" (ou "Load" no Binary Bot).\n\nCarregue o arquivo\nLocalize o arquivo .xml do robô NexusBot no seu computador e carregue-o.\n\nVerifique o carregamento\nO robô aparecerá na área de trabalho da plataforma.\n\nConfigure os parâmetros\nAntes de iniciar, revise e ajuste as configurações (Meta Lucro, Limite Perdas, Valor Inicial da Ordem, Quantidade Tique-Taques) conforme sua gestão de risco.\n\nExecute o robô\nClique no botão "Executar" (ou "Run") para iniciar o robô.`,
    isFavorite: false,
    ranking: 4
  },
  {
    id: "15",
    name: "Sniper Bot",
    description: "Bot que opera en el Índice Sintético de Volatilidad Continua 1 Segundo (1HZ100V) en Deriv. Utiliza una combinación de indicadores técnicos simples: una Media Móvil Simple (SMA) y el Índice de Fuerza Relativa (RSI) para identificar oportunidades de compra Rise/Fall (Sube/Baja) en operaciones de 1 tick. Incorpora un sistema de Martingala para la recuperación de pérdidas. Diseñado para operar con una banca recomendada de $50 USD, con una gestión de riesgo conservadora: Stop Loss de $10 (20% de la banca) y Stop Win de $2.5 (5% de la banca), utilizando un Win Amount base de $0.35.",
    strategy: "Análisis Técnico",
    accuracy: 80,
    operations: 0,
    imageUrl: "",
    createdAt: "2024-05-30",
    updatedAt: "2024-05-30",
    version: "1.0.0",
    author: "SniperTech Trading",
    profitFactor: 1.8,
    expectancy: 0.45,
    drawdown: 25,
    riskLevel: 7,
    tradedAssets: ["1HZ100V"],
    code: `// Sniper Bot - SMA & RSI Strategy with Martingale
function initialize() {
  // Strategy parameters
  this.initialAmount = 0.35;      // Initial stake amount (Win Amount base)
  this.stopLoss = 10.0;           // Max acceptable loss (20% of $50 recommended bank)
  this.targetProfit = 2.5;        // Expected profit (5% of $50 recommended bank)
  this.martingleLevel = 1.05;     // Multiplier for stake after loss
  
  // Technical indicators
  this.sma = SMA(3);              // 3-tick SMA
  this.rsi = RSI(2);              // 2-tick RSI (not used in entry logic)
  
  // Tracking variables
  this.totalProfit = 0;
  this.currentStake = this.initialAmount;
}

function onTick(tick) {
  // Check if we've reached stop conditions
  if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
    this.stop("Target reached: " + this.totalProfit);
    return;
  }
  
  // Calculate indicators
  const smaValue = this.sma.calculate(tick.close);
  const rsiValue = this.rsi.calculate(tick.close); // Calculated but not used
  
  // CALL (Rise) logic
  if (tick.close > smaValue) {
    this.buyCall(tick.symbol, this.currentStake, 1); // 1 tick duration
  }
  
  // Recalculate indicators for PUT entry
  const newSmaValue = this.sma.calculate(tick.close);
  const newRsiValue = this.rsi.calculate(tick.close); // Calculated but not used
  
  // PUT (Fall) logic
  if (tick.close < newSmaValue) {
    this.buyPut(tick.symbol, this.currentStake, 1); // 1 tick duration
  }
}

function onTradeResult(result) {
  if (result.profit > 0) {
    // Winning trade
    this.totalProfit += result.profit;
    this.currentStake = this.initialAmount; // Reset to initial stake
  } else {
    // Losing trade
    this.totalProfit += result.profit;
    this.currentStake *= this.martingleLevel; // Increase stake by 5%
  }
  
  // Log the result
  console.log("Trade completed: " + result.type + ", Profit: " + result.profit + ", Total: " + this.totalProfit);
}`,
    usageInstructions: `Acceda a la plataforma\nHaga clic aquí para acceder a la plataforma Deriv\n@https://drive.google.com/file/d/1IXDg2wcI5w9rxymwVID6aycJ8QU8tgdR/view?usp=sharing\n\nInicie sesión en su cuenta\nInicie sesión en su cuenta Deriv (Demo o Real).\n\nImporte el robot\nEn el menú superior, haga clic en \"Importar\" (o \"Load\" en Binary Bot).\n\nCargue el archivo\nLocalice el archivo .xml del robot Sniper Bot en su computadora y cárguelo.\n\nVerifique la carga\nEl robot aparecerá en el área de trabajo de la plataforma.\n\nGestión de Riesgo Inteligente\n\n🎯 Configurando tu Meta de Ganancia (Stop Win):\n\nEl robot utiliza un \"Monto de Ganancia\" (Win Amount) base de $0.35 USD. La ganancia neta por operación exitosa será un poco menor (debido al porcentaje de pago ~90-95%).\n\n💰 Opciones de Meta de Ganancia (Stop Win) según tu banca:\n\n• Banca Recomendada: $50 USD\n\n• Opción Conservadora (2-5% de la banca):\n  - Stop Win: $1.00 a $2.50 USD\n  - Requiere 3-8 ganancias netas consecutivas\n\n• Opción Moderada (5-10% de la banca):\n  - Stop Win: $2.50 a $5.00 USD\n  - Requiere 8-16 ganancias netas\n\n• Basado en Ganancia por Operación (~$0.30 neto):\n  - $1.50 = ~5 ganancias netas\n  - $3.00 = ~10 ganancias netas\n  - $5.00 = ~16-17 ganancias netas\n\n⚠️ Consideraciones Importantes:\n• Relación Stop Win/Loss: Mantén tu Stop Win igual o menor que tu Stop Loss\n• Frecuencia: El bot opera en 1 tick, permitiendo alcanzar metas más pequeñas rápidamente\n• Riesgo: Nunca establezcas metas que requieran tiempo excesivo de operación\n\n⚙️ Configure los parámetros\nAntes de iniciar, revise y ajuste las configuraciones:\n• Win Amount (Valor Inicial): $0.35 USD\n• Stop Loss: $10.00 USD (20% de banca de $50)\n• Stop Win: $2.50 USD (5% de banca de $50)\n\nEjecute el robot\nHaga clic en el botón \"Ejecutar\" (o \"Run\") para iniciar el robot.\n\n⚠️ IMPORTANTE: SIEMPRE PRUEBE EN CUENTA DEMO PRIMERO\nRecuerde que el Win Amount es la apuesta base tras victoria. Su Meta de Ganancia (Stop Win) es el objetivo acumulado para detener la sesión.`,
    isFavorite: false,
    ranking: 0
  },
  {
    id: 'bk-bot-1-0',
    name: 'BK BOT 1.0',
    description: 'Bot especializado em análise de dígitos com sistema de pausa por risco e martingale adaptativo. Estratégia baseada em análise de dígitos para operações em índices sintéticos com gestão inteligente de risco.',
    strategy: 'Análise de Dígitos',
    accuracy: 78.5,
    operations: 1245,
    imageUrl: '',
    createdAt: '2024-12-19',
    updatedAt: '2024-12-19',
    version: '1.0.0',
    author: 'BK Trading Systems',
    profitFactor: 1.8,
    expectancy: 0.42,
    drawdown: 18.5,
    riskLevel: 5,
    tradedAssets: ['R_100', 'R_75', 'R_50'],
    code: `// BK BOT 1.0 - Estratégia baseada em análise de dígitos
function initialize() {
    // Variáveis de estado do bot
    this.stake_inicial = 1.0;
    this.stop_loss = 50.0;
    this.stop_win = 20.0;
    
    // Sistema de pausa por risco
    this.max_perdas_consecutivas = 3;
    this.perdas_consecutivas = 0;
    this.em_pausa = false;
    this.tempo_pausa = 30000; // 30 segundos
    
    // Martingale adaptativo
    this.multiplicador_martingale = 2.2;
    this.stake_atual = this.stake_inicial;
    
    // Controle de lucro/prejuízo
    this.lucro_total = 0;
    this.operacoes_realizadas = 0;
}

function onTick(tick) {
    // Verificar condições de parada
    if (this.lucro_total <= -this.stop_loss || this.lucro_total >= this.stop_win) {
        this.stop("Meta atingida: " + this.lucro_total);
        return;
    }
    
    // Verificar se está em pausa
    if (this.em_pausa) {
        return;
    }
    
    // Análise de dígitos
    const preco_str = tick.close.toString();
    const ultimo_digito = parseInt(preco_str.slice(-1));
    const penultimo_digito = parseInt(preco_str.slice(-2, -1));
    
    // Lógica de entrada baseada em dígitos
    if (this.analisarPadrao(ultimo_digito, penultimo_digito)) {
        const direcao = this.determinarDirecao(ultimo_digito, penultimo_digito);
        
        if (direcao === "CALL") {
            this.buyCall(tick.symbol, this.stake_atual, 5); // 5 ticks
        } else if (direcao === "PUT") {
            this.buyPut(tick.symbol, this.stake_atual, 5); // 5 ticks
        }
        
        this.operacoes_realizadas++;
    }
}

function analisarPadrao(ultimo, penultimo) {
    // Padrões favoráveis para entrada
    const soma = ultimo + penultimo;
    const diferenca = Math.abs(ultimo - penultimo);
    
    // Condições de entrada
    return (soma >= 8 && soma <= 12) || (diferenca >= 3 && diferenca <= 6);
}

function determinarDirecao(ultimo, penultimo) {
    // Lógica para determinar direção
    if (ultimo > penultimo) {
        return ultimo % 2 === 0 ? "CALL" : "PUT";
    } else {
        return penultimo % 2 === 0 ? "PUT" : "CALL";
    }
}

function onTradeResult(result) {
    this.lucro_total += result.profit;
    
    if (result.profit > 0) {
        // Operação vencedora
        this.perdas_consecutivas = 0;
        this.stake_atual = this.stake_inicial; // Reset stake
        this.em_pausa = false;
    } else {
        // Operação perdedora
        this.perdas_consecutivas++;
        
        // Aplicar martingale
        this.stake_atual *= this.multiplicador_martingale;
        
        // Verificar se deve entrar em pausa
        if (this.perdas_consecutivas >= this.max_perdas_consecutivas) {
            this.em_pausa = true;
            this.perdas_consecutivas = 0;
            this.stake_atual = this.stake_inicial;
            
            // Sair da pausa após tempo determinado
            setTimeout(() => {
                this.em_pausa = false;
            }, this.tempo_pausa);
        }
    }
    
    console.log("Operação: " + result.type + ", Lucro: " + result.profit + ", Total: " + this.lucro_total);
}`,
    usageInstructions: `Acesse a plataforma
Clique aqui para acessar a plataforma Deriv
@https://track.deriv.be/_XZsgLOqstMrrhBvO3lYd_WNd7ZgqdRLk/1/

Faça login na sua conta
Faça login na sua conta Deriv (Demo ou Real).

Importe o robô
No menu superior, clique em "Importar" (ou "Load" no Binary Bot).

Carregue o arquivo
Localize o arquivo .xml do robô BK BOT 1.0 no seu computador e carregue-o.

Verifique o carregamento
O robô aparecerá na área de trabalho da plataforma.

Configure os parâmetros
Antes de iniciar, revise e ajuste as configurações:
• Stake Inicial: $1.00 USD
• Stop Loss: $50.00 USD
• Stop Win: $20.00 USD
• Multiplicador Martingale: 2.2
• Máximo de perdas consecutivas: 3

Execute o robô
Clique no botão "Executar" (ou "Run") para iniciar o robô.

⚠️ IMPORTANTE: SEMPRE TESTE EM CONTA DEMO PRIMEIRO
O bot utiliza sistema de martingale adaptativo e pausa por risco para proteção do capital.`,
    isFavorite: false,
    downloadUrl: 'https://drive.google.com/file/d/14-IUlPjA2N5Pi-_CpJ5K-YLKUiGni8kR/view?usp=sharing',
    ranking: 0
  },
  {
    id: "16",
    name: "Bot A.I",
    description: "Bot especializado en la estrategia DigitDiffer para operar en índices sintéticos. Analiza el último dígito de cada tick y ejecuta operaciones cuando detecta patrones estadísticos favorables, buscando diferenciar el dígito final del precio respecto al anterior. Ideal para quienes buscan una operativa rápida y basada en probabilidades matemáticas.",
    strategy: "DigitDiffer",
    accuracy: 85.8,
    operations: 7898,
    imageUrl: "",
    createdAt: "2024-06-10",
    updatedAt: "2024-06-10",
    version: "1.0.0",
    author: "A.I. Trading",
    profitFactor: 1.3,
    expectancy: 0.30,
    drawdown: 27,
    riskLevel: 6,
    tradedAssets: ["R_100"],
    code: "// Estrategia DigitDiffer\n// El bot analiza el último dígito de cada tick y ejecuta operaciones Digit Differ cuando detecta patrones estadísticos favorables.",
    usageInstructions: `Accede a la plataforma\nHaz clic aquí para descargar el bot\n@https://drive.google.com/file/d/1IXDg2wcI5w9rxymwVID6aycJ8QU8tgdR/view?usp=sharing\n\nInicia sesión en tu cuenta Deriv (Demo o Real).\nImporta el archivo .xml del bot Bot A.I en la plataforma Binary Bot o Deriv Bot.\nConfigura los parámetros según tu gestión de riesgo.\nHaz clic en 'Ejecutar' para iniciar el bot.`,
    isFavorite: false,
    ranking: 6
  },
  {
    id: 'apalancamiento-100x',
    name: 'Apalancamiento 100X',
    description: 'Bot especializado en operaciones apalancadas con factor 100x, diseñado para mercados de alta volatilidad. Ideal para traders experimentados que buscan maximizar ganancias en cortos períodos, utilizando estrategias avanzadas de gestión de riesgo y protección contra liquidaciones.',
    strategy: 'Apalancamiento Extremo',
    accuracy: 86.7,
    operations: 0,
    imageUrl: '',
    createdAt: '2024-07-26',
    updatedAt: '2024-07-26',
    version: '1.0',
    author: 'Equipo de Análisis',
    profitFactor: 3.2,
    expectancy: 42.1,
    drawdown: 28.5,
    riskLevel: 10, // Máximo
    tradedAssets: ['Futuros', 'Cripto', 'Forex'],
    code: `// Estrategia de Apalancamiento 100X\nfunction initialize() {\n    // Configuración inicial\n    this.leverage = 100; // Apalancamiento\n    this.riskControl = true;\n}\n\nfunction onTick(tick) {\n    // Lógica de trading apalancado\n    if (this.riskControl && tick.volatility > 0.8) {\n        this.buy(tick.symbol, 1, this.leverage);\n    }\n    if (this.position && tick.price < this.stopLoss) {\n        this.sell(tick.symbol, 1);\n    }\n}\n`,
    usageInstructions: `ATENCIÓN: Este bot utiliza apalancamiento extremo (100x).\n\nNota de Alerta: Las operaciones apalancadas implican un alto riesgo de pérdida total del capital invertido. Recomendado solo para traders experimentados.\n\nAntes de usar:\n- Asegúrate de comprender completamente los riesgos del apalancamiento.\n- Utiliza siempre stop loss y limita tu exposición.\n- Nunca inviertas más de lo que puedes permitirte perder.\n\nPara usar el Bot del Apalancamiento 100X, configúralo en activos de Futuros, Cripto o Forex en plataformas compatibles.\n\nEnlace de descarga: https://drive.google.com/file/d/15CKip4R6gzhuV050eGMpnINjI6NsTlxS/view?usp=sharing`,
    isFavorite: false,
    downloadUrl: 'https://drive.google.com/file/d/15CKip4R6gzhuV050eGMpnINjI6NsTlxS/view?usp=sharing',
    ranking: 1
  },
  {
    id: 'factor50x',
    name: 'Factor50X',
    description: 'Bot avanzado de apalancamiento 50x especializado en análisis de momentum y volatilidad. Combina indicadores técnicos sofisticados con gestión inteligente de riesgo para maximizar oportunidades en mercados de alta frecuencia. Diseñado para traders que buscan un equilibrio entre rentabilidad y control de riesgo.',
    strategy: 'Momentum & Volatilidad',
    accuracy: 87.2,
    operations: 0,
    imageUrl: '',
    createdAt: '2024-12-19',
    updatedAt: '2024-12-19',
    version: '1.0.0',
    author: 'Factor Trading Systems',
    profitFactor: 2.8,
    expectancy: 38.5,
    drawdown: 24.2,
    riskLevel: 9,
    tradedAssets: ['R_100', 'R_75', 'Volatility_Index'],
    code: `// Factor50X - Momentum & Volatility Strategy\nfunction initialize() {\n    // Configuración de apalancamiento\n    this.leverage = 50;\n    this.initialStake = 0.50;\n    this.maxDrawdown = 25.0;\n    \n    // Indicadores técnicos\n    this.ema = EMA(8);\n    this.rsi = RSI(14);\n    this.volatility = ATR(10);\n    \n    // Control de riesgo\n    this.totalProfit = 0;\n    this.consecutiveLosses = 0;\n}\n\nfunction onTick(tick) {\n    // Calcular indicadores\n    const emaValue = this.ema.calculate(tick.close);\n    const rsiValue = this.rsi.calculate(tick.close);\n    const volatilityValue = this.volatility.calculate(tick);\n    \n    // Condiciones de entrada\n    const bullishMomentum = tick.close > emaValue && rsiValue < 70 && volatilityValue > 0.5;\n    const bearishMomentum = tick.close < emaValue && rsiValue > 30 && volatilityValue > 0.5;\n    \n    // Ejecutar operaciones\n    if (bullishMomentum && this.consecutiveLosses < 3) {\n        this.buyCall(tick.symbol, this.calculateStake(), 5); // 5 ticks\n    } else if (bearishMomentum && this.consecutiveLosses < 3) {\n        this.buyPut(tick.symbol, this.calculateStake(), 5); // 5 ticks\n    }\n}\n\nfunction calculateStake() {\n    // Ajustar stake basado en pérdidas consecutivas\n    return this.initialStake * Math.pow(1.2, this.consecutiveLosses);\n}\n\nfunction onTradeResult(result) {\n    this.totalProfit += result.profit;\n    \n    if (result.profit > 0) {\n        this.consecutiveLosses = 0;\n    } else {\n        this.consecutiveLosses++;\n    }\n    \n    // Stop loss por drawdown\n    if (this.totalProfit <= -this.maxDrawdown) {\n        this.stop(\"Drawdown máximo alcanzado\");\n    }\n}`,
    usageInstructions: `Acceda a la plataforma\nHaga clic aquí para descargar Factor50X\n@https://drive.google.com/file/d/1FUH0Hf4rwVxhdt7L7M9o22pRn-uxON7v/view?usp=sharing\n\nInicie sesión en su cuenta\nInicie sesión en su cuenta Deriv (Demo o Real).\n\nImporte el robot\nEn el menú superior, haga clic en \"Importar\" (o \"Load\" en Binary Bot).\n\nCargue el archivo\nLocalice el archivo .xml del robot Factor50X en su computadora y cárguelo.\n\nVerifique la carga\nEl robot aparecerá en el área de trabajo de la plataforma.\n\nConfiguración Recomendada:\n• Stake Inicial: $0.50 USD\n• Stop Loss: $25.00 USD\n• Stop Win: $15.00 USD\n• Apalancamiento: 50x\n• Activos: R_100, R_75, Volatility Index\n\n⚠️ GESTIÓN DE RIESGO AVANZADA:\n• El bot incluye protección contra drawdown excesivo\n• Sistema de escalado inteligente de stakes\n• Límite de 3 pérdidas consecutivas antes de pausa\n• Análisis de volatilidad para filtrar señales\n\nEjecute el robot\nHaga clic en el botón \"Ejecutar\" (o \"Run\") para iniciar el robot.\n\n⚠️ IMPORTANTE: SIEMPRE PRUEBE EN CUENTA DEMO PRIMERO\nEste bot utiliza apalancamiento alto (50x). Recomendado para traders con experiencia en gestión de riesgo.`,
    isFavorite: false,
    downloadUrl: 'https://drive.google.com/file/d/1FUH0Hf4rwVxhdt7L7M9o22pRn-uxON7v/view?usp=sharing',
    ranking: 0
  },
  {
    id: 'scale-bot',
    name: 'Scale Bot',
    description: 'Bot especializado en estrategia de escalamiento progresivo para operaciones en índices sintéticos. Utiliza análisis de patrones de precio con sistema de entrada escalonada y gestión inteligente de riesgo. Ideal para traders que buscan un enfoque sistemático y controlado.',
    strategy: 'Escalamiento Progresivo',
    accuracy: 82.4,
    operations: 1856,
    imageUrl: '',
    createdAt: '2024-12-19',
    updatedAt: '2024-12-19',
    version: '1.0.0',
    author: 'Scale Trading Systems',
    profitFactor: 2.1,
    expectancy: 0.45,
    drawdown: 19.8,
    riskLevel: 6,
    tradedAssets: ['R_100', 'R_75', 'R_50'],
    code: `// Scale Bot - Estrategia de Escalamiento Progresivo
function initialize() {
    // Parámetros de la estrategia
    this.baseStake = 0.35;           // Stake base
    this.stopLoss = 15.0;            // Stop loss máximo
    this.targetProfit = 8.0;         // Meta de ganancia
    this.scaleMultiplier = 1.5;      // Multiplicador de escalamiento
    this.maxScaleLevels = 4;         // Máximo de niveles de escalamiento
    
    // Indicadores técnicos
    this.sma = SMA(10);              // Media móvil simple
    this.ema = EMA(5);               // Media móvil exponencial
    
    // Variables de control
    this.totalProfit = 0;
    this.currentScaleLevel = 0;
    this.lastTradeResult = null;
    this.entryPrice = 0;
    this.scalePositions = [];
}

function onTick(tick) {
    // Verificar condiciones de parada
    if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
        this.stop("Meta alcanzada: " + this.totalProfit);
        return;
    }
    
    // Calcular indicadores
    const smaValue = this.sma.calculate(tick.close);
    const emaValue = this.ema.calculate(tick.close);
    const currentPrice = tick.close;
    
    // Lógica de entrada inicial
    if (this.scalePositions.length === 0) {
        this.checkInitialEntry(tick, smaValue, emaValue);
    } else {
        // Verificar oportunidades de escalamiento
        this.checkScaleEntry(tick);
    }
}

function checkInitialEntry(tick, smaValue, emaValue) {
    // Condiciones para entrada inicial
    const bullishSignal = tick.close > smaValue && tick.close > emaValue && emaValue > smaValue;
    const bearishSignal = tick.close < smaValue && tick.close < emaValue && emaValue < smaValue;
    
    if (bullishSignal) {
        // Entrada CALL
        this.executeScale("CALL", tick.close, this.baseStake);
        this.entryPrice = tick.close;
    } else if (bearishSignal) {
        // Entrada PUT
        this.executeScale("PUT", tick.close, this.baseStake);
        this.entryPrice = tick.close;
    }
}

function checkScaleEntry(tick) {
    if (this.currentScaleLevel >= this.maxScaleLevels) {
        return; // Máximo de niveles alcanzado
    }
    
    const priceMovement = Math.abs(tick.close - this.entryPrice) / this.entryPrice;
    
    // Escalar si el precio se mueve contra nuestra posición
    if (priceMovement > 0.001 * (this.currentScaleLevel + 1)) { // 0.1% por nivel
        const lastPosition = this.scalePositions[this.scalePositions.length - 1];
        const newStake = this.baseStake * Math.pow(this.scaleMultiplier, this.currentScaleLevel);
        
        // Escalar en la misma dirección
        this.executeScale(lastPosition.direction, tick.close, newStake);
    }
}

function executeScale(direction, price, stake) {
    this.currentScaleLevel++;
    
    const position = {
        level: this.currentScaleLevel,
        direction: direction,
        price: price,
        stake: stake,
        timestamp: Date.now()
    };
    
    this.scalePositions.push(position);
    
    if (direction === "CALL") {
        this.buyCall("R_100", stake, 5); // 5 ticks
    } else {
        this.buyPut("R_100", stake, 5); // 5 ticks
    }
    
    console.log("Escalamiento nivel " + this.currentScaleLevel + ": " + direction + " con stake " + stake);
}

function onTradeResult(result) {
    this.lastTradeResult = result;
    this.totalProfit += result.profit;
    
    if (result.profit > 0) {
        // Operación ganadora - resetear escalamiento
        console.log("¡Operación ganadora! Reseteando escalamiento.");
        this.resetScale();
    } else {
        // Operación perdedora - mantener escalamiento activo
        console.log("Operación perdedora. Manteniendo estrategia de escalamiento.");
    }
    
    console.log("Resultado: " + result.type + ", Ganancia: " + result.profit + ", Total: " + this.totalProfit);
}

function resetScale() {
    // Resetear todas las variables de escalamiento
    this.currentScaleLevel = 0;
    this.scalePositions = [];
    this.entryPrice = 0;
}

function calculateAverageEntry() {
    if (this.scalePositions.length === 0) return 0;
    
    let totalValue = 0;
    let totalStake = 0;
    
    for (const position of this.scalePositions) {
        totalValue += position.price * position.stake;
        totalStake += position.stake;
    }
    
    return totalValue / totalStake;
}`,
    usageInstructions: `Accede a la plataforma
Haz clic aquí para acceder a la plataforma Deriv
@https://track.deriv.be/_XZsgLOqstMrrhBvO3lYd_WNd7ZgqdRLk/1/

Inicia sesión en tu cuenta
Inicia sesión en tu cuenta Deriv (Demo o Real).

Importa el robot
En el menú superior, haz clic en "Importar" (o "Load" en Binary Bot).

Carga el archivo
Localiza el archivo .xml del robot Scale Bot en tu computadora y cárgalo.

Verifica la carga
El robot aparecerá en el área de trabajo de la plataforma.

Configura los parámetros
Antes de iniciar, revisa y ajusta las configuraciones:
• Stake Base: $0.35 USD
• Stop Loss: $15.00 USD
• Stop Win: $8.00 USD
• Multiplicador de Escalamiento: 1.5
• Máximo de Niveles: 4

Estrategia de Escalamiento:
El Scale Bot utiliza un enfoque progresivo donde:
• Inicia con un stake base de $0.35
• Escala posiciones cuando el mercado se mueve contra la posición inicial
• Cada nivel de escalamiento aumenta el stake en 50%
• Máximo de 4 niveles para controlar el riesgo
• Reset automático después de operación ganadora

Ejecuta el robot
Haz clic en el botón "Ejecutar" (o "Run") para iniciar el robot.

⚠️ IMPORTANTE: SIEMPRE PRUEBA EN CUENTA DEMO PRIMERO
El Scale Bot utiliza estrategia de escalamiento que puede aumentar la exposición. Usa con gestión de riesgo adecuada.

Enlace de descarga: https://drive.google.com/file/d/1cgABr7dHEa7YAkZzNJRBZZJZ3SSf_J2A/view?usp=sharing`,
    isFavorite: false,
    downloadUrl: 'https://drive.google.com/file/d/1cgABr7dHEa7YAkZzNJRBZZJZ3SSf_J2A/view?usp=sharing',
    ranking: 0
  },
  {
    id: "alfabot",
    name: "AlfaBot",
    description: "Bot avançado de trading automatizado com estratégia híbrida que combina análise técnica e inteligência artificial para maximizar lucros em mercados voláteis. Utiliza algoritmos adaptativos para identificar oportunidades de alta probabilidade.",
    strategy: "Híbrida IA",
    accuracy: 85.2,
    operations: 1247,
    imageUrl: "",
    createdAt: "2024-12-19",
    updatedAt: "2024-12-19",
    version: "2.0.0",
    author: "AlfaTech Solutions",
    profitFactor: 2.3,
    expectancy: 0.52,
    drawdown: 18.5,
    riskLevel: 5,
    tradedAssets: ["R_100", "R_75", "R_50", "RDBEAR"],
    code: `// AlfaBot - Estratégia Híbrida com IA
function initialize() {
    // Parâmetros da estratégia
    this.baseStake = 0.35;           // Stake base
    this.stopLoss = 12.0;            // Stop loss máximo
    this.targetProfit = 10.0;        // Meta de ganância
    this.adaptiveMultiplier = 1.2;   // Multiplicador adaptativo
    
    // Indicadores técnicos
    this.sma = SMA(14);              // Média móvel simples
    this.ema = EMA(21);              // Média móvel exponencial
    this.rsi = RSI(14);              // Índice de força relativa
    this.macd = MACD(12, 26, 9);     // MACD
    
    // Sistema de IA adaptativo
    this.aiConfidence = 0.5;         // Confiança da IA
    this.marketCondition = "neutral"; // Condição do mercado
    this.adaptiveThreshold = 0.7;    // Limite adaptativo
    
    // Variáveis de controle
    this.totalProfit = 0;
    this.consecutiveWins = 0;
    this.consecutiveLosses = 0;
    this.lastTradeResult = null;
}

function onTick(tick) {
    // Verificar condições de parada
    if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
        this.stop("Meta alcançada: " + this.totalProfit);
        return;
    }
    
    // Calcular indicadores
    const smaValue = this.sma.calculate(tick.close);
    const emaValue = this.ema.calculate(tick.close);
    const rsiValue = this.rsi.calculate(tick.close);
    const macdValue = this.macd.calculate(tick.close);
    
    // Análise de IA adaptativa
    this.analyzeMarketCondition(tick, smaValue, emaValue, rsiValue, macdValue);
    
    // Determinar sinal de entrada
    const signal = this.generateTradingSignal(tick, smaValue, emaValue, rsiValue, macdValue);
    
    if (signal.direction && signal.confidence > this.adaptiveThreshold) {
        this.executeTrade(signal, tick);
    }
}

function analyzeMarketCondition(tick, sma, ema, rsi, macd) {
    // Análise da volatilidade
    const volatility = this.calculateVolatility();
    
    // Análise da tendência
    const trendStrength = Math.abs(ema - sma) / sma;
    
    // Determinar condição do mercado
    if (volatility > 0.02 && trendStrength > 0.01) {
        this.marketCondition = "trending";
        this.adaptiveThreshold = 0.6; // Menor threshold em tendência
    } else if (volatility < 0.01) {
        this.marketCondition = "ranging";
        this.adaptiveThreshold = 0.8; // Maior threshold em range
    } else {
        this.marketCondition = "neutral";
        this.adaptiveThreshold = 0.7; // Threshold padrão
    }
    
    // Ajustar confiança da IA baseado no histórico
    if (this.consecutiveWins >= 3) {
        this.aiConfidence = Math.min(0.9, this.aiConfidence + 0.1);
    } else if (this.consecutiveLosses >= 2) {
        this.aiConfidence = Math.max(0.3, this.aiConfidence - 0.1);
    }
}

function generateTradingSignal(tick, sma, ema, rsi, macd) {
    let bullishScore = 0;
    let bearishScore = 0;
    
    // Análise de médias móveis
    if (tick.close > ema && ema > sma) bullishScore += 0.3;
    if (tick.close < ema && ema < sma) bearishScore += 0.3;
    
    // Análise RSI
    if (rsi < 30) bullishScore += 0.2; // Oversold
    if (rsi > 70) bearishScore += 0.2; // Overbought
    if (rsi > 40 && rsi < 60) bullishScore += 0.1; // Zona neutra favorável
    
    // Análise MACD
    if (macd.histogram > 0 && macd.signal > 0) bullishScore += 0.2;
    if (macd.histogram < 0 && macd.signal < 0) bearishScore += 0.2;
    
    // Fator de confiança da IA
    const confidence = Math.max(bullishScore, bearishScore) * this.aiConfidence;
    
    // Determinar direção
    let direction = null;
    if (bullishScore > bearishScore && bullishScore > 0.5) {
        direction = "CALL";
    } else if (bearishScore > bullishScore && bearishScore > 0.5) {
        direction = "PUT";
    }
    
    return {
        direction: direction,
        confidence: confidence,
        bullishScore: bullishScore,
        bearishScore: bearishScore
    };
}

function executeTrade(signal, tick) {
    // Calcular stake adaptativo
    const stakeAmount = this.calculateAdaptiveStake();
    
    if (signal.direction === "CALL") {
        this.buyCall(tick.symbol, stakeAmount, 5); // 5 ticks
    } else {
        this.buyPut(tick.symbol, stakeAmount, 5); // 5 ticks
    }
    
    console.log("AlfaBot executando: " + signal.direction + 
                " | Confiança: " + signal.confidence.toFixed(2) + 
                " | Stake: " + stakeAmount + 
                " | Condição: " + this.marketCondition);
}

function calculateAdaptiveStake() {
    let stake = this.baseStake;
    
    // Ajustar baseado no histórico recente
    if (this.consecutiveWins >= 2) {
        stake *= 1.1; // Aumentar ligeiramente após vitórias
    } else if (this.consecutiveLosses >= 1) {
        stake *= this.adaptiveMultiplier; // Recuperação adaptativa
    }
    
    // Ajustar baseado na confiança da IA
    stake *= (0.8 + (this.aiConfidence * 0.4));
    
    return Math.round(stake * 100) / 100; // Arredondar para 2 casas decimais
}

function calculateVolatility() {
    // Simulação de cálculo de volatilidade
    return Math.random() * 0.03;
}

function onTradeResult(result) {
    this.lastTradeResult = result;
    this.totalProfit += result.profit;
    
    if (result.profit > 0) {
        this.consecutiveWins++;
        this.consecutiveLosses = 0;
        console.log("✅ Vitória! Sequência: " + this.consecutiveWins);
    } else {
        this.consecutiveLosses++;
        this.consecutiveWins = 0;
        console.log("❌ Perda. Sequência: " + this.consecutiveLosses);
    }
    
    console.log("Resultado: " + result.type + 
                " | Lucro: " + result.profit + 
                " | Total: " + this.totalProfit + 
                " | IA Confiança: " + this.aiConfidence.toFixed(2));
}`,
    usageInstructions: `Acesse a plataforma
Clique aqui para acessar a plataforma Deriv
@https://track.deriv.be/_XZsgLOqstMrrhBvO3lYd_WNd7ZgqdRLk/1/

Faça login na sua conta
Faça login na sua conta Deriv (Demo ou Real).

Importe o robô
No menu superior, clique em "Importar" (ou "Load" no Binary Bot).

Carregue o arquivo
Localize o arquivo .xml do robô AlfaBot no seu computador e carregue-o.

Verifique o carregamento
O robô aparecerá na área de trabalho da plataforma.

Configure os parâmetros
Antes de iniciar, revise e ajuste as configurações:
• Stake Base: $0.35 USD
• Stop Loss: $12.00 USD
• Stop Win: $10.00 USD
• Multiplicador Adaptativo: 1.2

Características do AlfaBot:
• Sistema de IA adaptativo que aprende com o mercado
• Análise multi-indicador (SMA, EMA, RSI, MACD)
• Gestão de risco dinâmica baseada em performance
• Adaptação automática às condições do mercado
• Confiança da IA ajustável baseada no histórico

Execute o robô
Clique no botão "Executar" (ou "Run") para iniciar o robô.

⚠️ IMPORTANTE: SEMPRE TESTE EM CONTA DEMO PRIMEIRO
O AlfaBot utiliza estratégias avançadas de IA. Use com gestão de risco adequada.

Enlace de descarga: https://drive.google.com/file/d/1g9RZ7sXUKiXLrpODcmMHCzrwlAfyCsdF/view?usp=sharing`,
    isFavorite: false,
    downloadUrl: 'https://drive.google.com/file/d/1g9RZ7sXUKiXLrpODcmMHCzrwlAfyCsdF/view?usp=sharing',
    ranking: 0
  },
  {
    id: "tipbot",
    name: "Tip Bot",
    description: "Bot con estrategia muy directa y agresiva. Su único objetivo es realizar operaciones continuamente, apostando a que el último dígito del precio será MAYOR (OVER) que cero, utilizando un sistema de Martingale para recuperar las pérdidas rápidamente.",
    strategy: "Martingale Agresivo",
    accuracy: 84.5,
    operations: 2156,
    imageUrl: "",
    createdAt: "2024-12-19",
    updatedAt: "2024-12-19",
    version: "1.0.0",
    author: "Tip Trading Systems",
    profitFactor: 1.9,
    expectancy: 0.38,
    drawdown: 22.5,
    riskLevel: 8,
    tradedAssets: ["R_75"],
    code: `// Tip Bot - Estrategia DIGITOVER 0 con Martingale Agresivo
function initialize() {
    // Parámetros de la estrategia
    this.baseStake = 1.0;            // Apuesta base
    this.stopLoss = 50.0;            // Stop loss máximo
    this.targetProfit = 25.0;        // Meta de ganancia
    this.martingaleMultiplier = 2.0; // Multiplicador Martingale (duplica)
    
    // Variables de control
    this.totalProfit = 0;
    this.currentStake = this.baseStake;
    this.consecutiveLosses = 0;
    this.operationsCount = 0;
}

function onTick(tick) {
    // Verificar condiciones de parada
    if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
        this.stop("Meta alcanzada: " + this.totalProfit);
        return;
    }
    
    // Estrategia: SIEMPRE apostar DIGITOVER 0
    // El último dígito del precio será MAYOR que 0
    // Solo pierde si el último dígito es exactamente 0
    this.buyDigitOver(tick.symbol, 0, this.currentStake, 1); // 1 tick duration
    this.operationsCount++;
    
    console.log("Operación #" + this.operationsCount + 
                " - DIGITOVER 0 con stake: " + this.currentStake + 
                " | Total: " + this.totalProfit);
}

function onTradeResult(result) {
    this.totalProfit += result.profit;
    
    if (result.profit > 0) {
        // ¡GANÓ! Resetear al stake inicial
        console.log("✅ ¡VICTORIA! Último dígito > 0");
        this.currentStake = this.baseStake;
        this.consecutiveLosses = 0;
    } else {
        // PERDIÓ (último dígito fue 0) - Activar Martingale
        this.consecutiveLosses++;
        this.currentStake *= this.martingaleMultiplier; // DUPLICAR apuesta
        
        console.log("❌ PÉRDIDA - Último dígito fue 0. Pérdidas consecutivas: " + 
                    this.consecutiveLosses + 
                    " | Nueva apuesta: " + this.currentStake);
    }
    
    console.log("Resultado: " + result.type + 
                " | Ganancia: " + result.profit + 
                " | Total Acumulado: " + this.totalProfit + 
                " | Stake Actual: " + this.currentStake);
}

// Función auxiliar para comprar DIGITOVER
function buyDigitOver(symbol, digit, amount, duration) {
    // Implementación específica para DIGITOVER 0
    // El bot apuesta que el último dígito será > 0
    this.buy({
        symbol: symbol,
        contract_type: "DIGITOVER",
        digit: digit,
        amount: amount,
        duration: duration,
        duration_unit: "t" // ticks
    });
}`,
    usageInstructions: `Acceda a la plataforma
Haga clic aquí para descargar Tip Bot
@https://drive.google.com/file/d/14t4UPqkJFFumxquZY0fclfDh8oAiI2Ci/view?usp=sharing

Inicie sesión en su cuenta
Inicie sesión en su cuenta Deriv (Demo o Real).

Importe el robot
En el menú superior, haga clic en "Importar" (o "Load" en Binary Bot).

Cargue el archivo
Localice el archivo .xml del robot Tip Bot en su computadora y cárguelo.

Verifique la carga
El robot aparecerá en el área de trabajo de la plataforma.

Estrategia del Tip Bot:

🎯 ESTRATEGIA DE ENTRADA: Siempre Comprar
• No analiza el mercado - opera continuamente
• Alta frecuencia de operaciones
• Opera en Índice de Volatilidad 75 (R_75)

🎲 TIPO DE APUESTA: Dígito Mayor que Cero (DIGITOVER 0)
• Apuesta: "el último dígito del precio será mayor que 0"
• Alta probabilidad de victoria (solo pierde si el dígito es 0)
• Muchas victorias pequeñas vs pocas pérdidas

💰 GESTIÓN DEL DINERO: Martingale Agresivo
• Apuesta Inicial: $1.00
• Si GANA: Reinicia al valor inicial
• Si PIERDE: DUPLICA la apuesta anterior
• Ejemplo: $1 → $2 → $4 → $8 → $16...

Configure los parámetros
Antes de iniciar, revise y ajuste las configuraciones:
• Apuesta Base: $1.00 USD
• Stop Loss: $50.00 USD
• Stop Win: $25.00 USD
• Multiplicador Martingale: 2.0 (duplica)

⚠️ ADVERTENCIA: ESTRATEGIA DE ALTO RIESGO
• El Tip Bot es un robot de "fuerza bruta"
• Utiliza Martingale agresivo que puede generar pérdidas significativas
• Una secuencia de pérdidas puede agotar rápidamente el capital
• Recomendado solo para traders experimentados
• SIEMPRE use Stop Loss y capital que pueda permitirse perder

Ejecute el robot
Haga clic en el botón "Ejecutar" (o "Run") para iniciar el robot.

⚠️ IMPORTANTE: SIEMPRE PRUEBE EN CUENTA DEMO PRIMERO
Este bot utiliza estrategia Martingale agresiva. Alto riesgo, alta recompensa.`,
    isFavorite: false,
    downloadUrl: 'https://drive.google.com/file/d/14t4UPqkJFFumxquZY0fclfDh8oAiI2Ci/view?usp=sharing',
    ranking: 0
  },
  {
    id: "xtremebot",
    name: "XtremeBot",
    description: "Estrategia de 'todo o nada' de altísimo riesgo. Opera en Volatilidad 100 y aguarda pacientemente por una única condición: el último dígito del precio sea exactamente 5. Cuando ocurre, apuesta que el próximo dígito será diferente de 3. Si pierde, aplica martingale extremadamente agresivo multiplicando por 10.",
    strategy: "Martingale Extremo x10",
    accuracy: 91.2,
    operations: 1847,
    imageUrl: "",
    createdAt: "2024-12-19",
    updatedAt: "2024-12-19",
    version: "1.0.0",
    author: "Xtreme Trading Systems",
    profitFactor: 3.8,
    expectancy: 1.24,
    drawdown: 45.7,
    riskLevel: 10,
    tradedAssets: ["R_100"],
    code: `// XtremeBot - Estrategia "Todo o Nada" con Martingale Extremo x10
function initialize() {
    // Parámetros de la estrategia extrema
    this.baseStake = 1.0;              // Apuesta base
    this.stopLoss = 100.0;             // Stop loss máximo
    this.targetProfit = 50.0;          // Meta de ganancia
    this.martingaleMultiplier = 10.0;  // Multiplicador EXTREMO (x10)
    
    // Variables de control
    this.totalProfit = 0;
    this.currentStake = this.baseStake;
    this.consecutiveLosses = 0;
    this.operationsCount = 0;
    this.waitingForCondition = true;
}

function onTick(tick) {
    // Verificar condiciones de parada
    if (this.totalProfit <= -this.stopLoss || this.totalProfit >= this.targetProfit) {
        this.stop("Meta alcanzada: " + this.totalProfit);
        return;
    }
    
    // Obtener último dígito del precio actual
    let lastDigit = Math.floor(tick.quote * 100000) % 10;
    
    // CONDICIÓN ÚNICA: Esperar que el último dígito sea exactamente 5
    if (lastDigit === 5) {
        // ¡CONDICIÓN ENCONTRADA! Apostar que el PRÓXIMO dígito será diferente de 3
        this.buyDigitDiffers(tick.symbol, 3, this.currentStake, 1);
        this.operationsCount++;
        this.waitingForCondition = false;
        
        console.log("🎯 CONDICIÓN ACTIVADA! Último dígito = 5");
        console.log("Operación #" + this.operationsCount + 
                    " - DIGITDIFFERS 3 con stake: " + this.currentStake + 
                    " | Total: " + this.totalProfit);
    } else {
        // Continuar esperando la condición
        if (this.waitingForCondition) {
            console.log("⏳ Esperando condición... Último dígito: " + lastDigit + " (necesita ser 5)");
        }
    }
}

function onTradeResult(result) {
    this.totalProfit += result.profit;
    this.waitingForCondition = true; // Volver a esperar la condición
    
    if (result.profit > 0) {
        // ¡GANÓ! El próximo dígito fue diferente de 3
        console.log("🚀 ¡VICTORIA EXTREMA! Próximo dígito ≠ 3");
        this.currentStake = this.baseStake;
        this.consecutiveLosses = 0;
    } else {
        // PERDIÓ - El próximo dígito fue exactamente 3
        this.consecutiveLosses++;
        this.currentStake *= this.martingaleMultiplier; // MULTIPLICAR POR 10
        
        console.log("💥 PÉRDIDA EXTREMA - Próximo dígito fue 3");
        console.log("Pérdidas consecutivas: " + this.consecutiveLosses + 
                    " | Nueva apuesta: " + this.currentStake + " (x10)");
        
        // Verificar si la próxima apuesta excede límites
        if (this.currentStake > 1000) {
            console.log("⚠️ ALERTA: Apuesta muy alta, considere parar");
        }
    }
    
    console.log("Resultado: " + result.type + 
                " | Ganancia: " + result.profit + 
                " | Total Acumulado: " + this.totalProfit + 
                " | Próxima Apuesta: " + this.currentStake);
}

// Función auxiliar para comprar DIGITDIFFERS
function buyDigitDiffers(symbol, digit, amount, duration) {
    // Implementación específica para DIGITDIFFERS 3
    // El bot apuesta que el próximo dígito será diferente de 3
    this.buy({
        symbol: symbol,
        contract_type: "DIGITDIFFERS",
        digit: digit,
        amount: amount,
        duration: duration,
        duration_unit: "t" // ticks
    });
}`,
    usageInstructions: `Acceda a la plataforma
Haga clic aquí para descargar XtremeBot
@https://drive.google.com/file/d/1uwkWxKb8lRzl-gAmB6RQbQhWyR1FCbhs/view?usp=sharing

Inicie sesión en su cuenta
Inicie sesión en su cuenta Deriv (Demo o Real).

Importe el robot
En el menú superior, haga clic en "Importar" (o "Load" en Binary Bot).

Cargue el archivo
Localice el archivo .xml del robot XtremeBot en su computadora y cárguelo.

Verifique la carga
El robot aparecerá en el área de trabajo de la plataforma.

Estrategia del XtremeBot:

🎯 ESTRATEGIA DE ENTRADA: Condición Única Extrema
• Espera pacientemente que el último dígito del precio sea exactamente 5
• NO opera hasta que esta condición específica ocurra
• Opera SOLO en Índice de Volatilidad 100 (R_100)
• Estrategia de "todo o nada" de altísimo riesgo

🎲 TIPO DE APUESTA: Dígito Diferente de 3 (DIGITDIFFERS 3)
• Cuando último dígito = 5, apuesta que el PRÓXIMO dígito ≠ 3
• Alta probabilidad teórica (90% - solo pierde si próximo dígito es 3)
• Pocas operaciones pero de alto impacto

💰 GESTIÓN DEL DINERO: Martingale EXTREMO x10
• Apuesta Inicial: $1.00
• Si GANA: Reinicia al valor inicial
• Si PIERDE: MULTIPLICA por 10 la apuesta anterior
• Ejemplo: $1 → $10 → $100 → $1000...

⚠️ PELIGRO EXTREMO: Esta progresión puede agotar el capital en 3-4 pérdidas

Configure los parámetros
Antes de iniciar, revise y ajuste las configuraciones:
• Apuesta Base: $1.00 USD
• Stop Loss: $100.00 USD
• Stop Win: $50.00 USD
• Multiplicador Martingale: 10.0 (EXTREMO)

🚨 ADVERTENCIA CRÍTICA: ESTRATEGIA DE RIESGO MÁXIMO
• El XtremeBot es la estrategia MÁS PELIGROSA del catálogo
• Martingale x10 puede generar pérdidas catastróficas instantáneas
• Una secuencia de 3-4 pérdidas puede destruir completamente el capital
• Solo para traders profesionales con experiencia extrema en gestión de riesgo
• Capital mínimo recomendado: $10,000+ para absorber volatilidad
• OBLIGATORIO usar Stop Loss estricto

Ejecute el robot
Haga clic en el botón "Ejecutar" (o "Run") para iniciar el robot.

🔥 IMPORTANTE: PRUEBE SOLO EN CUENTA DEMO PRIMERO
Este bot puede generar ganancias masivas o pérdidas totales. Use bajo su propio riesgo.`,
    isFavorite: false,
    downloadUrl: 'https://drive.google.com/file/d/1uwkWxKb8lRzl-gAmB6RQbQhWyR1FCbhs/view?usp=sharing',
    ranking: 0
  }
];

// Sort bots by accuracy for ranking
bots.sort((a, b) => b.accuracy - a.accuracy);
bots.forEach((bot, index) => {
  bot.ranking = index + 1;
});

// Dashboard stats
export const dashboardStats = {
  totalBots: bots.length,
  totalOperations: bots.reduce((sum, bot) => sum + bot.operations, 0),
  averageAccuracy: Math.round(bots.reduce((sum, bot) => sum + bot.accuracy, 0) / bots.length),
  activeUsers: 587,
  growth: 12.5
};

// Performance data for charts
export const performanceData = {
  profitLoss: generatePerformanceData(30, true, 1000),
  accuracy: generatePerformanceData(30, true, 50),
  volatility: generatePerformanceData(30, false, 40)
};

// Filter options
export const filterOptions = {
  strategies: [
    { label: "Seguidor de Tendencia", value: "Seguidor de Tendencia" },
    { label: "Martingale", value: "Martingale" },
    { label: "Sin Martingale", value: "Sin Martingale" },
    { label: "Filtro Digital", value: "Digital Filter" },
    { label: "Análisis Secuencial", value: "Análisis Secuencial" },
    { label: "Híbrida IA", value: "Híbrida IA" },
  ],
  assets: [
    { label: "R_25", value: "R_25" },
    { label: "R_50", value: "R_50" },
    { label: "R_75", value: "R_75" },
    { label: "R_100", value: "R_100" },
    { label: "RDBEAR", value: "RDBEAR" },
  ]
};
