import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { INPUT_DATE_FORMAT } from '../constants';
import tickers, { tickersMap } from '../data/tickers';
import { Batch, CurrentTickerPrices, Stock, TradeData, TransactionData } from '../types';
import { getCurrentQuantity } from './factorStockSplit';

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
      ticker: displayTicker,
      type,
    } = transaction;

    const { colour, currency, optionSize, ticker } =
      tickers[tickersMap[displayTicker] ?? displayTicker];

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
        // Using the non-null assertion operator because
        // TypeScript infers that `partialBatch` may be `undefined` otherwise
        const partialBatch = stocks[ticker].partialBatch!;
        partialBatch.acquisitionCost += stockPrice * quantity + commission;
        partialBatch.quantity += getCurrentQuantity(
          ticker,
          quantity,
          dayjs(date, INPUT_DATE_FORMAT)
        );
      }
    }
  }

  for (let trade of trades) {
    const {
      account,
      batchCode,
      closePrice,
      commission,
      date,
      quantity,
      stockPrice,
      strike,
      ticker: displayTicker,
      tradePrice,
      type,
    } = trade;

    const { colour, currency, optionSize, ticker } =
      tickers[tickersMap[displayTicker] ?? displayTicker];

    if (!optionSize) {
      throw new Error(`Option size missing for ${ticker}`);
    }
    const netCumulativePremium = tradePrice * optionSize - commission;

    if (type === 'Put') {
      if (quantity < 0) {
        if (closePrice && closePrice < strike) {
          if (!batchCode) {
            throw new Error(`Batch code missing for ${ticker}`);
          }
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
            quantity: 1,
            ticker,
          };
        } else {
          // Put only (including current assignable puts)
          stocks[ticker].putOnly = stocks[ticker].putOnly || { premium: 0 };
          // Using the non-null assertion operator because
          // TypeScript infers that `stocks[ticker].putOnly` may be `undefined` otherwise
          stocks[ticker].putOnly!.premium += tradePrice * optionSize - commission;
        }
      } else {
        if (batchCode) {
          throw new Error("A put that has been assigned can't be bought back.");
        }
        stocks[ticker].putOnly!.premium -= tradePrice * optionSize + commission;
      }
    }

    if (type === 'Call') {
      if (quantity < 0) {
        const batch = batches[batchCode as string] || {};
        batch.netCumulativePremium += netCumulativePremium;

        if (closePrice && closePrice > strike) {
          batch.exit = { value: strike * optionSize, method: 'Call' };
        }

        const expiry = dayjs(trade.expiry, INPUT_DATE_FORMAT);

        if (now && expiry.isSameOrAfter(now, 'day')) {
          batch.currentCall = {
            account,
            batchCode: batchCode as string,
            commission,
            date: dayjs(date, INPUT_DATE_FORMAT),
            expiry,
            quantity,
            stockPrice,
            strike,
            ticker,
            tradePrice,
            type: 'Call',
          };
        }
      } else {
        if (batchCode) {
          // Call was bought to close
          const batch = batches[batchCode];
          batch.netCumulativePremium -= netCumulativePremium;
          // Clear current call
          if (batch.currentCall) {
            batch.currentCall = undefined;
          }
        } else {
          // TODO
        }
      }
    }
  }

  for (let transaction of transactions) {
    const {
      batchCodes: batchCodesStr,
      commission,
      date,
      quantity,
      stockPrice,
      ticker: displayTicker,
      type,
    } = transaction;

    const { optionSize, ticker } = tickers[tickersMap[displayTicker] ?? displayTicker];

    if (type === 'Sale') {
      if (batchCodesStr) {
        if (!optionSize) {
          throw new Error(`Option size missing for ${ticker}`);
        }
        const batchCodes = batchCodesStr.includes(',') ? batchCodesStr.split(',') : [batchCodesStr];
        for (let batchCode of batchCodes) {
          const batch = batches[batchCode];
          batch.exit = {
            value: stockPrice * optionSize - commission / batchCodes.length,
            method: 'Sale',
          };
        }
      } else {
        const partialBatch = stocks[ticker].partialBatch;
        if (!partialBatch) {
          throw new Error(`Partial batch missing for ${ticker}`);
        }
        partialBatch.acquisitionCost -= stockPrice * quantity - commission;
        partialBatch.quantity -= getCurrentQuantity(
          ticker,
          quantity,
          dayjs(date, INPUT_DATE_FORMAT)
        );
      }
    }
  }

  return { batches, stocks };
};

export default processData;
