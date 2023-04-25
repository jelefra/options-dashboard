import cloneDeep from 'lodash.clonedeep';

import { TradeData, TransactionData } from '../types';

import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

type BatchCodesType = { [key: string]: { ticker: string; batchCode: string } };

const BatchCodes = ({
  trades,
  transactions,
}: {
  trades: TradeData[];
  transactions: TransactionData[];
}) => {
  const transactionsBatchNames: BatchCodesType = transactions.reduce(
    (names, { ticker, batchCodes }) =>
      batchCodes
        ? { ...names, [ticker]: { ticker, batchCode: batchCodes.split(',').pop() } }
        : names,
    {}
  );

  const batchCodes = trades.reduce((names, { ticker, batchCode }) => {
    if (batchCode) {
      if (!names[ticker]) {
        names[ticker] = { ticker, batchCode };
      } else {
        const [, index] = batchCode.match(/(\d+)/);
        const [, overallIndex] = names[ticker].batchCode.match(/(\d+)/);
        if (index > overallIndex) {
          names[ticker].batchCode = `${ticker}${index}`;
        }
      }
    }
    return names;
  }, cloneDeep(transactionsBatchNames) as BatchCodesType);

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Latest</th>
        </tr>
      </thead>
      <tbody>
        {Object.values(batchCodes)
          .sort((a, b) => a.batchCode.localeCompare(b.batchCode))
          .map(({ ticker, batchCode }) => (
            <tr key={batchCode}>
              <td className={tickers[ticker].colour}>{batchCode}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
};

export default BatchCodes;
