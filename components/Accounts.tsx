import dayjs from 'dayjs';
import cx from 'classnames';

import { isCurrentPut } from '../utils';
import { thousands } from '../utils/format';

import { Ledgers, PutData, Summaries, TradeData } from '../types';

import accounts from '../data/accounts';
import tickers from '../data/tickers';

import styles from '../styles/Table.module.css';

const NOW = dayjs();

const AccountsComponent = ({
  currencies,
  ledgers,
  summaries,
  trades,
}: {
  currencies: string[];
  ledgers: Ledgers;
  summaries: Summaries;
  trades: TradeData[];
}) => {
  const accountsToDisplay = Object.values(accounts).filter(
    (account) => summaries[`summary-${account.id}`] || ledgers[`ledger-${account.id}`]
  );

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
          <th colSpan={2}>Base</th>
          {currencies.map((currency, index) => (
            <th
              className={cx({ [styles.contrast]: !(index % 2) })}
              colSpan={putCurrencies.includes(currency) ? 3 : 1}
              key={index}
            >
              {currency}
            </th>
          ))}
        </tr>
        <tr>
          <th />
          <th>Liquidation value</th>
          <th>Excess liquidity</th>
          {currencies.map((currency, index) => {
            // Workaround to avoid "Each child in a list should have a unique "key" prop."
            const Cells = () => (
              <>
                <th className={cx({ [styles.contrast]: !(index % 2) })}>Cash balance</th>
                {putCurrencies.includes(currency) && (
                  <>
                    <th className={cx({ [styles.contrast]: !(index % 2) })}>Put cash equivalent</th>
                    <th className={cx({ [styles.contrast]: !(index % 2) })}>Net</th>
                  </>
                )}
              </>
            );

            return <Cells key={index} />;
          })}
        </tr>
      </thead>
      <tbody>
        {Object.values(accountsToDisplay).map(({ name, id }, index) => (
          <tr key={index}>
            <td className={accounts[name].colour}>{name}</td>
            <td className={styles.right}>
              {thousands(summaries[`summary-${id}`]?.netliquidation?.amount)}
            </td>
            <td className={styles.right}>
              {thousands(summaries[`summary-${id}`]?.excessliquidity?.amount)}
            </td>
            {currencies.map((currency, index) => {
              const cashBalance = ledgers[`ledger-${id}`]?.[currency]?.cashbalance || 0;
              const putCashEquivalent = currentPutsByAccount[name]?.[currency] || 0;

              // Workaround to avoid "Each child in a list should have a unique "key" prop."
              const Cells = () => (
                <>
                  <td className={cx(styles.right, { [styles.contrast]: !(index % 2) })}>
                    {thousands(cashBalance)}
                  </td>
                  {putCurrencies.includes(currency) && (
                    <>
                      <td className={cx(styles.right, { [styles.contrast]: !(index % 2) })}>
                        {thousands(putCashEquivalent)}
                      </td>
                      <td className={cx(styles.right, { [styles.contrast]: !(index % 2) })}>
                        {thousands(cashBalance - putCashEquivalent)}
                      </td>
                    </>
                  )}
                </>
              );

              return <Cells key={index} />;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AccountsComponent;
