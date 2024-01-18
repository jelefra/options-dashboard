import dayjs from 'dayjs';
import Head from 'next/head';
import { useEffect, useState } from 'react';

import AccountsComponent from '../components/Accounts';
import AllocationSummary from '../components/AllocationSummary';
import Container from '../components/Container';
import Currencies from '../components/Currencies';
import Forex from '../components/Forex';
import ForexAPIUsage from '../components/ForexAPIUsage';
import ManageIBKRData from '../components/ManageIBKRData';
import RefetchTickerPrices from '../components/RefetchTickerPrices';
import Tickers from '../components/Tickers';
import Weight from '../components/Weight';
import accounts from '../data/accounts';
import earnings from '../data/earnings';
// @ts-ignore
import tradesData from '../data/options.csv';
// @ts-ignore
import transactionsData from '../data/transactions.csv';
import {
  CurrentTickerPrices,
  ForexRates,
  Ledgers,
  OpenExchangeRatesUsage,
  Positions,
  Summaries,
  TradeData,
  TransactionData,
} from '../types';
import { removeNullValues } from '../utils';

const NOW = dayjs();

const Home = () => {
  const [rates, setRates] = useState<ForexRates | null>(null);
  const [currentTickerPrices, setCurrentTickerPrices] = useState<CurrentTickerPrices | null>(null);
  const [ledgers, setLedgers] = useState<Ledgers | null>(null);
  const [summaries, setSummaries] = useState<Summaries | null>(null);
  const [positions, setPositions] = useState<Positions | null>(null);
  const [forexAPIUsage, setForexAPIUsage] = useState<OpenExchangeRatesUsage | null>(null);

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
      const response = await fetch('/api/allTickerPrices');
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

    const fetchPositions = async () => {
      const positionsKeys = Object.values(accounts)
        .map(({ id }) => `positions-${id}`)
        .join(',');
      const response = await fetch(`/api/getRedisKeys?keys=${positionsKeys}`);
      // console.log('response', response);
      const data = await response.json();
      // console.log('data.values', data.values);
      setPositions(data.values);
    };
    fetchPositions().catch(console.error);

    const fetchForexAPIUsage = async () => {
      const response = await fetch('/api/forexAPIUsage');
      const data = await response.json();
      setForexAPIUsage(data.usage);
    };
    fetchForexAPIUsage().catch(console.error);
  }, []);

  const withAllLedgers = ledgers && Object.values(ledgers).every(Boolean);
  const withAllSummaries = summaries && Object.values(summaries).every(Boolean);
  const withOneLedger = ledgers && Object.values(ledgers).some(Boolean);
  const withOneSummary = summaries && Object.values(summaries).some(Boolean);
  const withIBKRData = !!ledgers && !!summaries && !!positions;

  const cash = withAllSummaries
    ? Object.values(summaries).reduce(
        (cash, { excessliquidity }) => (cash += excessliquidity.amount),
        0
      )
    : null;

  const currencies = withOneLedger
    ? [
        ...new Set(
          Object.values(ledgers)
            .filter(Boolean)
            .flatMap((ledger) => Object.keys(ledger))
            .filter((currency) => currency !== 'BASE')
        ),
      ].sort()
    : null;

  const showAllocationSummary = !!currentTickerPrices && !!rates && !!cash;
  const showCurrencyWeights = !!currentTickerPrices && !!withAllLedgers && !!rates && !!currencies;
  const showForex = !!withOneLedger && !!rates && !!currencies;
  const showExcessLiquidity = withIBKRData && !!(withOneLedger || withOneSummary) && !!currencies;

  return (
    <Container>
      <Head>
        <title>Options</title>
        <link rel="icon" href="/home.ico" />
      </Head>
      {showAllocationSummary && (
        <AllocationSummary
          cash={cash}
          currentTickerPrices={currentTickerPrices}
          rates={rates}
          trades={trades}
          transactions={transactions}
        />
      )}
      {withIBKRData && (
        <ManageIBKRData
          IBKRStates={[
            { endpoint: 'ledger', value: ledgers, setter: setLedgers },
            { endpoint: 'summary', value: summaries, setter: setSummaries },
            { endpoint: 'positions', value: positions, setter: setPositions },
          ]}
          now={NOW}
        />
      )}
      <RefetchTickerPrices setCurrentTickerPrices={setCurrentTickerPrices} />
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
        <AccountsComponent
          currencies={currencies}
          ledgers={ledgers}
          summaries={summaries}
          trades={trades}
        />
      )}
      <Tickers earnings={earnings} now={NOW} trades={trades} transactions={transactions} />
      {forexAPIUsage && <ForexAPIUsage usage={forexAPIUsage} />}
    </Container>
  );
};

export default Home;
