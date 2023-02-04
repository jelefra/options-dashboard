import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { factorStockSplit } from './factorStockSplit';

import { Batch, CurrentTickerPrices, Stock, TradeData, TransactionData } from '../types';

import { INPUT_DATE_FORMAT } from '../constants';

import tickers from '../data/tickers';

const processData = ({
  transactions,
  trades,
  currentTickerPrices = {},
  now,
}: {
  transactions: TransactionData[];
  trades: TradeData[];
  currentTickerPrices?: CurrentTickerPrices;
  now?: Dayjs;
}) => {
  const batches: { [key: string]: Batch } = {};

  const stocks: {
    [key: string]: Stock;
  } = Object.fromEntries(
    Object.entries(tickers).map(([ticker, stock]) => [
      ticker,
      { ...stock, current: currentTickerPrices[ticker] },
    ])
  );

  for (let transaction of transactions) {
    const {
      account,
      batchCodes: batchCodesStr,
      commission,
      date,
      quantity,
      stockPrice,
      ticker,
      type,
    } = transaction;

    if (type === 'Purchase') {
      if (batchCodesStr) {
        const batchCodes = batchCodesStr.includes(',') ? batchCodesStr.split(',') : [batchCodesStr];
        const { colour, currency, optionSize } = tickers[ticker];

        for (let batchCode of batchCodes) {
          batches[batchCode] = batches[batchCode] || {
            account,
            // TODO
            //  Acquisition date set to the first purchase date
            //  May underestimate gains and losses
            //  Is it worth improving?
            acquisitionDate: dayjs(date, INPUT_DATE_FORMAT),
            acquisitionCost: 0,
            batchCode,
            colour,
            currency,
            current: currentTickerPrices[ticker],
            netCumulativePremium: 0,
            optionSize,
            origin: 'Purchase',
            ticker,
          };

          const batch = batches[batchCode];
          batch.acquisitionCost += (stockPrice * quantity + commission) / batchCodes.length;
        }
      } else {
        stocks[ticker].partialBatch = stocks[ticker].partialBatch || {
          acquisitionCost: 0,
          quantity: 0,
        };
        const partialBatch = stocks[ticker].partialBatch;
        partialBatch.acquisitionCost += stockPrice * quantity + commission;
        partialBatch.quantity += factorStockSplit(ticker, quantity, dayjs(date, INPUT_DATE_FORMAT));
      }
    } else if (type === 'Sale') {
      if (batchCodesStr) {
        // TODO
        // ...
      } else {
        const partialBatch = stocks[ticker].partialBatch;
        partialBatch.acquisitionCost -= stockPrice * quantity - commission;
        partialBatch.quantity -= factorStockSplit(ticker, quantity, dayjs(date, INPUT_DATE_FORMAT));
      }
    }
  }

  for (let trade of trades) {
    const {
      account,
      batchCode,
      closeCommission = 0,
      closePrice,
      closeTradePrice = 0,
      commission,
      date,
      stockPrice,
      strike,
      ticker,
      tradePrice,
      type,
    } = trade;

    const { colour, currency, optionSize } = tickers[ticker];

    const netCumulativePremium =
      (tradePrice - closeTradePrice) * optionSize - commission - closeCommission;

    if (type === 'Put') {
      if (closePrice && closePrice < strike) {
        batches[batchCode] = {
          account,
          acquisitionCost: strike * optionSize,
          acquisitionDate: dayjs(date, INPUT_DATE_FORMAT),
          batchCode,
          colour,
          currency,
          current: currentTickerPrices[ticker],
          netCumulativePremium,
          origin: 'Put',
          optionSize,
          ticker,
        };
      } else {
        // Put only (including current assignable puts)
        stocks[ticker].putOnly = stocks[ticker].putOnly || { premium: 0 };
        stocks[ticker].putOnly.premium +=
          (tradePrice - closeTradePrice) * optionSize - commission - closeCommission;
      }
    }

    if (type === 'Call') {
      const batch = batches[batchCode];
      batch.netCumulativePremium += netCumulativePremium;

      if (closePrice && closePrice > strike) {
        batch.exitValue = strike * optionSize;
      }

      const expiry = dayjs(trade.expiry, INPUT_DATE_FORMAT);
      if (now && expiry.isSameOrAfter(now, 'day') && !trade.closeTradePrice) {
        batch.currentCall = {
          account,
          batchCode,
          commission,
          date: dayjs(date, INPUT_DATE_FORMAT),
          expiry,
          stockPrice,
          strike,
          ticker,
          tradePrice,
          type: 'Call',
        };
      }
    }
  }

  return { batches, stocks };
};

export default processData;
