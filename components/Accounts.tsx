import cx from 'classnames';
import dayjs from 'dayjs';

import { ONE_DAY_IN_SECONDS } from '../constants';
import accounts from '../data/accounts';
import tickers from '../data/tickers';
import styles from '../styles/Table.module.css';
import { AccountName, Ledgers, PutData, Summaries, TradeData } from '../types';
import { isCurrentPut } from '../utils';
import { thousands } from '../utils/format';

const NOW = dayjs();

const netLiquidationValueIsOutdated = (unixTimestamp: number) =>
  new Date().getTime() - unixTimestamp > ONE_DAY_IN_SECONDS * 1000;

type CurrencyData = {
  currency: string;
  cashBalance: number;
  putCashEquivalent?: number;
  net?: number;
};

type AccountData = {
  name: AccountName;
  liquidationValueAmount: number;
  liquidationValueTS: number;
  excessLiquidity: number;
} & {
  [key: string]: CurrencyData;
};

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

  const currentPutsByAccount = currentPuts.reduce(
    (summary: { [key: string]: { [key: string]: number } }, { account, strike, ticker }) => {
      const { currency, optionSize } = tickers[ticker];
      summary[account] = summary[account] || {};
      if (!optionSize) {
        throw new Error(`Option size missing for ${ticker}`);
      }
      summary[account][currency] = (summary[account][currency] || 0) + strike * optionSize;
      return summary;
    },
    {}
  );

  const putCurrencies = Array.from(
    new Set(currentPuts.map(({ ticker }) => tickers[ticker].currency))
  );

  const accountsData: AccountData[] = accountsToDisplay.map(({ name, id }) => {
    // TODO improve type
    const accountObj: any = {
      name,
      liquidationValueAmount: summaries[`summary-${id}`]?.netliquidation?.amount || 0,
      liquidationValueTS: summaries[`summary-${id}`]?.netliquidation?.timestamp || 0,
      excessLiquidity: summaries[`summary-${id}`]?.excessliquidity?.amount || 0,
    };
    currencies.forEach((currency) => {
      const cashBalance = ledgers[`ledger-${id}`]?.[currency]?.cashbalance || 0;
      accountObj[currency] = {
        currency,
        cashBalance,
      };
      if (putCurrencies.includes(currency)) {
        const putCashEquivalent = currentPutsByAccount[name]?.[currency] || 0;
        accountObj[currency].putCashEquivalent = putCashEquivalent;
        accountObj[currency].net = cashBalance - putCashEquivalent;
      }
    });
    return accountObj;
  });

  const aggregateData = accountsData.reduce(
    (
      // TODO improve type
      total: any,
      // eslint-disable-next-line no-unused-vars
      { name, liquidationValueAmount, liquidationValueTS, excessLiquidity, ...rest }
    ) => {
      total.liquidationValueAmount += liquidationValueAmount;
      total.liquidationValueTS = Math.min(total.liquidationValueTS, liquidationValueTS);
      total.excessLiquidity += excessLiquidity;

      Object.values(rest).forEach(({ currency, ...remainder }) => {
        Object.entries(remainder).forEach(([key, val]) => {
          total[currency] = total[currency] || {};
          total[currency][key] = (total[currency][key] || 0) + val;
        });
      });
      return total;
    },
    { name: 'Total', liquidationValueAmount: 0, liquidationValueTS: Infinity, excessLiquidity: 0 }
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
          {currencies.map((currency, index) => (
            <>
              <th className={cx({ [styles.contrast]: !(index % 2) })}>Cash balance</th>
              {putCurrencies.includes(currency) && (
                <>
                  <th className={cx({ [styles.contrast]: !(index % 2) })}>Put cash equivalent</th>
                  <th className={cx({ [styles.contrast]: !(index % 2) })}>Net</th>
                </>
              )}
            </>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.values(
          accountsToDisplay.length > 1 ? [...accountsData, aggregateData] : accountsData
        ).map(
          (
            { name, liquidationValueAmount, liquidationValueTS, excessLiquidity, ...rest },
            index
          ) => (
            <tr key={index}>
              <td className={accounts[name as AccountName]?.colour}>{name}</td>
              <td
                className={cx(styles.right, {
                  mute: netLiquidationValueIsOutdated(liquidationValueTS),
                })}
              >
                {thousands(liquidationValueAmount)}
              </td>
              <td className={styles.right}>{thousands(excessLiquidity)}</td>
              {currencies.map((currency, index) => (
                <>
                  <td className={cx(styles.right, { [styles.contrast]: !(index % 2) })}>
                    {thousands(rest[currency]?.cashBalance || 0)}
                  </td>
                  {putCurrencies.includes(currency) && (
                    <>
                      <td className={cx(styles.right, { [styles.contrast]: !(index % 2) })}>
                        {thousands(rest[currency]?.putCashEquivalent || 0)}
                      </td>
                      <td className={cx(styles.right, { [styles.contrast]: !(index % 2) })}>
                        {thousands(rest[currency]?.net || 0)}
                      </td>
                    </>
                  )}
                </>
              ))}
            </tr>
          )
        )}
      </tbody>
    </table>
  );
};

export default AccountsComponent;
