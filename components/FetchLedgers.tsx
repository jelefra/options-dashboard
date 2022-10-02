import accounts from '../data/accounts';

import styles from '../styles/Button.module.css';

const FetchLedgers = () => {
  // Data is stored in Redis and made available to other components.
  const fetchLedger = async (id) => await fetch(`/api/ledger?id=${id}`);

  return (
    <>
      {Object.entries(accounts).map(([name, { id }]) => (
        <button className={styles.button} key={id} onClick={() => fetchLedger(id)}>
          Fetch {name}
        </button>
      ))}
    </>
  );
};

export default FetchLedgers;
