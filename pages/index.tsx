import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

import Container from '../components/Container';
import UpcomingEarnings from '../components/UpcomingEarnings';
import AllocationSummary from '../components/AllocationSummary';
import FetchLedgers from '../components/FetchLedgers';

import { CurrentTickerPrices, TradeData, TransactionData } from '../types';
import { removeNullValues } from '../utils';

import data from '../data/upcomingEarnings';
// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';

const NOW = dayjs();

const Home = () => {
  const [rates, setRates] = useState<{ [key: string]: number }>(null);
  const [currentTickerPrices, setCurrentTickerPrices] = useState<CurrentTickerPrices>(null);

  const trades: TradeData[] = tradesData.map(removeNullValues);
  const transactions: TransactionData[] = transactionsData.map(removeNullValues);

  useEffect(() => {
    const fetchForexRates = async () => {
      const response = await fetch('/api/forexRates');
      const data = await response.json();
      setRates(data.rates);
    };
    fetchForexRates().catch(console.error);

    const fetchAllTickerPrices = async () => {
      const response = await fetch(`/api/allTickerPrices?now=${String(NOW)}`);
      const data = await response.json();
      setCurrentTickerPrices(data.currentTickerPrices);
    };
    fetchAllTickerPrices().catch(console.error);
  }, []);

  const showAllocationSummary = currentTickerPrices && rates;

  return (
    <Container>
      <UpcomingEarnings data={data} now={NOW} />
      {showAllocationSummary && (
        <AllocationSummary
          currentTickerPrices={currentTickerPrices}
          rates={rates}
          trades={trades}
          transactions={transactions}
        />
      )}
      <FetchLedgers />
    </Container>
  );
};

export default Home;
