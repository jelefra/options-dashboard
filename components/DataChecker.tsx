import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

import { DATE_SHORT_HORIZON, IBKR_DATE_FORMAT, INPUT_DATE_FORMAT } from '../constants';
import accounts from '../data/accounts';
// @ts-ignore
import tradesData from '../data/options.csv';
import tickers from '../data/tickers';
import styles from '../styles/Table.module.css';
import { Position, Positions, TradeData, TradeType } from '../types';
import { getPositionsKeys, removeNullValues } from '../utils';

const mapPutOrCallToType = (putOrCall: Position['putOrCall']): TradeType | undefined => {
  if (putOrCall === 'P') return 'Put';
  if (putOrCall === 'C') return 'Call';
  return undefined;
};

const positionFound = (
  { acctId, ticker, expiry, position, putOrCall, strike }: Position,
  trades: TradeData[]
) => {
  return (
    trades.filter(
      (trade) =>
        accounts[trade.account].id === acctId &&
        trade.ticker === ticker &&
        trade.expiry === dayjs(expiry, IBKR_DATE_FORMAT).format(INPUT_DATE_FORMAT) &&
        trade.type === mapPutOrCallToType(putOrCall) &&
        trade.strike === Number(strike)
    ).length === Math.abs(position)
  );
};

const DataChecker = () => {
  const [positions, setPositions] = useState<Position[]>([]);

  const positionsKeys = getPositionsKeys(accounts);
  useEffect(() => {
    const fetchPositions = async () => {
      const response = await fetch(`/api/getRedisKeys?keys=${positionsKeys}`);
      const data: { values: Positions } = await response.json();
      setPositions(
        Object.values(data.values)
          .flatMap((positionsTimestamped) => positionsTimestamped?.allData)
          .filter(Boolean)
      );
    };
    fetchPositions().catch(console.error);
  }, [positionsKeys]);

  if (positions.length === 0) {
    return null;
  }

  const trades: TradeData[] = tradesData.map(removeNullValues);

  const notFound = positions
    .filter((position) => position.position !== 0) // Ignore expired positions
    .filter((position) => !(position.putOrCall === 'C' && position.position > 0)) // TODO remove once bought calls or puts are considered
    .filter((position) => position.assetClass === 'OPT' && !positionFound(position, trades));

  return notFound.length > 0 ? (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Account</th>
          <th>Ticker</th>
          <th>Position</th>
          <th>Strike</th>
          <th>Expiry</th>
        </tr>
      </thead>
      <tbody>
        {notFound.map(({ acctId, ticker, position, expiry, strike }, index) => {
          const account = Object.values(accounts).find((obj) => obj.id === acctId);
          const accountColour =
            account && account.name in accounts ? accounts[account.name].colour : undefined;
          const tickerColour = tickers[ticker].colour;

          return (
            <tr key={index}>
              <td className={accountColour}>{account?.name}</td>
              <td className={tickerColour}>{ticker}</td>
              <td>{position}</td>
              <td>{strike}</td>
              <td>{dayjs(expiry).format(DATE_SHORT_HORIZON)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  ) : (
    <p style={{ margin: '1 rem' }}>All options are accounted for.</p>
  );
};

export default DataChecker;
