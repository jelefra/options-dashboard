import dayjs, { Dayjs } from 'dayjs';
import cx from 'classnames';

import { Ledgers, Positions, Summaries } from '../types';

import { IBKR_DEFAULT_EXPIRY, IBKR_POSITIONS_EXPIRY } from '../constants';

import accounts from '../data/accounts';

import styles from '../styles/Button.module.css';

const ManageIBKRData = ({
  IBKRStates,
  now,
}: {
  IBKRStates: [
    { endpoint: string; value: Ledgers; setter: Function },
    { endpoint: string; value: Summaries; setter: Function },
    { endpoint: string; value: Positions; setter: Function }
  ];
  now: Dayjs;
}) => {
  const fetchAccountData = async (id) => {
    await Promise.all([
      ...IBKRStates.map(async ({ endpoint, value, setter }) => {
        const resp = await fetch(`/api/ibkr?endpoint=${endpoint}&id=${id}`);
        const data = await resp.json();
        setter({ ...value, [`${endpoint}-${id}`]: data.value });
      }),
    ]);
  };

  const deleteAccountData = async (id) => {
    await Promise.all(
      IBKRStates.map(async ({ endpoint, value, setter }) => {
        await fetch(`/api/deleteRedisKey?key=${endpoint}-${id}`);
        setter({ ...value, [`${endpoint}-${id}`]: null });
      })
    );
  };

  return (
    <div style={{ display: 'flex' }}>
      {Object.entries(accounts).map(([name, { id }]) => {
        const [ledgersState, , positionsState] = IBKRStates;
        const ledger = ledgersState.value[`${ledgersState.endpoint}-${id}`];

        const generalTS = ledger?.BASE.timestamp;
        const generalExpiry = generalTS
          ? `${dayjs(new Date((generalTS + IBKR_DEFAULT_EXPIRY) * 1000)).diff(now, 'day')}d`
          : 'Ø';

        const positionsTS = positionsState.value[`${positionsState.endpoint}-${id}`]?.timestamp;
        const positionsExpiry = positionsTS
          ? `${dayjs(new Date((positionsTS + IBKR_POSITIONS_EXPIRY) * 1000)).diff(now, 'hours')}h`
          : 'Ø';

        const message = ledger ? `${generalExpiry} / ${positionsExpiry}` : generalExpiry;

        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 'auto',
            }}
            key={id}
          >
            <button
              className={cx(styles.button, styles.primary)}
              onClick={() => fetchAccountData(id)}
            >
              Fetch {name}
            </button>
            <button
              className={cx(styles.button, styles.destructive, {
                [styles.disabled]: !generalTS,
              })}
              onClick={() => deleteAccountData(id)}
              disabled={!generalTS}
            >
              Clear
            </button>
            <small>{message}</small>
          </div>
        );
      })}
    </div>
  );
};

export default ManageIBKRData;
