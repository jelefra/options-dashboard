import styles from '../styles/Table.module.css';

const Currencies = ({ currencies, children }: { currencies: string[]; children: any }) => (
  <table className={styles.table}>
    <thead>
      <tr>
        <th />
        {currencies.map((currency, index) => (
          <th key={index}>{currency}</th>
        ))}
      </tr>
    </thead>
    <tbody>{children}</tbody>
  </table>
);

export default Currencies;
