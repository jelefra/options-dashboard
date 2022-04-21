import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import tradeData from '../data/options.csv';
import tickers from '../data/tickers';

import styles from '../styles/Put.module.css';

const ACCOUNT = 'Account';
const COMMISSION = 'Commission';
const EXPIRY_DATE = 'Expiry';
const STOCK_PRICE_AT_TIME_OF_TRADE = 'Price then';
const STRIKE = 'Strike';
const TICKER = 'Ticker';
const TRADE_DATE = 'Trade date';
const TRADE_PRICE = 'Trade price';
const TYPE = 'Type';

const DTE_CURRENT = 'Current DTE';
const DTE_TOTAL = 'DTE';
const PUT = 'Put';
const STOCK_PRICE_HIGH = 'High';
const STOCK_PRICE_LOW = 'Low';

const CSV_DATE_FORMAT = 'DD/MM/YYYY';

const currentPuts = (trade) => {
  const { [TYPE]: type, [EXPIRY_DATE]: expiryDate } = trade;
  return type === PUT && dayjs(expiryDate, CSV_DATE_FORMAT).isSameOrAfter(dayjs(), 'day');
};

export async function getServerSideProps() {
  return {
    props: { tradeData },
  };
}

export default function Home({ tradeData }) {
  const displayDateFormat = 'D MMM';
  const date = (x) => x.format(displayDateFormat);
  const decimalTwo = (x) => x.toFixed(2);

  const headings = [
    { name: ACCOUNT },
    { name: TICKER },
    { name: TRADE_DATE, format: date },
    { name: EXPIRY_DATE, format: date },
    { name: DTE_TOTAL },
    { name: DTE_CURRENT },
    { name: TRADE_PRICE, format: decimalTwo },
    { name: STOCK_PRICE_AT_TIME_OF_TRADE, format: decimalTwo },
    { name: STRIKE, format: decimalTwo },
    { name: STOCK_PRICE_LOW, format: decimalTwo },
    { name: STOCK_PRICE_HIGH, format: decimalTwo },
  ];

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
        {tradeData
          .filter(currentPuts)
          .sort((a, b) => a[TICKER].localeCompare(b[TICKER]))
          .sort((a, b) => a[ACCOUNT].localeCompare(b[ACCOUNT]))
          .map((row, rowIndex) => {
            const orderedRowValues = headings.map((elem) => ({
              ...elem,
            }));
            const set = (column, value) =>
              (orderedRowValues.find(({ name }) => name === column).value = value);

            const account = row[ACCOUNT];
            const ticker = row[TICKER];
            const { size } = tickers[ticker];
            const tradeDate = dayjs(row[TRADE_DATE], CSV_DATE_FORMAT);
            const expiryDateBeginning = dayjs(row[EXPIRY_DATE], CSV_DATE_FORMAT);
            const expiryDate = expiryDateBeginning.add(1, 'day');
            const today = dayjs();
            const dteTotal = expiryDateBeginning.diff(tradeDate, 'day');
            const tradePrice = row[TRADE_PRICE];
            const strike = row[STRIKE];
            const commission = row[COMMISSION];
            const priceThen = row[STOCK_PRICE_AT_TIME_OF_TRADE];
            const stockPriceLow = strike - tradePrice - commission / size;
            const stockPriceHigh = priceThen + tradePrice - commission / size;

            set(ACCOUNT, account);
            set(DTE_CURRENT, expiryDate.diff(today, 'day'));
            set(DTE_TOTAL, dteTotal);
            set(EXPIRY_DATE, expiryDateBeginning);
            set(STRIKE, strike);
            set(STOCK_PRICE_AT_TIME_OF_TRADE, priceThen);
            set(STOCK_PRICE_LOW, stockPriceLow);
            set(STOCK_PRICE_HIGH, stockPriceHigh);
            set(TICKER, ticker);
            set(TRADE_DATE, tradeDate);
            set(TRADE_PRICE, tradePrice);

            return (
              <tr key={rowIndex}>
                {orderedRowValues.map(({ value, format = (v) => v }, index) => (
                  <td className={cx(styles.td, styles.trades)} key={index}>
                    {format(value)}
                  </td>
                ))}
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}
