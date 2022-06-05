import cx from 'classnames';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
dayjs.extend(isSameOrAfter);
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import getTickerPrices from '../utils/getTickerPrices';
import getForexRates from '../utils/getForexRates';
import getCallTickersToQuery from '../utils/getCallTickersToQuery';

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

const ASSIGNABLE = 'Assignable';
const ASSIGNED_STRIKE = 'Assigned strike';
const ASSIGNMENT_PCT = 'Assignment %';
const AVERAGE_COST = 'Avg cost';
const CALL = 'Call';
const CASH_EQUIVALENT_GBP = 'Cash equiv GBP';
const COST_BASIS_DROP_PCT = 'Cost basis drop %';
const DAYS_TOTAL = 'Days total';
const DTE_CURRENT = 'Current DTE';
const DTE_TOTAL = 'DTE';
const RETURN_PCT_CURRENT = 'Return %';
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
  const tickersToQuery = getCallTickersToQuery(trades);
  const currentTickerPrices = await getTickerPrices(tickersToQuery);
  const rates = await getForexRates();

  return {
    props: { trades, currentTickerPrices, rates },
  };
}

export default function Home({ trades, currentTickerPrices, rates }) {
  const displayDateFormat = 'D MMM';
  const date = (x) => x.format(displayDateFormat);
  const pctOne = (x) => `${(100 * x).toFixed(1)}%`;
  const decimalTwo = (x) => x.toFixed(2);
  const thousands = (x) => x && x.toLocaleString().split('.')[0];

  const headings = [
    { name: ACCOUNT },
    { name: BATCH },
    { name: ASSIGNED_STRIKE, format: decimalTwo, align: 'right' },
    { name: AVERAGE_COST, format: decimalTwo, align: 'right' },
    { name: COST_BASIS_DROP_PCT, format: pctOne, align: 'right' },
    { name: RETURN_PCT_CURRENT, format: pctOne, align: 'right' },
    { name: RETURN_GBP_CURRENT, format: thousands, align: 'right' },
    { name: TRADE_DATE, format: date },
    { name: EXPIRY_DATE, format: date },
    { name: DTE_TOTAL, align: 'right' },
    { name: DTE_CURRENT, align: 'right' },
    { name: TRADE_PRICE, format: decimalTwo, align: 'right' },
    { name: STOCK_PRICE_AT_TIME_OF_TRADE, format: decimalTwo, align: 'right' },
    { name: STOCK_PRICE_CURRENT, format: decimalTwo, align: 'right' },
    { name: STRIKE, format: decimalTwo, align: 'right' },
    { name: STATUS },
    { name: ASSIGNMENT_PCT, format: pctOne, align: 'right' },
    { name: STOCK_PRICE_HIGH, format: decimalTwo, align: 'right' },
    { name: STOCK_PRICE_HIGH_PCT, format: pctOne, align: 'right' },
    { name: PRICE_INCREASE, format: thousands, align: 'right' },
    { name: RETURN_30D_PCT_LAST_CALL, format: pctOne, align: 'right' },
    { name: RETURN_GBP_LAST_CALL, format: thousands, align: 'right' },
    { name: CASH_EQUIVALENT_GBP, format: thousands, align: 'right' },
    { name: DAYS_TOTAL, align: 'right' },
    { name: RETURN_GBP_IF_ASSIGNED, format: thousands, align: 'right' },
    { name: RETURN_PCT_IF_ASSIGNED, format: pctOne, align: 'right' },
    { name: RETURN_30D_PCT_IF_ASSIGNED, format: pctOne, align: 'right' },
    { name: RETURN_1Y_PCT_IF_ASSIGNED, format: pctOne, align: 'right' },
  ];

  const batches = {};
  for (let trade of trades) {
    const { size, currency } = tickers[trade[TICKER]];
    const forexRate = rates[currency];

    const tradePrice = trade[TRADE_PRICE];
    const strike = trade[STRIKE];
    const commission = trade[COMMISSION];
    const batch = batches[trade[BATCH]];
    const closePrice = trade[CLOSE_PRICE];
    const tradeDate = dayjs(trade[TRADE_DATE], CSV_DATE_FORMAT);
    const currentStockPrice = currentTickerPrices[trade[TICKER]];

    if (trade[TYPE] === PUT && trade[CLOSE_PRICE] && closePrice < strike) {
      batches[trade[BATCH]] = {
        [ACCOUNT]: trade[ACCOUNT],
        [BATCH]: trade[BATCH],
        [ASSIGNED_STRIKE]: trade[STRIKE],
        [AVERAGE_COST]: strike - tradePrice + commission / size,
        [WHEELING]: true,
        [PUT_TRADE_DATE]: tradeDate,
        [STOCK_PRICE_CURRENT]: currentStockPrice,
        [TICKER]: trade[TICKER],
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
        if (currentStockPrice > strike) {
          batch[STATUS] = ASSIGNABLE;
        }
        batch[ASSIGNMENT_PCT] = strike / currentStockPrice - 1;
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
        const stockPriceHigh = strike + tradePrice - commission / size;
        batch[STOCK_PRICE_HIGH] = stockPriceHigh;
        batch[STOCK_PRICE_HIGH_PCT] = stockPriceHigh / currentStockPrice - 1;
        if (currentStockPrice > stockPriceHigh) {
          batch[PRICE_INCREASE] = ((currentStockPrice - stockPriceHigh) * size) / forexRate;
        }
        batch[RETURN_GBP_LAST_CALL] = (tradePrice * size - commission) / forexRate;
        batch[CASH_EQUIVALENT_GBP] = (priceThen * size) / forexRate;
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
            const set = (column, value) =>
              (orderedRowValues.find(({ name }) => name === column).value = value);

            const currentStockPrice = currentTickerPrices[batchData[TICKER]];
            const averageCost = batchData[AVERAGE_COST];
            const { size, currency } = tickers[batchData[TICKER]];
            const forexRate = rates[currency];
            const returnGBPCurrent = ((currentStockPrice - averageCost) * size) / forexRate;

            const costBasisDrop = averageCost / batchData[ASSIGNED_STRIKE] - 1;

            let returnGBPIfAssigned;
            if (batchData[STRIKE]) {
              returnGBPIfAssigned =
                ((batchData[STRIKE] - batchData[AVERAGE_COST]) * size) / forexRate;
            }

            const returnPctCurrent = currentStockPrice / averageCost - 1;

            set(ACCOUNT, batchData[ACCOUNT]);
            set(ASSIGNMENT_PCT, batchData[ASSIGNMENT_PCT]);
            set(ASSIGNED_STRIKE, batchData[ASSIGNED_STRIKE]);
            set(AVERAGE_COST, batchData[AVERAGE_COST]);
            set(BATCH, batchData[BATCH]);
            set(CASH_EQUIVALENT_GBP, batchData[CASH_EQUIVALENT_GBP]);
            set(COST_BASIS_DROP_PCT, costBasisDrop);
            set(DAYS_TOTAL, batchData[DAYS_TOTAL]);
            set(DTE_CURRENT, batchData[DTE_CURRENT]);
            set(DTE_TOTAL, batchData[DTE_TOTAL]);
            set(EXPIRY_DATE, batchData[EXPIRY_DATE]);
            set(PRICE_INCREASE, batchData[PRICE_INCREASE]);
            set(RETURN_1Y_PCT_IF_ASSIGNED, batchData[RETURN_1Y_PCT_IF_ASSIGNED]);
            set(RETURN_30D_PCT_IF_ASSIGNED, batchData[RETURN_30D_PCT_IF_ASSIGNED]);
            set(RETURN_30D_PCT_LAST_CALL, batchData[RETURN_30D_PCT_LAST_CALL]);
            set(RETURN_GBP_CURRENT, returnGBPCurrent);
            set(RETURN_GBP_IF_ASSIGNED, returnGBPIfAssigned);
            set(RETURN_GBP_LAST_CALL, batchData[RETURN_GBP_LAST_CALL]);
            set(RETURN_PCT_CURRENT, returnPctCurrent);
            set(RETURN_PCT_IF_ASSIGNED, batchData[RETURN_PCT_IF_ASSIGNED]);
            set(STATUS, batchData[STATUS]);
            set(STOCK_PRICE_AT_TIME_OF_TRADE, batchData[STOCK_PRICE_AT_TIME_OF_TRADE]);
            set(STOCK_PRICE_CURRENT, batchData[STOCK_PRICE_CURRENT]);
            set(STOCK_PRICE_HIGH, batchData[STOCK_PRICE_HIGH]);
            set(STOCK_PRICE_HIGH_PCT, batchData[STOCK_PRICE_HIGH_PCT]);
            set(STRIKE, batchData[STRIKE]);
            set(TRADE_DATE, batchData[TRADE_DATE]);
            set(TRADE_PRICE, batchData[TRADE_PRICE]);

            return (
              <tr key={rowIndex}>
                {orderedRowValues.map(({ value, format = (v) => v, align }, index) => (
                  <td
                    className={cx(styles.td, styles.trades, {
                      [styles[align]]: !!align,
                    })}
                    key={index}
                  >
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
