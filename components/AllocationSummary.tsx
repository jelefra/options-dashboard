import dayjs from 'dayjs';

import tickers from '../data/tickers';
import styles from '../styles/Table.module.css';
import { CurrentTickerPrices, ForexRates, PutData, TradeData, TransactionData } from '../types';
import { getTickerDisplayName, isCurrentPut } from '../utils';
import { roundDown, thousandsGBP } from '../utils/format';
import processData from '../utils/processData';

const NOW = dayjs();

const AllocationSummary = ({
  cash,
  currentTickerPrices,
  rates,
  trades,
  transactions,
}: {
  cash: number;
  currentTickerPrices: CurrentTickerPrices;
  rates: ForexRates;
  trades: TradeData[];
  transactions: TransactionData[];
}) => {
  const { batches, stocks } = processData({ transactions, trades, currentTickerPrices, now: NOW });

  const missingTickerPrices = [
    ...new Set([...Object.values(stocks), ...Object.values(batches)].map(({ ticker }) => ticker)),
  ].filter((ticker) => !currentTickerPrices[ticker]);

  if (missingTickerPrices.length > 0) {
    return (
      <div style={{ padding: '20px' }}>
        Missing ticker prices: {missingTickerPrices.map(getTickerDisplayName).join(', ')}
      </div>
    );
  }

  const { wheelingGBP, notWheelingGBP } = Object.values(batches).reduce(
    (total, { current, currentCall = {}, currency, exit, optionSize, ticker }) => {
      const { strike } = currentCall;
      if (!current) {
        throw new Error(`Current stock price missing for ${ticker}`);
      }
      if (strike) {
        const missedUpside = strike ? Math.max(current - strike, 0) : 0;
        total.wheelingGBP += (optionSize * (current - missedUpside)) / rates[currency];
      } else if (!exit?.value) {
        total.notWheelingGBP += (optionSize * current) / rates[currency];
      }
      return total;
    },
    { wheelingGBP: 0, notWheelingGBP: 0 }
  );

  const partialBatchesGBP = Object.values(stocks).reduce(
    (total, { currency, current, partialBatch = {}, ticker }) => {
      const quantity = partialBatch.quantity || 0;
      if (!current) {
        throw new Error(`Current stock price missing for ${ticker}`);
      }
      return (total += (quantity * current) / rates[currency]);
    },
    0
  );

  const currentPuts = trades.filter((trade) => isCurrentPut(trade, NOW)) as PutData[];

  const { ITMPutsGBP, OTMPutsGBP } = currentPuts.reduce(
    (summary, put) => {
      const { ticker, strike } = put;
      const current = currentTickerPrices[ticker];
      const { currency, optionSize } = tickers[ticker];
      if (!optionSize) {
        throw new Error(`Option size missing for ${ticker}`);
      }
      summary[strike <= current ? 'OTMPutsGBP' : 'ITMPutsGBP'] +=
        (Math.min(strike, current) * optionSize) / rates[currency];
      return summary;
    },
    { ITMPutsGBP: 0, OTMPutsGBP: 0 }
  );

  const batchesGBP = wheelingGBP + notWheelingGBP;
  const holdingsGBP = batchesGBP + partialBatchesGBP + ITMPutsGBP;
  const cashTotalGBP = OTMPutsGBP + cash;
  const putsGBP = ITMPutsGBP + OTMPutsGBP;
  const totalGBP = holdingsGBP + cashTotalGBP;

  return (
    <table className={styles.table}>
      <tbody>
        <tr>
          <td rowSpan={4}>Holdings</td>
          <td rowSpan={4} className={styles.right}>
            {thousandsGBP(holdingsGBP, { showZero: true })}
          </td>
          <td rowSpan={2} className={styles.right}>
            {thousandsGBP(batchesGBP, { showZero: true })}
          </td>
          <td rowSpan={2}>Batches</td>
          <td>Wheeling</td>
          <td className={styles.right}>{thousandsGBP(wheelingGBP, { showZero: true })}</td>
        </tr>
        <tr>
          <td>Not wheeling</td>
          <td className={styles.right}>{thousandsGBP(notWheelingGBP, { showZero: true })}</td>
        </tr>
        <tr>
          <td className={styles.right}>{thousandsGBP(partialBatchesGBP, { showZero: true })}</td>
          <td>Partial batches</td>
        </tr>
        <tr>
          <td className={styles.right}>{thousandsGBP(ITMPutsGBP, { showZero: true })}</td>
          <td>ITM puts</td>
          <td rowSpan={2}>Puts</td>
          <td rowSpan={2}>{thousandsGBP(putsGBP, { showZero: true })}</td>
        </tr>
        <tr>
          <td rowSpan={2}>Cash</td>
          <td rowSpan={2} className={styles.right}>
            {thousandsGBP(cashTotalGBP, { showZero: true })}
          </td>
          <td className={styles.right}>{thousandsGBP(OTMPutsGBP, { showZero: true })}</td>
          <td>OTM puts</td>
        </tr>
        <tr>
          <td className={styles.right}>{thousandsGBP(roundDown(cash), { showZero: true })}</td>
          <td>Excess liquidity</td>
        </tr>
        <tr>
          <td>Total</td>
          <td className={styles.right}>
            <strong>{thousandsGBP(totalGBP, { showZero: true })}</strong>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default AllocationSummary;
