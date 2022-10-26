import dayjs from 'dayjs';

import { isCurrentPut } from '../utils';
import { thousands } from '../utils/format';

import { Ledgers, PutData, TradeData } from '../types';

import accounts from '../data/accounts';
import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

const NOW = dayjs();

const ExcessLiquidity = ({ ledgers, trades }: { ledgers: Ledgers; trades: TradeData[] }) => {
  const currencies = Array.from(
    new Set(
      Object.values(ledgers).flatMap((ledger) =>
        Object.keys(ledger).filter((currency) => currency !== 'BASE')
      )
    )
  ).sort();

  const currentPuts = trades.filter((trade) => isCurrentPut(trade, NOW)) as PutData[];

  const currentPutsByAccount = currentPuts.reduce((summary, { account, strike, ticker }) => {
    const { currency, optionSize } = tickers[ticker];
    summary[account] = summary[account] || {};
    summary[account][currency] = (summary[account][currency] || 0) + strike * optionSize;
    return summary;
  }, {});

  const putCurrencies = Array.from(
    new Set(currentPuts.map(({ ticker }) => tickers[ticker].currency))
  );

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th />
          {currencies.map((currency, index) => (
            <th colSpan={putCurrencies.includes(currency) ? 3 : 1} key={index}>
              {currency}
            </th>
          ))}
        </tr>
        <tr>
          <th />
          {currencies.map((currency, index) => {
            // Workaround to avoid "Each child in a list should have a unique "key" prop."
            const Cells = () => (
              <>
                <th>Cash balance</th>
                {putCurrencies.includes(currency) && (
                  <>
                    <th>Put cash equivalent</th>
                    <th>Net</th>
                  </>
                )}
              </>
            );

            return <Cells key={index} />;
          })}
        </tr>
      </thead>
      <tbody>
        {Object.values(accounts).map(({ name, id }, index) => {
          const [, relevantLedger] = Object.entries(ledgers).find(
            ([ledgerKey]) => id === ledgerKey.split('-')[1]
          );

          return (
            <tr key={index}>
              <td className={accounts[name].colour}>{name}</td>
              {currencies.map((currency, index) => {
                const cashBalance = relevantLedger[currency]?.cashbalance || 0;
                const putCashEquivalent = currentPutsByAccount[name]?.[currency] || 0;
                // Workaround to avoid "Each child in a list should have a unique "key" prop."
                const Cells = () => (
                  <>
                    <td className={styles.right}>{thousands(cashBalance)}</td>
                    {putCurrencies.includes(currency) && (
                      <>
                        <td className={styles.right}>{thousands(putCashEquivalent)}</td>
                        <td className={styles.right}>
                          {thousands(cashBalance - putCashEquivalent)}
                        </td>
                      </>
                    )}
                  </>
                );

                return <Cells key={index} />;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ExcessLiquidity;
