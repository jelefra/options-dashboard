import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { factorStockSplit } from './factorStockSplit';

import { Batch, CurrentTickerPrices, Stock, TradeData, TransactionData } from '../types';

import { INPUT_DATE_FORMAT } from '../constants';

import tickers from '../data/tickers';

const processData = (
  now: Dayjs,
  transactions: TransactionData[],
  trades: TradeData[],
  currentTickerPrices: CurrentTickerPrices = {}
) => {
  const batches: { [key: string]: Batch } = {};

  const stocks: {
    [key: string]: Stock;
  } = Object.fromEntries(
    Object.keys(currentTickerPrices).map((ticker) => {
      const { colour, currency, optionSize } = tickers[ticker];
      return [
        ticker,
        { colour, currency, current: currentTickerPrices[ticker], optionSize, ticker },
      ];
    })
  );

  const buildStocks = Object.keys(stocks).length > 0;

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
            netCumulativePremium: 0,
            optionSize: 0,
            origin: 'Purchase',
            ticker,
          };

          const batch = batches[batchCode];
          const batchQuantity =
            factorStockSplit(ticker, quantity, dayjs(date, INPUT_DATE_FORMAT)) / batchCodes.length;
          batch.acquisitionCost += (stockPrice * quantity + commission) / batchCodes.length;
          batch.optionSize += batchQuantity;
        }
      } else if (buildStocks) {
        stocks[ticker].partialBatch = stocks[ticker].partialBatch || {
          acquisitionCost: 0,
          quantity: 0,
        };
        const partialBatch = stocks[ticker].partialBatch;
        partialBatch.acquisitionCost += stockPrice * quantity + commission;
        partialBatch.quantity += factorStockSplit(ticker, quantity, dayjs(date, INPUT_DATE_FORMAT));
      }
    }

    // TODO
    // if (type === 'Sale' && batchCodes) {
    //   ...
    // }
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

    const { optionSize } = tickers[ticker];

    const netCumulativePremium =
      (tradePrice - closeTradePrice) * optionSize - commission - closeCommission;

    if (type === 'Put') {
      if (closePrice && closePrice < strike) {
        batches[batchCode] = {
          account,
          batchCode,
          acquisitionCost: strike * optionSize,
          acquisitionDate: dayjs(date, INPUT_DATE_FORMAT),
          netCumulativePremium,
          origin: 'Put',
          optionSize: optionSize,
          ticker,
        };
      } else if (buildStocks) {
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
      if (expiry.isSameOrAfter(now, 'day') && !trade.closeTradePrice) {
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
