import React, { useEffect, useState } from 'react';
import cx from 'classnames';
import dayjs from 'dayjs';

import CloseTradePriceInput from '../components/CloseTradePriceInput';

import processData from '../utils/processData';
import {
  calcDteCurrent,
  calcDteTotal,
  calcPriceIncrease,
  calcReturnPctForPeriod,
  removeNullValues,
} from '../utils';
import { dateShortTerm, decimalTwo, pctOne, thousands } from '../utils/format';

import {
  Batch,
  CallRow,
  CallRowTotal,
  CurrentTickerPrices,
  TradeData,
  TransactionData,
} from '../types';

import { DISPLAY } from '../constants';

// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import tickers from '../data/tickers';
import accounts from '../data/accounts';

import styles from '../styles/Table.module.css';

const NOW = dayjs();

const Call = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [closeTradePrices, setCloseTradePrices] = useState<{ [key: string]: number }>({});
  const [rates, setRates] = useState<{ [key: string]: number }>(null);
  const [currentTickerPrices, setCurrentTickerPrices] = useState<CurrentTickerPrices>(null);

  useEffect(() => {
    setIsLoading(true);
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
    };
    fetchForexRates().catch(console.error);

    const fetchCallTickerPrices = async () => {
      const response = await fetch('/api/callTickerPrices');
      const data = await response.json();
      setCurrentTickerPrices(data.currentTickerPrices);
    };
    fetchCallTickerPrices().catch(console.error);
    setIsLoading(false);
  }, []);

  const transactions: TransactionData[] = transactionsData.map(removeNullValues);
  const trades: TradeData[] = tradesData.map(removeNullValues);

  const { batches } = processData(NOW, transactions, trades);

  const batchesWithCalls = Object.entries(batches)
    .filter(([, batch]) => batch.currentCall)
    .sort(([a], [b]) => a.localeCompare(b))
    .sort(([, a], [, b]) => a.account.localeCompare(b.account));

  const callIds = batchesWithCalls.map(([batchCode]) => batchCode).join(',');

  useEffect(() => {
    setIsLoading(true);
    const fetchCallCloseTradePrices = async () => {
      const response = await fetch(`/api/getRedisData?keys=${callIds}`);
      const data = await response.json();
      setCloseTradePrices(data.values);
    };
    fetchCallCloseTradePrices().catch(console.error);

    setIsLoading(false);
  }, [callIds]);

  if (isLoading) return <p>Loading...</p>;
  if (!rates || !currentTickerPrices) return <p>Data missing.</p>;

  const batchesWithoutCalls = Object.entries(batches)
    .filter(([, batch]) => !batch.currentCall)
    .sort(([a], [b]) => a.localeCompare(b))
    .sort(([, a], [, b]) => a.account.localeCompare(b.account));

  const headings: {
    name: keyof CallRow;
    format?: Function;
    align?: 'default' | 'right';
    scope?: 'all';
  }[] = [
    { name: 'account', align: 'default', scope: 'all' },
    { name: 'batchCode', align: 'default', scope: 'all' },
    { name: 'unitAcquisitionCost', format: decimalTwo, scope: 'all' },
    { name: 'netCost', format: decimalTwo, scope: 'all' },
    { name: 'costBasisDrop', format: pctOne, scope: 'all' },
    { name: 'returnPct', format: pctOne, scope: 'all' },
    { name: 'returnGBP', format: thousands, scope: 'all' },
    { name: 'valueGBP', format: thousands, scope: 'all' },
    { name: 'date', format: dateShortTerm, align: 'default' },
    { name: 'expiry', format: dateShortTerm, align: 'default' },
    { name: 'dteTotal' },
    { name: 'dteCurrent' },
    { name: 'tradePrice', format: decimalTwo },
    { name: 'stockPrice', format: decimalTwo },
    { name: 'current', format: decimalTwo, scope: 'all' },
    { name: 'strike', format: decimalTwo },
    { name: 'status', align: 'default' },
    { name: 'assignmentPct', format: pctOne },
    { name: 'high', format: decimalTwo },
    { name: 'highPct', format: pctOne },
    { name: 'priceIncreaseGBP', format: thousands },
    { name: 'return30DPctLastCall', format: pctOne },
    { name: 'closeTradePrice' },
    { name: 'return30DPctResidual', format: pctOne },
    { name: 'returnGBPLastCall', format: thousands },
    { name: 'daysTotal' },
    { name: 'returnGBPIfAssigned', format: thousands },
    { name: 'returnPctIfAssigned', format: pctOne },
    { name: 'return30DPctIfAssigned', format: pctOne },
    { name: 'return1YPctIfAssigned', format: pctOne },
  ];

  const renderTableBody = (
    batches: [string, Batch][],
    headingFilterFunction = (value) => value
  ) => {
    // eslint-disable-next-line no-unused-vars
    const totals: { [key in keyof CallRowTotal]: number } = {
      returnGBP: 0,
      returnGBPLastCall: 0,
      valueGBP: 0,
    };

    return (
      <tbody>
        {batches
          .filter(([, { exitValue }]) => !exitValue)
          .map(([, batchData], rowIndex) => {
            const orderedRowValues = headings.filter(headingFilterFunction).map((heading) => ({
              ...heading,
            }));

            const {
              account,
              acquisitionCost,
              acquisitionDate,
              batchCode,
              currentCall,
              netCumulativePremium,
              quantity,
              ticker,
            } = batchData;
            const { commission, date, expiry, stockPrice, strike, tradePrice } = currentCall || {};
            const { colour, currency, optionSize } = tickers[ticker];
            const forexRate = rates[currency];
            const current = currentTickerPrices[ticker];

            const daysTotal = expiry?.diff(acquisitionDate, 'day');
            const high = strike + tradePrice - commission / optionSize;
            const returnPctLastCall =
              (tradePrice * optionSize - commission) / (stockPrice * optionSize);
            const dteLastCall = expiry?.diff(date, 'day');
            const unitAcquisitionCost = acquisitionCost / optionSize;
            const netCost = (acquisitionCost - netCumulativePremium) / optionSize;
            const returnPctIfAssigned = strike / netCost - 1;

            const priceIncrease = calcPriceIncrease(current, high, optionSize);
            const returnCurrent = (current - netCost) * optionSize;
            const returnIfAssigned = (strike - netCost) * optionSize;
            const returnLastCall = optionSize * tradePrice - commission;
            const valueCurrent = quantity * current;
            const valueIfAssigned = strike * optionSize;

            const returnGBP = Math.min(returnCurrent, returnIfAssigned || Infinity) / forexRate;
            const valueGBP = Math.min(valueCurrent, valueIfAssigned || Infinity) / forexRate;
            const returnGBPLastCall = returnLastCall / forexRate;

            const closeTradePrice = closeTradePrices[batchCode];

            const effectiveCloseNetReturn =
              closeTradePrice > 0 ? optionSize * closeTradePrice - commission : 0;
            const effectiveCloseNetReturnPct = effectiveCloseNetReturn / valueCurrent;
            const dteCurrent = calcDteCurrent(expiry, NOW);
            const return30DPctResidual = calcReturnPctForPeriod(
              effectiveCloseNetReturnPct,
              dteCurrent,
              30
            );

            const row: CallRow = {
              account,
              assignmentPct: strike / current - 1,
              batchCode,
              closeTradePrice: (
                <CloseTradePriceInput
                  batchId={batchCode}
                  closeTradePrices={closeTradePrices}
                  setCloseTradePrices={setCloseTradePrices}
                />
              ),
              costBasisDrop: netCost / unitAcquisitionCost - 1,
              current,
              date,
              daysTotal,
              dteCurrent,
              dteTotal: calcDteTotal(expiry, date),
              expiry,
              high,
              highPct: high / current - 1,
              netCost,
              priceIncreaseGBP: priceIncrease / forexRate,
              return1YPctIfAssigned: calcReturnPctForPeriod(returnPctIfAssigned, daysTotal, 365),
              return30DPctIfAssigned: calcReturnPctForPeriod(returnPctIfAssigned, daysTotal, 30),
              return30DPctLastCall: calcReturnPctForPeriod(returnPctLastCall, dteLastCall, 30),
              return30DPctResidual,
              returnGBP,
              returnGBPIfAssigned: returnIfAssigned / forexRate,
              returnGBPLastCall,
              returnPct: Math.min(current, strike || Infinity) / netCost - 1,
              returnPctIfAssigned,
              status: strike < current ? 'Assignable' : null,
              stockPrice,
              strike,
              tradePrice,
              unitAcquisitionCost,
              valueGBP,
            };

            totals.returnGBP += returnGBP;
            totals.returnGBPLastCall += returnGBPLastCall;
            totals.valueGBP += valueGBP;

            const accountColour = accounts[account].colour;

            return (
              <tr key={rowIndex}>
                {orderedRowValues.map(({ name, format = (v) => v, align = 'right' }, index) => {
                  const showContrast = name !== 'account' && name !== 'batchCode';
                  const showZeroValues =
                    name === 'assignmentPct' ||
                    name === 'dteCurrent' ||
                    name === 'highPct' ||
                    name === 'costBasisDrop';
                  return (
                    <td
                      className={cx({
                        [styles[align]]: align === 'right',
                        [colour]: name === 'batchCode',
                        [accountColour]: name === 'account',
                        [styles.contrast]: rowIndex % 2 && showContrast,
                        [styles.freezeFirstTdColumn]: index === 0,
                        [styles.freezeSecondTdColumn]: index === 1,
                        [styles.dwarfed]:
                          current > high &&
                          (name === 'returnGBP' || name === 'returnPct' || name === 'valueGBP'),
                      })}
                      key={index}
                    >
                      {(!!row[name] || showZeroValues) && format(row[name])}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        <tr>
          {headings
            .filter(headingFilterFunction)
            .map(({ name, format, align = 'right' }, index) => (
              <td
                className={cx(styles.total, {
                  [styles[align]]: align === 'right',
                })}
                key={index}
              >
                {totals[name] && format(totals[name])}
              </td>
            ))}
        </tr>
      </tbody>
    );
  };

  return (
    <>
      <table className={styles.table}>
        <thead>
          <tr>
            {headings.map(({ name }, index) => (
              <th
                className={cx(styles.freezeFirstThRow, styles.white, styles.rotate, {
                  [styles.freezeFirstThCell]: index === 0,
                  [styles.freezeSecondThCell]: index === 1,
                })}
                key={index}
              >
                {DISPLAY[name] || name}
              </th>
            ))}
          </tr>
        </thead>
        {renderTableBody(batchesWithCalls)}
      </table>

      <table className={styles.table}>
        <thead>
          <tr>
            {headings
              .filter(({ scope }) => scope === 'all')
              .map(({ name }, index) => (
                <th
                  className={cx(styles.freezeFirstThRow, styles.white, {
                    [styles.freezeFirstThCell]: index === 0,
                    [styles.freezeSecondThCell]: index === 1,
                  })}
                  key={index}
                >
                  {DISPLAY[name] || name}
                </th>
              ))}
          </tr>
        </thead>
        {renderTableBody(batchesWithoutCalls, ({ scope }) => scope === 'all')}
      </table>
    </>
  );
};

export default Call;
