import accounts from '../data/accounts';

import styles from '../styles/Button.module.css';

const ManageIBKRData = ({
  IBKRStates,
}: {
  IBKRStates: { endpoint: string; value: object; setter: Function }[];
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
      {Object.entries(accounts).map(([name, { id }]) => (
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'auto' }}
          key={id}
        >
          <button className={styles.button} onClick={() => fetchAccountData(id)}>
            Fetch {name}
          </button>
          <button className={styles.button} onClick={() => deleteAccountData(id)}>
            Clear
          </button>
        </div>
      ))}
    </div>
  );
};

export default ManageIBKRData;
