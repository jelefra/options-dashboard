import cx from 'classnames';
import dayjs, { Dayjs } from 'dayjs';
import Head from 'next/head';
import { useEffect, useState } from 'react';

import CloseTradePriceInput from '../components/CloseTradePriceInput';
import Loading from '../components/Loading';
import { DISPLAY, INPUT_DATE_FORMAT, MINIMUM_RETURN_THRESHOLD } from '../constants';
import accounts from '../data/accounts';
import earnings from '../data/earnings';
// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import styles from '../styles/Table.module.css';
import {
  Batch,
  Call as CallType,
  CallRowWithCurrentCall,
  CurrentTickerPrices,
  ForexRates,
  Position,
  Positions,
  TradeData,
  TransactionData,
} from '../types';
import {
  areSameCall,
  calcDteCurrent,
  calcDteTotal,
  calcPriceIncrease,
  calcReturnPctForPeriod,
  categoriseEarnings,
  formatDaysToEarnings,
  getPosition,
  getPositionsKeys,
  removeNullValues,
} from '../utils';
import { dateShortTerm, decimalTwo, pctOne, thousands } from '../utils/format';
import processData from '../utils/processData';

const NOW = dayjs();

const Call = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [closeTradePrices, setCloseTradePrices] = useState<{ [key: string]: number | null }>({});
  const [rates, setRates] = useState<ForexRates>({});
  const [currentTickerPrices, setCurrentTickerPrices] = useState<CurrentTickerPrices>({});
  const [positions, setPositions] = useState<Position[]>([]);

  const positionsKeys = getPositionsKeys(accounts);

  useEffect(() => {
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
    };

    fetchForexRates()
      .then(() => setIsLoading(false))
      .catch(console.error);
  }, []);

  const transactions: TransactionData[] = transactionsData.map(removeNullValues);
  const trades: TradeData[] = tradesData.map(removeNullValues);

  const { batches } = processData({ transactions, trades, currentTickerPrices, now: NOW });

  const batchesSorted = Object.entries(batches)
    .sort(([a], [b]) => a.localeCompare(b))
    .sort(([, a], [, b]) => a.account.localeCompare(b.account));

  const batchesGrouped = batchesSorted.reduce((grouped: Batch[], [, current]) => {
    const [last] = grouped.slice(-1);
    if (areSameCall(last, current)) {
      grouped.pop();
      const newBatchCode = last.batchCode.match(/[^-]+/) + '-' + current.batchCode.match(/\d+/);
      grouped.push({ ...current, batchCode: newBatchCode, quantity: last.quantity + 1 });
    } else {
      grouped.push({ ...current, quantity: 1 });
    }
    return grouped;
  }, []);

  const batchesWithCalls = batchesGrouped.filter((batch) => batch.currentCall);

  const callIds = batchesWithCalls.map(({ batchCode }) => batchCode).join(',');

  useEffect(() => {
    const fetchCallCloseTradePrices = async () => {
      const response = await fetch(`/api/getRedisKeys?keys=${callIds}`);
      const data = await response.json();
      setCloseTradePrices(data.values);
    };
    fetchCallCloseTradePrices().catch(console.error);
  }, [callIds]);

  useEffect(() => {
    const fetchCallTickerPrices = async () => {
      const response = await fetch('/api/callTickerPrices');
      const data = await response.json();
      setCurrentTickerPrices(data.currentTickerPrices);
    };
    fetchCallTickerPrices().catch(console.error);
  }, []);

  useEffect(() => {
    const fetchPositions = async () => {
      const response = await fetch(`/api/getRedisKeys?keys=${positionsKeys}`);
      const data: { values: Positions } = await response.json();
      setPositions(
        Object.values(data.values).flatMap((positionsTimestamped) => positionsTimestamped?.allData)
      );
    };
    fetchPositions().catch(console.error);
  }, [positionsKeys]);

  if (isLoading) return <Loading />;
  if (!rates || !currentTickerPrices) return <p>Data missing.</p>;

  const batchesWithoutCalls = batchesGrouped.filter((batch) => !batch.currentCall && !batch.exit);

  type Heading = {
    name: keyof CallRowWithCurrentCall;
    format?: Function;
    align?: 'default' | 'right';
    scope?: 'all';
  };

  const headings: Heading[] = [
    { name: 'account', align: 'default', scope: 'all' },
    { name: 'batchCode', align: 'default', scope: 'all' },
    { name: 'quantity', scope: 'all' },
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
    { name: 'daysToEarnings', format: formatDaysToEarnings },
    { name: 'tradePrice', format: decimalTwo },
    { name: 'marketPrice', format: decimalTwo },
    { name: 'optionReturnPct', format: pctOne },
    { name: 'stockPrice', format: decimalTwo },
    { name: 'strike', format: decimalTwo },
    { name: 'current', format: decimalTwo, scope: 'all' },
    { name: 'status', align: 'default' },
    { name: 'assignmentPct', format: pctOne },
    { name: 'high', format: decimalTwo },
    { name: 'highPct', format: pctOne },
    { name: 'priceIncreaseGBP', format: thousands },
    { name: 'return30DPctLastCall', format: pctOne },
    { name: 'closeTradePrice' },
    { name: 'return30DPctResidual', format: pctOne },
    { name: 'return30DPctResidualEstimate', format: pctOne },
    { name: 'returnGBPLastCall', format: thousands },
    { name: 'daysTotal' },
    { name: 'returnGBPIfAssigned', format: thousands },
    { name: 'returnPctIfAssigned', format: pctOne },
    { name: 'return30DPctIfAssigned', format: pctOne },
    { name: 'return1YPctIfAssigned', format: pctOne },
  ];

  const renderTableBody = (
    batches: Batch[],
    // eslint-disable-next-line no-unused-vars
    headingFilterFunction: (heading: Heading) => boolean = () => true
  ) => {
    // eslint-disable-next-line no-unused-vars
    // TODO use CallRowTotal GenericCallRowTotal / CallRowWithCurrentCallTotal types
    const totals: { [key: string]: number } = {
      returnGBP: 0,
      returnGBPLastCall: 0,
      valueGBP: 0,
      priceIncreaseGBP: 0,
    };

    return (
      <tbody>
        {batches.map((batchData, rowIndex) => {
          const orderedRowValues = headings.filter(headingFilterFunction).map((heading) => ({
            ...heading,
          }));

          const {
            account,
            acquisitionCost,
            acquisitionDate,
            batchCode,
            colour,
            currency,
            current,
            currentCall,
            netCumulativePremium,
            optionSize,
            quantity,
            ticker,
          } = batchData;

          const forexRate = rates[currency];
          const earningsDate = dayjs(earnings[ticker]?.date, INPUT_DATE_FORMAT);
          const unitAcquisitionCost = acquisitionCost / optionSize;
          const netCost = (acquisitionCost - netCumulativePremium) / optionSize;
          const valueCurrent = current && optionSize * current;

          const getCurrentCallValues = (currentCall: CallType) => {
            const { commission, date, expiry, stockPrice, strike, tradePrice } = currentCall;
            const high = current && strike + tradePrice - commission / optionSize;
            const priceIncrease = current && high && calcPriceIncrease(current, high, optionSize);
            const priceIncreaseGBP = priceIncrease && priceIncrease / forexRate;
            const dteCurrent = calcDteCurrent(expiry, NOW);
            const daysToEarnings = earningsDate.diff(expiry, 'day');
            const position = getPosition(positions, ticker, expiry, strike, 'Call');
            const marketPrice = position?.mktPrice;
            const optionReturnPct = marketPrice && 1 - marketPrice / tradePrice;
            const dteLastCall = expiry.diff(date, 'day');
            const daysTotal = expiry.diff(acquisitionDate, 'day');
            const closeTradePrice = closeTradePrices[batchCode];
            const effectiveCloseNetReturn =
              closeTradePrice && closeTradePrice > 0
                ? optionSize * closeTradePrice - commission
                : 0;
            const effectiveCloseNetReturnPct =
              valueCurrent && effectiveCloseNetReturn / valueCurrent;
            const return30DPctResidual =
              effectiveCloseNetReturnPct &&
              calcReturnPctForPeriod(effectiveCloseNetReturnPct, dteCurrent, 30);
            const returnPctResidualEstimate =
              marketPrice &&
              Math.max(optionSize * marketPrice - commission, 0) / (optionSize * stockPrice);
            const return30DPctResidualEstimate =
              returnPctResidualEstimate &&
              calcReturnPctForPeriod(returnPctResidualEstimate, dteCurrent, 30);
            const returnLastCall = quantity * optionSize * tradePrice - commission;
            const returnGBPLastCall = returnLastCall / forexRate;
            const returnIfAssigned = quantity * (strike - netCost) * optionSize;
            const returnPctIfAssigned = strike / netCost - 1;
            const returnPctLastCall =
              (tradePrice * optionSize - commission) / (stockPrice * optionSize);

            return {
              assignmentPct: current ? strike / current - 1 : undefined,
              closeTradePrice: (
                <CloseTradePriceInput
                  batchId={batchCode}
                  closeTradePrices={closeTradePrices}
                  setCloseTradePrices={setCloseTradePrices}
                />
              ),
              date,
              daysToEarnings,
              daysTotal,
              dteCurrent,
              dteTotal: calcDteTotal(expiry, date),
              expiry,
              high,
              highPct: high && current && high / current - 1,
              marketPrice,
              optionReturnPct,
              priceIncreaseGBP,
              return1YPctIfAssigned: calcReturnPctForPeriod(returnPctIfAssigned, daysTotal, 365),
              return30DPctIfAssigned: calcReturnPctForPeriod(returnPctIfAssigned, daysTotal, 30),
              return30DPctLastCall: calcReturnPctForPeriod(returnPctLastCall, dteLastCall, 30),
              return30DPctResidual,
              return30DPctResidualEstimate,
              returnGBPIfAssigned: returnIfAssigned / forexRate,
              returnGBPLastCall,
              returnPctIfAssigned,
              status: current && strike < current ? 'Assignable' : null,
              stockPrice,
              strike,
              tradePrice,
            };
          };

          const currentCallValues = currentCall ? getCurrentCallValues(currentCall) : undefined;

          const returnCurrent = current && (current - netCost) * optionSize;
          const returnIfAssigned =
            currentCallValues && (currentCallValues.strike - netCost) * optionSize;
          const valueIfAssigned = currentCallValues && currentCallValues.strike * optionSize;
          const returnGBP =
            returnCurrent &&
            (quantity * Math.min(returnCurrent, returnIfAssigned || Infinity)) / forexRate;
          const valueGBP =
            valueCurrent &&
            (quantity * Math.min(valueCurrent, valueIfAssigned || Infinity)) / forexRate;

          // TODO set type based on which table is rendered: CallRowWithCurrentCall | GenericCallRow
          const row = {
            account,
            batchCode,
            costBasisDrop: netCost / unitAcquisitionCost - 1,
            current,
            netCost,
            quantity,
            returnGBP,
            returnPct:
              current &&
              Math.min(
                current,
                currentCallValues ? currentCallValues.strike || Infinity : Infinity
              ) /
                netCost -
                1,
            unitAcquisitionCost,
            valueGBP,
            ...currentCallValues,
          };

          // TODO check total can be displayed instead of || 0
          totals.returnGBP += returnGBP || 0;
          totals.returnGBPLastCall += currentCallValues ? currentCallValues.returnGBPLastCall : 0;
          totals.valueGBP += valueGBP || 0;
          totals.priceIncreaseGBP += currentCallValues
            ? currentCallValues.priceIncreaseGBP || 0
            : 0;

          const accountColour = accounts[account].colour;

          return (
            <tr key={rowIndex}>
              {orderedRowValues.map(
                ({ name, format = (v: number | Dayjs) => v, align = 'right' }, index) => {
                  const showContrast = name !== 'account' && name !== 'batchCode';
                  const showZeroValuesNames: (keyof CallRowWithCurrentCall)[] = [
                    'assignmentPct',
                    'costBasisDrop',
                    'daysToEarnings',
                    'dteCurrent',
                    'highPct',
                    'return30DPctResidualEstimate',
                  ];

                  const showZeroValues = showZeroValuesNames.includes(name);

                  const earningsConfirmed = earnings[ticker]?.confirmed;
                  const daysToEarningsClass = categoriseEarnings(
                    earningsDate,
                    currentCall?.expiry,
                    NOW,
                    earningsConfirmed
                  );

                  return (
                    <td
                      className={cx({
                        [styles[align]]: align === 'right',
                        [colour]: name === 'batchCode',
                        [accountColour]: name === 'account',
                        [styles.contrast]: rowIndex % 2 && showContrast,
                        [styles.freezeFirstTdColumn]: index === 0,
                        [styles.freezeSecondTdColumn]: index === 1,
                        [styles.warning]:
                          currentCallValues &&
                          currentCallValues.high &&
                          current &&
                          current > currentCallValues.high &&
                          (name === 'returnGBP' || name === 'returnPct' || name === 'valueGBP'),
                        mute:
                          name === 'return30DPctResidualEstimate' &&
                          typeof row?.[name] !== undefined &&
                          // Using the non-null assertion operator because
                          // TypeScript infers that `row.return30DPctResidualEstimate` may be `undefined` otherwise
                          row.return30DPctResidualEstimate! > MINIMUM_RETURN_THRESHOLD,
                        [styles[daysToEarningsClass]]: name === 'daysToEarnings',
                      })}
                      key={index}
                    >
                      {(!!row[name] || showZeroValues) && format(row[name])}
                    </td>
                  );
                }
              )}
            </tr>
          );
        })}
        <tr>
          {headings
            .filter(headingFilterFunction)
            .map(({ name, format = (v: string | number) => v, align = 'right' }, index) => (
              <td
                className={cx(styles.total, {
                  [styles[align]]: align === 'right',
                })}
                key={index}
              >
                {name in totals && format(totals[name as keyof typeof totals])}
              </td>
            ))}
        </tr>
      </tbody>
    );
  };

  return (
    <>
      <Head>
        <title>Calls</title>
        <link rel="icon" href="/call.ico" />
      </Head>
      {!!batchesWithCalls.length && (
        <table className={styles.table}>
          <thead>
            <tr>
              {headings.map(({ name }, index) => (
                <th
                  className={cx(styles.freezeFirstThRow, styles.white, styles.rotate, {
                    [styles.freezeFirstThCell]: index === 0,
                    [styles.freezeSecondThCell]: index === 1,
                    [styles.columnWidthMd]: name === 'account' || name === 'return30DPctResidual',
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
      )}

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
