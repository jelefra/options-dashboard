import accounts from '../data/accounts';

import { thousandsGBP } from '../utils/format';

import { Ledgers } from '../types';

import styles from '../styles/Table.module.css';

const AccountValues = ({ ledgers }: { ledgers: Ledgers }) => (
  <table className={styles.table}>
    <thead>
      <tr>
        <th>Account</th>
        <th>Liquidation value</th>
      </tr>
    </thead>
    <tbody>
      {Object.values(ledgers).map(({ BASE: { acctcode, netliquidationvalue } }, index) => {
        const { name } = Object.values(accounts).find(({ id }) => id === acctcode);
        return (
          <tr key={index}>
            <td className={accounts[name].colour}>{name}</td>
            <td className={styles.right}>{thousandsGBP(netliquidationvalue)}</td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

export default AccountValues;
