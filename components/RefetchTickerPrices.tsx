import cx from 'classnames';
import dayjs from 'dayjs';
import { Dispatch, SetStateAction } from 'react';

import styles from '../styles/Button.module.css';
import { CurrentTickerPrices } from '../types';

const NOW = dayjs();

const RefetchTickerPrices = ({
  setCurrentTickerPrices,
}: {
  setCurrentTickerPrices: Dispatch<SetStateAction<CurrentTickerPrices>>;
}) => {
  const fetchAllTickerPrices = async () => {
    const response = await fetch(`/api/allTickerPrices?now=${String(NOW)}&ignoreCurrentCache=true`);
    const data = await response.json();
    setCurrentTickerPrices(data.currentTickerPrices);
  };

  const onClickHandler = () => {
    fetchAllTickerPrices().catch(console.error);
  };

  return (
    <button
      style={{ margin: '2rem 1rem' }}
      className={cx(styles.button, styles.primary)}
      onClick={onClickHandler}
    >
      Refetch ticker prices
    </button>
  );
};

export default RefetchTickerPrices;
