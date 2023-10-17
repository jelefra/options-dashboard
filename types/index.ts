import { Dayjs } from 'dayjs';
import { ReactElement } from 'react';

export type Stock = {
  colour: string;
  currency: string;
  current?: number;
  exchange?: string;
  optionSize?: number;
  ticker: string;
  partialBatch?: {
    acquisitionCost: number;
    quantity: number;
  };
  putOnly?: {
    premium: number;
  };
  wheeled?: {
    acquisitionCost: number;
    exitValue?: number;
    premium: number;
    quantity: number;
  };
  wheeling?: {
    acquisitionCost: number;
    premium: number;
    quantity: number;
    calls?: {
      missedUpside: number;
      active: {
        count: number;
        value: number;
      };
      assignable: {
        count: number;
        value: number;
      };
    };
    puts?: {
      active: {
        count: number;
        value: number;
      };
      assignable: {
        count: number;
        value: number;
      };
    };
  };
};

export type StockEnriched = Stock & {
  allocation?: number;
  allocationWithActivePuts?: number;
  allocationWithAssignablePuts?: number;
  avgCost: number;
  returnGBP: number;
  returnPct: number;
  totalQuantity: number;
  valueGBP: number;
  putOnly?: {
    premiumGBP: number;
  };
  wheeled?: {
    growth: number;
    growthAsPctOfReturn: number;
    premiumAsPctOfReturn: number;
    return: number;
    returnPct: number;
  };
  wheeling?: {
    puts?: {
      active: {
        valueGBP: number;
      };
      assignable: {
        valueGBP: number;
      };
    };
    calls?: {
      active: {
        valueGBP: number;
      };
      assignable: {
        valueGBP: number;
      };
    };
  };
  missingUpside?: boolean;
};

type Operation = {
  account: string;
  commission: number;
  stockPrice: number;
  ticker: string;
  type: TransactionType | TradeType;
};

type TradeCloseDataPresent = {
  closeCommission: number;
  closeDate: string;
  closePrice: number;
  closeTradePrice: number;
};

type TradeCloseDataAbsent = {
  closeCommission?: never;
  closeDate?: never;
  closePrice?: never;
  closeTradePrice?: never;
};

type TradeCommon = (TradeCloseDataAbsent | TradeCloseDataPresent) & {
  batchCode?: string;
  // Trades filled long after being placed don't feature delta or IV
  delta?: number;
  IV?: number;
  strike: number;
  tradePrice: number;
  type: TradeType;
};

export type TradeType = 'Put' | 'Call';

export type TradeData = Operation &
  TradeCommon & {
    date: string;
    expiry: string;
  };

export type PutData = TradeData & {
  type: 'Put';
};

type Trade = Operation &
  TradeCommon & {
    date: Dayjs;
    expiry: Dayjs;
  };

export type Call = Trade & {
  batchCode: string;
  type: 'Call';
};

export type Put = Trade & {
  type: 'Put';
};

export type TransactionData = Operation & {
  batchCodes?: string;
  date: string;
  quantity: number;
  type: TransactionType;
};

export type TransactionType = 'Purchase' | 'Sale';

export type Account = {
  name: string;
  id: string;
  capitalGains: boolean;
  colour: string;
  currencies: string[];
  tickers?: string[];
};

export type Accounts = {
  [key: string]: Account;
};

type Row = {
  account: string;
  assignmentPct: number;
  current: number;
  date: Dayjs;
  daysToEarnings: number;
  dteCurrent: number;
  dteTotal: number;
  expiry: Dayjs;
  high: number;
  highPct: number;
  marketPrice?: number;
  priceIncreaseGBP: number;
  return30DPctResidual: number;
  return30DPctResidualEstimate?: number;
  status?: Status;
  stockPrice: number;
  strike: number;
  tradePrice: number;
};

export type Status = 'Assignable';

type PutRowCommon = {
  cashEquivalentGBP: number;
  returnGBP: number;
  differenceGBP: number;
};

export type PutRowTotal = PutRowCommon & {
  status: number;
};

export type PutRow = Row &
  PutRowCommon & {
    closeTradePrice: ReactElement;
    low: number;
    lowPct: number;
    optionReturnPct: number;
    return30DPctExpected: number;
    return30DPctEffective: number;
    ticker: string;
  };

export type CallRowTotal = {
  priceIncreaseGBP: number;
  returnGBP: number;
  returnGBPLastCall: number;
  valueGBP: number;
};

export type CallRow = Row &
  CallRowTotal & {
    batchCode: string;
    closeTradePrice: ReactElement;
    costBasisDrop: number;
    daysTotal: number;
    netCost: number;
    optionReturnPct: number;
    return1YPctIfAssigned: number;
    return30DPctIfAssigned: number;
    return30DPctLastCall: number;
    returnGBPIfAssigned: number;
    returnPct: number;
    returnPctIfAssigned: number;
    unitAcquisitionCost: number;
  };

export type Batch = {
  acquisitionCost: number;
  account: string;
  acquisitionDate: Dayjs;
  batchCode: string;
  colour: string;
  currency: string;
  current?: number;
  currentCall?: Call;
  exitValue?: number;
  netCumulativePremium: number;
  optionSize: number;
  origin: 'Purchase' | 'Put';
  ticker: string;
};

export type BankData = {
  account: string;
  amount: number;
  commission: number;
  currencyPair: string;
  date: string;
  rate: number;
  type: BankActivityTypes;
};

export type BankActivityTypes = 'Deposit' | 'Conversion';

export type ForexRates = { [key: string]: number };

export type HistoricalForexRates = { [key: string]: ForexRates };

export type ForexRow = {
  account: string;
  amount: number;
  currencyPair: string;
  currentRate: number;
  date: Dayjs;
  differencePct: number;
  profitGBP: number;
  rate: number;
};

export type StocksRowTotal = {
  returnGBP: number;
  valueGBP: number;
  wheelingPutsActiveValueGBP: number;
  wheelingPutsAssignableValueGBP: number;
  wheelingCallsAssignableValueGBP: number;
};

// Ideally would be defined programmatically from the keys of flatten(row)
export type StocksHeadings = StocksRowTotal & {
  allocation: number;
  allocationWithActivePuts: number;
  allocationNet: number;
  avgCost: number;
  colour: string;
  current: number;
  partialBatchAcquisitionCost: number;
  partialBatchQuantity: number;
  putOnlyPremium: number;
  putOnlyPremiumGBP: number;
  returnPct: number;
  ticker: string;
  totalQuantity: number;
  wheeledAcquisitionCost: number;
  wheeledQuantity: number;
  wheeledExitValue: number;
  wheeledPremium: number;
  wheeledPremiumAsPctOfReturn: number;
  wheeledGrowth: number;
  wheeledGrowthAsPctOfReturn: number;
  wheeledReturn: number;
  wheeledReturnPct: number;
  wheelingAcquisitionCost: number;
  wheelingCallsActiveCount: number;
  wheelingCallsAssignableCount: number;
  wheelingPremium: number;
  wheelingPutsActiveCount: number;
  wheelingPutsAssignableCount: number;
  wheelingQuantity: number;
};

export type MarketstackTickerEOD = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adj_high: number | null;
  adj_low: number | null;
  adj_close: number | null;
  adj_open: number | null;
  adj_volume: number | null;
  split_factor: number;
  dividend: number;
  symbol: string;
  exchange: string;
  date: string;
};

export type FinnhubQuote = {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Time
};

export type ExchangeRateResponse = { rates: ForexRates };

export type CurrentTickerPrices = { [key: string]: number };

export type EarningsDates = {
  [key: string]: { date: string; confirmed: boolean; timing?: 'Before' | 'After' };
};

export type Ledgers = { [key: string]: Ledger };

type Ledger = {
  BASE: CurrencyLedger;
  [key: string]: CurrencyLedger;
};

type CurrencyLedger = {
  commoditymarketvalue: number;
  futuremarketvalue: number;
  settledcash: number;
  exchangerate: number;
  sessionid: number;
  cashbalance: number;
  corporatebondsmarketvalue: number;
  warrantsmarketvalue: number;
  netliquidationvalue: number;
  interest: number;
  unrealizedpnl: number;
  stockmarketvalue: number;
  moneyfunds: number;
  currency: string;
  realizedpnl: number;
  funds: number;
  acctcode: string;
  issueroptionsmarketvalue: number;
  key: 'LedgerList';
  timestamp: number;
  severity: number;
  stockoptionmarketvalue: number;
  futuresonlypnl: number;
  tbondsmarketvalue: number;
  futureoptionmarketvalue: number;
  cashbalancefxsegment: number;
  secondkey: string;
  tbillsmarketvalue: number;
  dividends: number;
};

export type Summaries = { [key: string]: Summary };

// IBKR returns more data
type Summary = {
  excessliquidity: {
    amount: number;
  };
  netliquidation: {
    amount: number;
  };
};

export type OpenExchangeRatesUsage = {
  requests: number;
  requests_quota: number;
  requests_remaining: number;
  days_elapsed: number;
  days_remaining: number;
  daily_average: number;
};

export type Positions = { [key: string]: PositionsTimestamped };

export type PositionsTimestamped = {
  allData: Position[];
  timestamp: number;
};

export type Position = {
  position: number;
  mktPrice: number;
  mktValue: number;
  currency: string;
  avgCost: number;
  avgPrice: number;
  unrealizedPnl: number;
  expiry: string;
  putOrCall: 'P' | 'C' | null;
  multiplier: number;
  strike: number;
  ticker: string;
  fullName: string;
  assetClass: string;
};
