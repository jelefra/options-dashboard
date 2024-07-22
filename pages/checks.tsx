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
import tradesData from '../data/options.csv';
import styles from '../styles/Table.module.css';
import { AccountName, TradeData, TradeIBKR } from '../types';
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

const CSVDownloader = ({ tradeData }: { tradeData: EnrichedTradeData[] }) => {
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
    'closeDate',
    'closeTradePrice',
    'closeCommission',
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
      <button onClick={handleDownload}>Download CSV of enriched personal records</button>
      <a ref={linkRef} style={{ display: 'none' }} download="data.csv" />
    </>
  );
};

type EnrichedTradeIBKR = TradeIBKR & { account: AccountName };
type EnrichedTradeData = TradeData & { fullDate: string };
type Summary = { unmatched: EnrichedTradeIBKR[]; matched: EnrichedTradeData[] };
const Checks = ({ statements }: { statements: ParsedFile[] }) => {
  const personalTradeRecords: TradeData[] = tradesData.map(removeNullValues);
  const countOfManualEntries = personalTradeRecords.length;
  const preparedStatements = prepareFiles(statements);
  const countOfTradesInStatements = preparedStatements.reduce(
    (total, { trades }) =>
      (total += trades.reduce((subtotal, { Quantity }) => (subtotal += Math.abs(Quantity)), 0)),
    0
  );
  const { unmatched, matched } = preparedStatements
    .map((file) => processFile(file, personalTradeRecords))
    .reduce(
      (summary, { unmatchedTrades, matchedTrades }) => {
        summary.unmatched.push(...unmatchedTrades);
        summary.matched.push(...matchedTrades);
        return summary;
      },
      { unmatched: [], matched: [] } as Summary
    );

  const ActivityStatementsSummary = (
    <>
      <h2>IBKR activity statements</h2>
      {unmatched.length ? (
        <>
          <p>
            {unmatched.length} trades not matched out of {thousands(countOfTradesInStatements)}:
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
              {unmatched
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
        <div>All {countOfTradesInStatements} trades successfully matched</div>
      )}
    </>
  );

  const PersonalRecordsSummary = (
    <>
      <h2>Personal records</h2>
      {personalTradeRecords.length ? (
        <>
          <p>
            {personalTradeRecords.length} trades not matched out of{' '}
            {thousands(countOfManualEntries)}:
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
        <p>All {thousands(countOfManualEntries)} logged trades successfully matched</p>
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
      {ActivityStatementsSummary}
      {PersonalRecordsSummary}
      <CSVDownloader tradeData={matched} />
    </Container>
  );
};

export default Checks;
