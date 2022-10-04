import accounts from '../data/accounts';

import styles from '../styles/Button.module.css';

const FetchIBKRData = () => {
  // Data is stored in Redis and made available to other components.
  const fetchAll = async (id) => {
    await fetch(`/api/ibkr?endpoint=summary&id=${id}`);
    await fetch(`/api/ibkr?endpoint=ledger&id=${id}`);
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
