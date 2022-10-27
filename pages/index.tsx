import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

import Container from '../components/Container';
import UpcomingEarnings from '../components/UpcomingEarnings';
import AllocationSummary from '../components/AllocationSummary';
import FetchIBKRData from '../components/FetchIBKRData';
import ClearIBKRData from '../components/ClearIBKRData';
import Currencies from '../components/Currencies';
import ForexAPIUsage from '../components/ForexAPIUsage';
import StocksAPIUsage from '../components/StocksAPIUsage';
import ExcessLiquidity from '../components/ExcessLiquidity';

import {
  CurrentTickerPrices,
  ForexRates,
  IEXCloudUsageResponse,
  Ledgers,
  OpenExchangeRatesUsage,
  Summaries,
  TradeData,
  TransactionData,
} from '../types';
import { removeNullValues } from '../utils';

import data from '../data/upcomingEarnings';
import accounts from '../data/accounts';
// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';

const NOW = dayjs();

const Home = () => {
  const [rates, setRates] = useState<ForexRates>(null);
  const [currentTickerPrices, setCurrentTickerPrices] = useState<CurrentTickerPrices>(null);
  const [ledgers, setLedgers] = useState<Ledgers>(null);
  const [summaries, setSummaries] = useState<Summaries>(null);
  const [forexAPIUsage, setForexAPIUsage] = useState<OpenExchangeRatesUsage>(null);
  const [stocksAPIUsage, setStocksAPIUsage] = useState<IEXCloudUsageResponse>(null);

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

    const fetchLedgers = async () => {
      const ledgerKeys = Object.values(accounts)
        .map(({ id }) => `ledger-${id}`)
        .join(',');
      const response = await fetch(`/api/getRedisKeys?keys=${ledgerKeys}`);
      const data = await response.json();
      setLedgers(data.values);
    };
    fetchLedgers().catch(console.error);

    const fetchSummaries = async () => {
      const summaryKeys = Object.values(accounts)
        .map(({ id }) => `summary-${id}`)
        .join(',');
      const response = await fetch(`/api/getRedisKeys?keys=${summaryKeys}`);
      const data = await response.json();
      setSummaries(data.values);
    };
    fetchSummaries().catch(console.error);

    const fetchForexAPIUsage = async () => {
      const response = await fetch('/api/forexAPIUsage');
      const data = await response.json();
      setForexAPIUsage(data.usage);
    };
    fetchForexAPIUsage().catch(console.error);

    const fetchStocksAPIUsage = async () => {
      const response = await fetch('/api/stocksAPIUsage');
      const data = await response.json();
      setStocksAPIUsage(data.usage);
    };
    fetchStocksAPIUsage().catch(console.error);
  }, []);

  const withFullLedgers = ledgers && Object.values(ledgers).every(Boolean);
  const withFullSummaries = summaries && Object.values(summaries).every(Boolean);

  const cash =
    withFullSummaries &&
    Object.values(summaries).reduce(
      (cash, { excessliquidity }) => (cash += excessliquidity.amount),
      0
    );

  const showAllocationSummary = currentTickerPrices && rates && cash;
  const showCurrencies = currentTickerPrices && withFullLedgers && rates;

  return (
    <Container>
      <UpcomingEarnings data={data} now={NOW} />
      {showAllocationSummary && (
        <AllocationSummary
          cash={cash}
          currentTickerPrices={currentTickerPrices}
          rates={rates}
          trades={trades}
          transactions={transactions}
        />
      )}
      <FetchIBKRData />
      <ClearIBKRData setLedgers={setLedgers} setSummaries={setSummaries} />
      {showCurrencies && (
        <Currencies
          currentTickerPrices={currentTickerPrices}
          ledgers={ledgers}
          rates={rates}
          trades={trades}
          transactions={transactions}
        />
      )}
      {withFullLedgers && <ExcessLiquidity ledgers={ledgers} trades={trades} />}
      {forexAPIUsage && <ForexAPIUsage usage={forexAPIUsage} />}
      {stocksAPIUsage && <StocksAPIUsage usage={stocksAPIUsage} />}
    </Container>
  );
};

export default Home;
