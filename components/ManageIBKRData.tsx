import dayjs, { Dayjs } from 'dayjs';
import cx from 'classnames';

import { Ledgers, Summaries } from '../types';

import { IBKR_CACHE_DURATION } from '../constants';

import accounts from '../data/accounts';

import styles from '../styles/Button.module.css';

const ManageIBKRData = ({
  IBKRStates,
  now,
}: {
  IBKRStates: { endpoint: string; value: Ledgers | Summaries; setter: Function }[];
  now: Dayjs;
}) => {
  const fetchAccountData = async (id) => {
    await Promise.all(
      IBKRStates.map(async ({ endpoint, value, setter }) => {
        const resp = await fetch(`/api/ibkr?endpoint=${endpoint}&id=${id}`);
        const data = await resp.json();
        setter({ ...value, [`${endpoint}-${id}`]: data.value });
      })
    );
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
        const ledgersState = IBKRStates[0] as {
          endpoint: string;
          value: Ledgers;
          setter: Function;
        };
        const timestamp =
          ledgersState.value &&
          ledgersState.value[`${ledgersState.endpoint}-${id}`]?.BASE.timestamp;

        const message = timestamp
          ? `${dayjs(new Date((timestamp + IBKR_CACHE_DURATION) * 1000)).diff(now, 'day')} DTE`
          : 'No data';

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
              className={cx(styles.button, styles.destructive, { [styles.disabled]: !timestamp })}
              onClick={() => deleteAccountData(id)}
              disabled={!timestamp}
            >
              Clear
            </button>
            {ledgersState.value && <small>{message}</small>}
          </div>
        );
      })}
    </div>
  );
};

export default ManageIBKRData;