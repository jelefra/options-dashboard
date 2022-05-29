import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import trades from '../data/options.csv';
import tickers from '../data/tickers';
import accountColours from '../data/accountColours';

import isCurrentPut from '../utils/isCurrentPut';
import getTickerPrices from '../utils/getTickerPrices';

import styles from '../styles/Table.module.css';

const ACCOUNT = 'Account';
const COMMISSION = 'Commission';
const EXPIRY_DATE = 'Expiry';
const STOCK_PRICE_AT_TIME_OF_TRADE = 'Price then';
const STRIKE = 'Strike';
const TICKER = 'Ticker';
const TRADE_DATE = 'Trade date';
const TRADE_PRICE = 'Trade price';

const ASSIGNMENT_PCT = 'Assignment %';
const ASSIGNABLE = 'Assignable';
const CASH_EQUIVALENT_GBP = 'Cash equiv GBP';
const DTE_CURRENT = 'Current DTE';
const DTE_TOTAL = 'DTE';
const RETURN_30D_PCT = 'Return 30D %';
const RETURN_GBP = 'Return GBP';
const RETURN_GBP_DIFF = 'Difference';
const PRICE_INCREASE = 'Price increase';
const STATUS = 'Status';
const STOCK_PRICE_CURRENT = 'Current';
const STOCK_PRICE_HIGH = 'High';
const STOCK_PRICE_HIGH_PCT = 'High %';
const STOCK_PRICE_LOW = 'Low';
const STOCK_PRICE_LOW_PCT = 'Low %';

const CSV_DATE_FORMAT = 'DD/MM/YYYY';

export async function getServerSideProps() {
  const tickersToQuery = [
    ...new Set(trades.filter(isCurrentPut).map(({ [TICKER]: ticker }) => ticker)),
  ];

  const currentTickerPrices = await getTickerPrices(tickersToQuery);

  const endpoint = 'https://api.exchangerate.host/latest?base=GBP';
  const { rates } = await fetch(endpoint).then((response) => response.json());

  return {
    props: { trades, currentTickerPrices, rates },
  };
}

export default function Home({ trades, currentTickerPrices, rates }) {
  const displayDateFormat = 'D MMM';
  const date = (x) => x.format(displayDateFormat);
  const pctZero = (x) => `${(100 * x).toFixed(0)}%`;
  const pctOne = (x) => `${(100 * x).toFixed(1)}%`;
  const decimalTwo = (x) => x.toFixed(2);
  const thousands = (x) => x && x.toLocaleString().split('.')[0];

  const headings = [
    { name: ACCOUNT },
    { name: TICKER },
    { name: TRADE_DATE, format: date },
    { name: EXPIRY_DATE, format: date },
    { name: DTE_TOTAL, align: 'right' },
    { name: DTE_CURRENT, align: 'right' },
    { name: TRADE_PRICE, format: decimalTwo, align: 'right' },
    { name: STOCK_PRICE_AT_TIME_OF_TRADE, format: decimalTwo, align: 'right' },
    { name: STRIKE, format: decimalTwo, align: 'right' },
    { name: STOCK_PRICE_CURRENT, format: decimalTwo, align: 'right' },
    { name: STATUS },
    { name: STOCK_PRICE_LOW, format: decimalTwo, align: 'right' },
    { name: STOCK_PRICE_LOW_PCT, format: pctOne, align: 'right' },
    { name: ASSIGNMENT_PCT, format: pctOne, align: 'right' },
    { name: STOCK_PRICE_HIGH, format: decimalTwo, align: 'right' },
    { name: STOCK_PRICE_HIGH_PCT, format: pctOne, align: 'right' },
    { name: PRICE_INCREASE, format: thousands, align: 'right' },
    { name: RETURN_30D_PCT, format: pctOne, align: 'right' },
    { name: CASH_EQUIVALENT_GBP, format: thousands, align: 'right' },
    { name: RETURN_GBP, format: thousands, align: 'right' },
    { name: RETURN_GBP_DIFF, format: thousands, align: 'right' },
  ];

  const totals = {
    [CASH_EQUIVALENT_GBP]: { value: 0 },
    [RETURN_GBP]: { value: 0 },
    [RETURN_GBP_DIFF]: { value: 0 },
    [STATUS]: { value: 0, format: pctZero },
  };

  const countOfTrades = trades.filter(isCurrentPut).length;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {headings.map(({ name }, index) => (
            <th className={styles.th} key={index}>
              {name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {trades
          .filter(isCurrentPut)
          .sort((a, b) => a[TICKER].localeCompare(b[TICKER]))
          .sort((a, b) => a[ACCOUNT].localeCompare(b[ACCOUNT]))
          .map((row, rowIndex) => {
            const orderedRowValues = headings.map((elem) => ({
              ...elem,
            }));
            const set = (column, value) =>
              (orderedRowValues.find(({ name }) => name === column).value = value);

            const account = row[ACCOUNT];
            const accountColour = accountColours[account];
            const ticker = row[TICKER];
            const { size, currency, colour } = tickers[ticker];
            const tradeDate = dayjs(row[TRADE_DATE], CSV_DATE_FORMAT);
            const expiryDateBeginning = dayjs(row[EXPIRY_DATE], CSV_DATE_FORMAT);
            const expiryDate = expiryDateBeginning.add(1, 'day');
            const today = dayjs();
            const dteTotal = expiryDateBeginning.diff(tradeDate, 'day');
            const tradePrice = row[TRADE_PRICE];
            const strike = row[STRIKE];
            const commission = row[COMMISSION];
            const priceThen = row[STOCK_PRICE_AT_TIME_OF_TRADE];
            const currentStockPrice = currentTickerPrices[ticker];
            const stockPriceLow = strike - tradePrice - commission / size;
            const stockPriceHigh = priceThen + tradePrice - commission / size;
            const netReturn = size * tradePrice - commission;
            const cashEquivalent = size * strike;
            const convertToGBP = (amount) => amount / rates[currency];
            const cashEquivalentGBP = convertToGBP(cashEquivalent);
            const priceIncrease =
              currentStockPrice > stockPriceHigh ? (currentStockPrice - stockPriceHigh) * size : '';
            const status = strike > currentStockPrice ? ASSIGNABLE : '';
            const effectiveNetReturn = netReturn - Math.max(0, strike - currentStockPrice) * size;
            const effectiveNetReturnPct = effectiveNetReturn / cashEquivalent;
            const netReturnGBP = convertToGBP(netReturn);
            const effectiveNetReturn30DPct =
              Math.pow(Math.pow(1 + effectiveNetReturnPct, 1 / (dteTotal + 1)), 30) - 1;
            const effectiveNetReturnGBP = convertToGBP(effectiveNetReturn);
            const returnGBPDiff = effectiveNetReturnGBP - netReturnGBP;

            set(ACCOUNT, account);
            set(ASSIGNMENT_PCT, strike / currentStockPrice - 1);
            set(CASH_EQUIVALENT_GBP, cashEquivalentGBP);
            set(DTE_CURRENT, expiryDate.diff(today, 'day'));
            set(DTE_TOTAL, dteTotal);
            set(RETURN_30D_PCT, effectiveNetReturn30DPct);
            set(RETURN_GBP, effectiveNetReturnGBP);
            set(RETURN_GBP_DIFF, returnGBPDiff);
            set(EXPIRY_DATE, expiryDateBeginning);
            set(PRICE_INCREASE, priceIncrease);
            set(STATUS, status);
            set(STRIKE, strike);
            set(STOCK_PRICE_AT_TIME_OF_TRADE, priceThen);
            set(STOCK_PRICE_CURRENT, currentStockPrice);
            set(STOCK_PRICE_LOW, stockPriceLow);
            set(STOCK_PRICE_LOW_PCT, stockPriceLow / currentStockPrice - 1);
            set(STOCK_PRICE_HIGH, stockPriceHigh);
            set(STOCK_PRICE_HIGH_PCT, stockPriceHigh / currentStockPrice - 1);
            set(TICKER, ticker);
            set(TRADE_DATE, tradeDate);
            set(TRADE_PRICE, tradePrice);

            totals[CASH_EQUIVALENT_GBP].value += cashEquivalentGBP;
            totals[RETURN_GBP].value += effectiveNetReturnGBP;
            totals[RETURN_GBP_DIFF].value += returnGBPDiff;
            if (status === ASSIGNABLE) {
              totals[STATUS].value += 1 / countOfTrades;
            }

            return (
              <tr key={rowIndex}>
                {orderedRowValues.map(({ name, value, format = (v) => v, align }, index) => (
                  <td
                    className={cx(styles.td, styles.trades, {
                      [styles[align]]: !!align,
                      [colour]: name === TICKER,
                      [accountColour]: name === ACCOUNT,
                      [styles.contrast]: rowIndex % 2 && index > 1,
                    })}
                    key={index}
                  >
                    {format(value)}
                  </td>
                ))}
              </tr>
            );
          })}
        <tr>
          {headings.map(({ name, format, align }, index) => (
            <td
              className={cx(styles.td, {
                [styles[align]]: !!align,
              })}
              key={index}
            >
              {totals[name] &&
                totals[name].value &&
                (totals[name].format || format)(totals[name].value)}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
