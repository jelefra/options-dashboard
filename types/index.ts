import { Dayjs } from 'dayjs';

export type Stock = {
  colour?: string;
  currency: string;
  officialTicker?: string;
  optionSize: number;
  ticker: string;
};

type Operation = {
  account: string;
  commission: number;
  stockPrice: number;
  ticker: string;
  type: TransactionType | TradeType;
};

export type TradeData = Operation & {
  batchCode?: string;
  closePrice?: number;
  date: string;
  delta: number;
  expiry: string;
  IV: number;
  strike: number;
  tradePrice: number;
  type: TradeType;
};

export type TradeType = 'Put' | 'Call';

type Trade = Operation & {
  batchCode: string;
  date: Dayjs;
  expiry: Dayjs;
  strike: number;
  tradePrice: number;
  type: TradeType;
};

export type Call = Trade & {
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
  capitalGains: boolean;
  colour: string;
  currencies: string[];
};

type Row = {
  account: string;
  assignmentPct: number;
  current: number;
  date: Dayjs;
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
    low: number;
    lowPct: number;
    return30DPct: number;
    ticker: string;
  };

export type CallRow = Row & {
  batchCode: string;
  cashEquivalentGBP: number;
  costBasisDrop: number;
  daysTotal: number;
  grossCost: number;
  netCost: number;
  return1YPctIfAssigned: number;
  return30DPctIfAssigned: number;
  return30DPctLastCall: number;
  returnGBP: number;
  returnGBPIfAssigned: number;
  returnGBPLastCall: number;
  returnPct: number;
  returnPctIfAssigned: number;
};

export type Batch = {
  account: string;
  acquisitionDate: Dayjs;
  batchCode: string;
  currentCall?: Call;
  grossCost: number;
  netCost: number;
  origin: 'Purchase' | 'Put';
  quantity: number;
  ticker: string;
  wheeling: boolean;
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

export type IEXCloudStockResponse = { latestPrice: number };

export type IEXCloudUsageResponse = { dailyUsage: { [key: string]: string }; monthlyUsage: number };

export type ExchangeRateResponse = { rates: { [key: string]: number } };
