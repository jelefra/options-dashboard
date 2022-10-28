import accounts from '../data/accounts';

import styles from '../styles/Button.module.css';

const FetchIBKRData = ({
  IBKRStates,
}: {
  IBKRStates: { endpoint: string; value: object; setter: Function }[];
}) => {
  // Data is stored in Redis and made available to other components.
  const fetchAll = async (id) => {
    await Promise.all(
      IBKRStates.map(async ({ endpoint, value, setter }) => {
        const resp = await fetch(`/api/ibkr?endpoint=${endpoint}&id=${id}`);
        const data = await resp.json();
        setter({ ...value, [`${endpoint}-${id}`]: data.value });
      })
    );
  };

  return (
    <>
      {Object.entries(accounts).map(([name, { id }]) => (
        <button className={styles.button} key={id} onClick={() => fetchAll(id)}>
          Fetch {name}
        </button>
      ))}
    </>
  );
};

export default FetchIBKRData;
