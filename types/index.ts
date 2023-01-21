import { ReactElement } from 'react';
import { Dayjs } from 'dayjs';

export type Stock = {
  colour: string;
  currency: string;
  current?: number;
  officialTicker?: string;
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
    activeCalls: number;
    acquisitionCost: number;
    missedUpside: number;
    premium: number;
    quantity: number;
  };
};

type Operation = {
  account: string;
  commission: number;
  stockPrice: number;
  ticker: string;
  type: TransactionType | TradeType;
};

type TradeCommon = {
  batchCode?: string;
  closeCommission?: number;
  closeDate?: string;
  closePrice?: number;
  closeTradePrice?: number;
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
  priceIncreaseGBP: number;
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
    return30DPctExpected: number;
    return30DPctEffective: number;
    return30DPctResidual: number;
    ticker: string;
  };

export type CallRowTotal = {
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
    return1YPctIfAssigned: number;
    return30DPctIfAssigned: number;
    return30DPctLastCall: number;
    return30DPctResidual: number;
    returnGBPIfAssigned: number;
    returnPct: number;
    returnPctIfAssigned: number;
    unitAcquisitionCost: number;
  };

export type BatchCost = {
  acquisitionCost: number;
  batchCode: string;
  optionSize: number;
};

export type Batch = BatchCost & {
  account: string;
  acquisitionDate: Dayjs;
  currentCall?: Call;
  exitValue?: number;
  netCumulativePremium: number;
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
};

export type StocksRow = StocksRowTotal & {
  activeCalls: number;
  allocation?: number;
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
  wheelingMissedUpside: number;
  wheelingPremium: number;
  wheelingQuantity: number;
};

export type IEXCloudStockResponse = { latestPrice: number };

export type IEXCloudUsageResponse = { dailyUsage: { [key: string]: string }; monthlyUsage: number };

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

// IBKR returns more data besides 'excessliquidity'
type Summary = {
  excessliquidity: {
    amount: number;
    currency: string;
    isNull: boolean;
    timestamp: number;
    value: null | number;
    severity: number;
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
