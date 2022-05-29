import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import trades from '../data/options.csv';
import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

const ACCOUNT = 'Account';
const BATCH = 'Batch';
const CLOSE_PRICE = 'Close price';
const COMMISSION = 'Commission';
const EXPIRY_DATE = 'Expiry';
const STOCK_PRICE_AT_TIME_OF_TRADE = 'Price then';
const STRIKE = 'Strike';
const TICKER = 'Ticker';
const TRADE_DATE = 'Trade date';
const TRADE_PRICE = 'Trade price';
const TYPE = 'Type';

const ASSIGNMENT_PCT = 'Assignment %';
const AVERAGE_COST = 'Avg cost';
const CALL = 'Call';
const CASH_EQUIVALENT_GBP = 'Cash equiv GBP';
const DAYS_TOTAL = 'Days total';
const DTE_CURRENT = 'Current DTE';
const DTE_TOTAL = 'DTE';
const RETURN_PCT_IF_ASSIGNED = 'Return % if assigned';
const RETURN_30D_PCT_IF_ASSIGNED = 'Return 30D % if assigned';
const RETURN_30D_PCT_LAST_CALL = 'Return 30D % last call';
const RETURN_1Y_PCT_IF_ASSIGNED = 'Return 1Y % if assigned';
const RETURN_GBP_CURRENT = 'Return GBP current';
const RETURN_GBP_IF_ASSIGNED = 'Return GBP if assigned';
const RETURN_GBP_LAST_CALL = 'Return GBP last call';
const PRICE_INCREASE = 'Price increase';
const PUT = 'Put';
const PUT_TRADE_DATE = 'Put trade date';
const STATUS = 'Status';
const STOCK_PRICE_CURRENT = 'Current';
const STOCK_PRICE_HIGH = 'High';
const STOCK_PRICE_HIGH_PCT = 'High %';

const WHEELING = 'wheeling';

const CSV_DATE_FORMAT = 'DD/MM/YYYY';
const NOW = dayjs();

const getReturnPctForPeriod = (returnPct, days, newPeriod) =>
  ((1 + returnPct) ** (1 / days)) ** newPeriod - 1;

export async function getServerSideProps() {
  return {
    props: { trades },
  };
}

export default function Home({ trades }) {
  const displayDateFormat = 'D MMM';
  const date = (x) => x.format(displayDateFormat);
  const pctOne = (x) => `${(100 * x).toFixed(1)}%`;
  const decimalTwo = (x) => x.toFixed(2);
  const thousands = (x) => x && x.toLocaleString().split('.')[0];

  const headings = [
    { name: ACCOUNT },
    { name: BATCH },
    { name: AVERAGE_COST, format: decimalTwo },
    { name: STOCK_PRICE_CURRENT, format: decimalTwo },
    { name: RETURN_GBP_CURRENT, format: thousands },
    { name: TRADE_DATE, format: date },
    { name: EXPIRY_DATE, format: date },
    { name: DTE_TOTAL },
    { name: DTE_CURRENT },
    { name: TRADE_PRICE, format: decimalTwo },
    { name: STOCK_PRICE_AT_TIME_OF_TRADE, format: decimalTwo },
    { name: STRIKE, format: decimalTwo },
    { name: STATUS },
    { name: ASSIGNMENT_PCT, format: pctOne },
    { name: STOCK_PRICE_HIGH, format: decimalTwo },
    { name: STOCK_PRICE_HIGH_PCT, format: pctOne },
    { name: PRICE_INCREASE, format: thousands },
    { name: RETURN_30D_PCT_LAST_CALL, format: pctOne },
    { name: RETURN_GBP_LAST_CALL, format: thousands },
    { name: CASH_EQUIVALENT_GBP, format: thousands },
    { name: DAYS_TOTAL },
    { name: RETURN_GBP_IF_ASSIGNED, format: thousands },
    { name: RETURN_PCT_IF_ASSIGNED, format: pctOne },
    { name: RETURN_30D_PCT_IF_ASSIGNED, format: pctOne },
    { name: RETURN_1Y_PCT_IF_ASSIGNED, format: pctOne },
  ];

  const batches = {};
  for (let trade of trades) {
    const { size } = tickers[trade[TICKER]];

    const tradePrice = trade[TRADE_PRICE];
    const strike = trade[STRIKE];
    const commission = trade[COMMISSION];
    const batch = batches[trade[BATCH]];
    const closePrice = trade[CLOSE_PRICE];
    const tradeDate = dayjs(trade[TRADE_DATE], CSV_DATE_FORMAT);

    if (trade[TYPE] === PUT && trade[CLOSE_PRICE] && closePrice < strike) {
      batches[trade[BATCH]] = {
        [ACCOUNT]: trade[ACCOUNT],
        [BATCH]: trade[BATCH],
        [AVERAGE_COST]: strike - tradePrice + commission / size,
        [WHEELING]: true,
        [PUT_TRADE_DATE]: tradeDate,
      };
    }

    if (trade[TYPE] === CALL) {
      batch[AVERAGE_COST] -= tradePrice - commission / size;

      if (closePrice && closePrice > strike) {
        batch[WHEELING] = false;
      }

      const expiryDate = dayjs(trade[EXPIRY_DATE], CSV_DATE_FORMAT);
      if (expiryDate.isSameOrAfter(NOW, 'day')) {
        batch[TRADE_DATE] = tradeDate;
        batch[EXPIRY_DATE] = expiryDate;
        batch[TRADE_PRICE] = tradePrice;
        batch[STRIKE] = strike;
        batch[DTE_CURRENT] = expiryDate.add(1, 'day').diff(NOW, 'day');
        batch[DTE_TOTAL] = expiryDate.diff(tradeDate, 'day');
        const priceThen = trade[STOCK_PRICE_AT_TIME_OF_TRADE];
        batch[STOCK_PRICE_AT_TIME_OF_TRADE] = priceThen;
        const daysTotal = expiryDate.diff(batch[PUT_TRADE_DATE], 'day');
        batch[DAYS_TOTAL] = daysTotal;
        const returnPctLastCall = (tradePrice * size - commission) / (priceThen * size);
        const dteLastCall = expiryDate.diff(tradeDate, 'day');
        batch[RETURN_30D_PCT_LAST_CALL] = getReturnPctForPeriod(returnPctLastCall, dteLastCall, 30);
        const returnPctIfAssigned = strike / batch[AVERAGE_COST] - 1;
        batch[RETURN_PCT_IF_ASSIGNED] = returnPctIfAssigned;
        batch[RETURN_30D_PCT_IF_ASSIGNED] = getReturnPctForPeriod(
          returnPctIfAssigned,
          daysTotal,
          30
        );
        batch[RETURN_1Y_PCT_IF_ASSIGNED] = getReturnPctForPeriod(
          returnPctIfAssigned,
          daysTotal,
          365
        );
        batch[STOCK_PRICE_HIGH] = strike + tradePrice - commission / size;
      }
    }
  }

  const orderedBatches = Object.entries(batches)
    .sort(([a], [b]) => a.localeCompare(b))
    .sort(([, a], [, b]) => a[ACCOUNT].localeCompare(b[ACCOUNT]));

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
        {orderedBatches
          .filter(([, { wheeling }]) => wheeling)
          .map(([, batchData], rowIndex) => {
            const orderedRowValues = headings.map((elem) => ({
              ...elem,
            }));
            const set = (column) =>
              (orderedRowValues.find(({ name }) => name === column).value = batchData[column]);

            set(ACCOUNT);
            set(ASSIGNMENT_PCT);
            set(AVERAGE_COST);
            set(BATCH);
            set(DAYS_TOTAL);
            set(DTE_CURRENT);
            set(DTE_TOTAL);
            set(EXPIRY_DATE);
            set(PRICE_INCREASE);
            set(RETURN_1Y_PCT_IF_ASSIGNED);
            set(RETURN_30D_PCT_IF_ASSIGNED);
            set(RETURN_PCT_IF_ASSIGNED);
            set(RETURN_30D_PCT_LAST_CALL);
            set(STOCK_PRICE_AT_TIME_OF_TRADE);
            set(STOCK_PRICE_HIGH);
            set(STOCK_PRICE_HIGH_PCT);
            set(STRIKE);
            set(TRADE_DATE);
            set(TRADE_PRICE);

            return (
              <tr key={rowIndex}>
                {orderedRowValues.map(({ value, format = (v) => v }, index) => (
                  <td className={cx(styles.td, styles.trades)} key={index}>
                    {value && format(value)}
                  </td>
                ))}
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}
