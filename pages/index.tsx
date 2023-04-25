import { useEffect, useState } from 'react';
import Head from 'next/head';
import dayjs from 'dayjs';

import Container from '../components/Container';
import Earnings from '../components/Earnings';
import AllocationSummary from '../components/AllocationSummary';
import ManageIBKRData from '../components/ManageIBKRData';
import Currencies from '../components/Currencies';
import Forex from '../components/Forex';
import Weight from '../components/Weight';
import ForexAPIUsage from '../components/ForexAPIUsage';
import StocksAPIUsage from '../components/StocksAPIUsage';
import ExcessLiquidity from '../components/ExcessLiquidity';
import BatchCodes from '../components/BatchCodes';

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

import earnings from '../data/earnings';
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

  const withAllLedgers = ledgers && Object.values(ledgers).every(Boolean);
  const withAllSummaries = summaries && Object.values(summaries).every(Boolean);
  const withOneLedger = ledgers && Object.values(ledgers).some(Boolean);
  const withOneSummary = summaries && Object.values(summaries).some(Boolean);
  const withIBKRData = ledgers && summaries;

  const cash =
    withAllSummaries &&
    Object.values(summaries).reduce(
      (cash, { excessliquidity }) => (cash += excessliquidity.amount),
      0
    );

  const currencies =
    ledgers &&
    [
      ...new Set(
        Object.values(ledgers)
          .filter(Boolean)
          .flatMap((ledger) => Object.keys(ledger))
          .filter((currency) => currency !== 'BASE')
      ),
    ].sort();

  const showAllocationSummary = currentTickerPrices && rates && cash;
  const showCurrencyWeights = currentTickerPrices && withAllLedgers && rates;
  const showForex = withOneLedger && rates;
  const showExcessLiquidity = withIBKRData && (withOneLedger || withOneSummary);

  return (
    <Container>
      <Head>
        <title>Options</title>
        <link rel="icon" href="/home.ico" />
      </Head>
      <Earnings data={earnings} now={NOW} />
      {showAllocationSummary && (
        <AllocationSummary
          cash={cash}
          currentTickerPrices={currentTickerPrices}
          rates={rates}
          trades={trades}
          transactions={transactions}
        />
      )}
      <ManageIBKRData
        IBKRStates={[
          { endpoint: 'ledger', value: ledgers, setter: setLedgers },
          { endpoint: 'summary', value: summaries, setter: setSummaries },
        ]}
        now={NOW}
      />
      {(showCurrencyWeights || showForex) && (
        <Currencies currencies={currencies}>
          {showCurrencyWeights && (
            <Weight
              currencies={currencies}
              currentTickerPrices={currentTickerPrices}
              ledgers={ledgers}
              rates={rates}
              trades={trades}
              transactions={transactions}
            />
          )}
          {showForex && <Forex currencies={currencies} rates={rates} />}
        </Currencies>
      )}
      {showExcessLiquidity && (
        <ExcessLiquidity
          currencies={currencies}
          ledgers={ledgers}
          summaries={summaries}
          trades={trades}
        />
      )}
      <div>
        {forexAPIUsage && <ForexAPIUsage usage={forexAPIUsage} />}
        {stocksAPIUsage && <StocksAPIUsage usage={stocksAPIUsage} />}
      </div>
      <BatchCodes trades={trades} transactions={transactions} />
    </Container>
  );
};

export default Home;
