import dayjs from 'dayjs';

import processData from '../utils/processData';
import { isCurrentPut } from '../utils';
import { roundDown, thousandsGBP } from '../utils/format';

import { CurrentTickerPrices, ForexRates, PutData, TradeData, TransactionData } from '../types';

import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

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

  const { wheelingGBP, notWheelingGBP } = Object.values(batches).reduce(
    (total, { currentCall = {}, exitValue, optionSize, ticker }) => {
      const { currency } = tickers[ticker];
      const current = currentTickerPrices[ticker];
      const { strike } = currentCall;
      if (strike) {
        const missedUpside = strike ? Math.max(current - strike, 0) : 0;
        total.wheelingGBP += (optionSize * (current - missedUpside)) / rates[currency];
      } else if (!exitValue) {
        total.notWheelingGBP += (optionSize * current) / rates[currency];
      }
      return total;
    },
    { wheelingGBP: 0, notWheelingGBP: 0 }
  );

  const partialBatchesGBP = Object.values(stocks).reduce((total, { ticker, partialBatch = {} }) => {
    const { currency } = tickers[ticker];
    const current = currentTickerPrices[ticker];
    const quantity = partialBatch.quantity || 0;
    return (total += (quantity * current) / rates[currency]);
  }, 0);

  const currentPuts = trades.filter((trade) => isCurrentPut(trade, NOW)) as PutData[];

  const { ITMPutsGBP, OTMPutsGBP } = currentPuts.reduce(
    (summary, put) => {
      const { ticker, strike } = put;
      const current = currentTickerPrices[ticker];
      const { currency, optionSize } = tickers[ticker];
      summary[strike <= current ? 'OTMPutsGBP' : 'ITMPutsGBP'] +=
        (strike * optionSize) / rates[currency];
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
            {thousandsGBP(holdingsGBP)}
          </td>
          <td rowSpan={2} className={styles.right}>
            {thousandsGBP(batchesGBP)}
          </td>
          <td rowSpan={2}>Batches</td>
          <td>Wheeling</td>
          <td className={styles.right}>{thousandsGBP(wheelingGBP)}</td>
        </tr>
        <tr>
          <td>Not wheeling</td>
          <td className={styles.right}>{thousandsGBP(notWheelingGBP)}</td>
        </tr>
        <tr>
          <td className={styles.right}>{thousandsGBP(partialBatchesGBP)}</td>
          <td>Partial batches</td>
        </tr>
        <tr>
          <td className={styles.right}>{thousandsGBP(ITMPutsGBP)}</td>
          <td>ITM puts</td>
          <td rowSpan={2}>Puts</td>
          <td rowSpan={2}>{thousandsGBP(putsGBP)}</td>
        </tr>
        <tr>
          <td rowSpan={2}>Cash</td>
          <td rowSpan={2} className={styles.right}>
            {thousandsGBP(cashTotalGBP)}
          </td>
          <td className={styles.right}>{thousandsGBP(OTMPutsGBP)}</td>
          <td>OTM puts</td>
        </tr>
        <tr>
          <td className={styles.right}>{thousandsGBP(roundDown(cash))}</td>
          <td>Excess liquidity</td>
        </tr>
        <tr>
          <td>Total</td>
          <td className={styles.right}>
            <strong>{thousandsGBP(totalGBP)}</strong>
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default AllocationSummary;
