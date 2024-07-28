import dayjs from 'dayjs';
dayjs.extend(customParseFormat);
import customParseFormat from 'dayjs/plugin/customParseFormat';
import fs from 'fs';
import Head from 'next/head';
import Papa from 'papaparse';
import path from 'path';
import React, { useRef } from 'react';

import Container from '../components/Container';
import accounts from '../data/accounts';
// @ts-ignore
import forexData from '../data/forex.csv';
// @ts-ignore
import tradesData from '../data/options.csv';
import styles from '../styles/Table.module.css';
import { AccountName, ForexData, ForexIBKR, TradeData, TradeIBKR } from '../types';
import { removeNullValues } from '../utils';
import { ParsedFile, prepareFiles, processFile } from '../utils/CSVHelper';
import { thousands } from '../utils/format';

const statementsDirectory = path.join(process.cwd(), 'data', 'statements');

export async function getServerSideProps() {
  const fileNames = fs.readdirSync(statementsDirectory);
  const statements: ParsedFile[] = [];

  fileNames.forEach((fileName) => {
    if (fileName.endsWith('.csv')) {
      const filePath = path.join(statementsDirectory, fileName);
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      const parsedContent = Papa.parse(fileContents, {
        dynamicTyping: true,
        header: false,
        skipEmptyLines: true,
      }) as Papa.ParseResult<unknown> & { data: ParsedFile };
      statements.push(parsedContent.data);
    }
  });

  return {
    props: {
      statements,
    },
  };
}

const CSVDownloaderTrades = ({ tradeData }: { tradeData: EnrichedTradeData[] }) => {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const fields = [
    'date',
    'fullDate',
    'account',
    'type',
    'ticker',
    'batchCode',
    'expiry',
    'stockPrice',
    'strike',
    'closePrice',
    'tradePrice',
    'commission',
    'delta',
    'IV',
  ];

  const sortedTradeData = tradeData.sort((a, b) => {
    const dateA = dayjs(a.fullDate);
    const dateB = dayjs(b.fullDate);
    return dateA.valueOf() - dateB.valueOf();
  });

  const handleDownload = () => {
    const csv = Papa.unparse({ fields, data: sortedTradeData });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    if (linkRef.current) {
      linkRef.current.href = url;
      linkRef.current.click();
    }
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button onClick={handleDownload}>Download trade data</button>
      <a ref={linkRef} style={{ display: 'none' }} download="options.csv" />
    </>
  );
};

const CSVDownloaderForex = ({ forexData }: { forexData: EnrichedForexData[] }) => {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const fields = ['date', 'fullDate', 'account', 'currencyPair', 'quantity', 'rate', 'commission'];

  const sortedForexData = forexData.sort((a, b) => {
    const dateA = dayjs(a.fullDate);
    const dateB = dayjs(b.fullDate);
    return dateA.valueOf() - dateB.valueOf();
  });

  const handleDownload = () => {
    const csv = Papa.unparse({ fields, data: sortedForexData });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    if (linkRef.current) {
      linkRef.current.href = url;
      linkRef.current.click();
    }
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button onClick={handleDownload}>Download forex data</button>
      <a ref={linkRef} style={{ display: 'none' }} download="forex.csv" />
    </>
  );
};

type EnrichedTradeIBKR = TradeIBKR & { account: AccountName };
type EnrichedForexIBKR = ForexIBKR & { account: AccountName };
type EnrichedTradeData = TradeData & { fullDate: string };
type EnrichedForexData = ForexData & { fullDate: string };
type Summary = {
  trades: { notMatched: EnrichedTradeIBKR[]; complete: EnrichedTradeData[] };
  forex: { notMatched: EnrichedForexIBKR[]; complete: EnrichedForexData[] };
};
const Checks = ({ statements }: { statements: ParsedFile[] }) => {
  const personalTradeRecords: TradeData[] = tradesData.map(removeNullValues);
  const personalForexRecords: ForexData[] = forexData.map(removeNullValues);

  const countOfTradesInPersonalRecords = personalTradeRecords.length;
  const countOfForexInPersonalRecords = personalForexRecords.length;

  const preparedStatements = prepareFiles(statements);
  const countOfTradesInStatements = preparedStatements.reduce(
    (total, { trades }) =>
      (total += trades.reduce((subtotal, { Quantity }) => (subtotal += Math.abs(Quantity)), 0)),
    0
  );
  const countOfForexOperationsInStatements = preparedStatements.reduce(
    (total, { forex }) => (total += forex.length),
    0
  );

  const { trades, forex } = preparedStatements
    .map((file) => processFile(file, personalTradeRecords, personalForexRecords))
    .reduce(
      (summary, { trades, forex }) => {
        summary.trades.notMatched.push(...trades.notMatched);
        summary.trades.complete.push(...trades.complete);

        summary.forex.notMatched.push(...forex.notMatched);
        summary.forex.complete.push(...forex.complete);

        return summary;
      },
      {
        trades: { notMatched: [], complete: [] },
        forex: { notMatched: [], complete: [] },
      } as Summary
    );

  const TradeActivityStatementsSummary = (
    <>
      <h3>IBKR activity statements</h3>
      {trades.notMatched.length ? (
        <>
          <p>
            {trades.notMatched.length} trades not matched out of{' '}
            {thousands(countOfTradesInStatements)}:
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Account</th>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>T. Price</th>
                <th>Comm/Fee</th>
              </tr>
            </thead>
            <tbody>
              {trades.notMatched
                .sort((a, b) => {
                  const dateA = dayjs(a['Date/Time']);
                  const dateB = dayjs(b['Date/Time']);
                  return dateA.valueOf() - dateB.valueOf();
                })
                .map(({ account, ...trade }, key) => {
                  return (
                    <tr key={key}>
                      <td>{trade['Date/Time']}</td>
                      <td className={accounts[account].colour}>{account}</td>
                      <td>{trade.Symbol}</td>
                      <td className={styles.right}>{trade.Quantity}</td>
                      <td className={styles.right}>{trade['T. Price']}</td>
                      <td className={styles.right}>{trade['Comm/Fee']}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </>
      ) : (
        <div>All {thousands(countOfTradesInStatements)} trades successfully matched.</div>
      )}
    </>
  );

  const TradePersonalRecordsSummary = (
    <>
      <h3>Personal records</h3>
      {personalTradeRecords.length ? (
        <>
          <p>
            {personalTradeRecords.length} trades not matched out of{' '}
            {thousands(countOfTradesInPersonalRecords)}:
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Type</th>
                <th>Ticker</th>
                <th>Expiry</th>
                <th>Strike</th>
                <th>Trade price</th>
                <th>Commission</th>
              </tr>
            </thead>
            <tbody>
              {personalTradeRecords.map(
                ({ date, account, type, expiry, ticker, strike, tradePrice, commission }, key) => {
                  const accountColour = accounts[account].colour;
                  return (
                    <tr key={key}>
                      <td>{date}</td>
                      <td className={accountColour}>{account}</td>
                      <td>{type}</td>
                      <td>{ticker}</td>
                      <td>{expiry}</td>
                      <td className={styles.right}>{strike}</td>
                      <td className={styles.right}>{tradePrice}</td>
                      <td className={styles.right}>{commission}</td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </>
      ) : (
        <p>All {thousands(countOfTradesInPersonalRecords)} trades successfully matched.</p>
      )}
    </>
  );

  const ForexActivityStatementsSummary = (
    <>
      <h3>IBKR activity statements</h3>
      {forex.notMatched.length ? (
        <>
          <p>
            {forex.notMatched.length} forex operations not matched out of{' '}
            {countOfForexOperationsInStatements}:
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Account</th>
                <th>Symbol</th>
                <th>Quantity</th>
                <th>T. Price</th>
                <th>Comm/Fee</th>
              </tr>
            </thead>
            <tbody>
              {forex.notMatched
                .sort((a, b) => {
                  const dateA = dayjs(a['Date/Time']);
                  const dateB = dayjs(b['Date/Time']);
                  return dateA.valueOf() - dateB.valueOf();
                })
                .map(({ account, ...forex }, key) => {
                  return (
                    <tr key={key}>
                      <td>{forex['Date/Time']}</td>
                      <td className={accounts[account].colour}>{account}</td>
                      <td>{forex.Symbol}</td>
                      <td className={styles.right}>{forex.Quantity}</td>
                      <td className={styles.right}>{forex['T. Price']}</td>
                      <td className={styles.right}>{forex['Comm in GBP']}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </>
      ) : (
        <p>All {countOfForexOperationsInStatements} forex operations successfully matched.</p>
      )}
    </>
  );

  const ForexPersonalRecordsSummary = (
    <>
      <h3>Personal records</h3>
      {personalForexRecords.length ? (
        <>
          <p>
            {personalForexRecords.length} forex operations not matched out of{' '}
            {countOfForexInPersonalRecords}:
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Rate</th>
                <th>Commission</th>
                <th>Currency pair</th>
              </tr>
            </thead>
            <tbody>
              {personalForexRecords.map(
                ({ date, account, quantity, rate, commission, currencyPair }, key) => {
                  const accountColour = accounts[account].colour;
                  return (
                    <tr key={key}>
                      <td>{date}</td>
                      <td className={accountColour}>{account}</td>
                      <td className={styles.right}>{quantity}</td>
                      <td className={styles.right}>{rate}</td>
                      <td className={styles.right}>{commission}</td>
                      <td>{currencyPair}</td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </>
      ) : (
        <p>All {countOfForexInPersonalRecords} forex operations successfully matched.</p>
      )}
    </>
  );

  return (
    <Container>
      <Head>
        <title>Checks</title>
        <link rel="icon" href="/checks.ico" />
      </Head>
      <h1>Bookkeeping</h1>
      <h2>Options</h2>
      {TradeActivityStatementsSummary}
      <CSVDownloaderTrades tradeData={trades.complete} />
      {TradePersonalRecordsSummary}
      <h2>Forex</h2>
      {ForexActivityStatementsSummary}
      <CSVDownloaderForex forexData={forex.complete} />
      {ForexPersonalRecordsSummary}
    </Container>
  );
};

export default Checks;
