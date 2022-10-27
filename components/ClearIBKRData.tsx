import accounts from '../data/accounts';

import styles from '../styles/Button.module.css';

const ClearIBKRData = ({ setters }: { setters: Function[] }) => {
  const deleteIBKRKeys = async () => {
    const keys = Object.values(accounts).flatMap(({ id }) => [`summary-${id}`, `ledger-${id}`]);
    await fetch(`/api/deleteRedisKeys?keys=${keys.join(',')}`);
    setters.forEach((fn) => fn(null));
  };

  return (
    <button className={styles.button} onClick={deleteIBKRKeys}>
      Clear all
    </button>
  );
};

export default ClearIBKRData;
