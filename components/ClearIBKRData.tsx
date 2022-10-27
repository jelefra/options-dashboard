import accounts from '../data/accounts';

import styles from '../styles/Button.module.css';

const ClearIBKRData = ({ setLedgers, setSummaries }) => {
  const deleteIBKRKeys = async () => {
    const keys = Object.values(accounts).flatMap(({ id }) => [`summary-${id}`, `ledger-${id}`]);
    await fetch(`/api/deleteRedisKeys?keys=${keys.join(',')}`);
    setLedgers(null);
    setSummaries(null);
  };

  return (
    <button className={styles.button} onClick={deleteIBKRKeys}>
      Clear all
    </button>
  );
};

export default ClearIBKRData;
