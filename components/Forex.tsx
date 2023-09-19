import { ForexRates } from '../types';
import { decimalTwo } from '../utils/format';

const Forex = ({ currencies, rates }: { currencies: string[]; rates: ForexRates }) => (
  <tr>
    <td>Forex rate</td>
    {currencies.map((currency, index) => (
      <td key={index}>{rates[currency] !== 1 && decimalTwo(rates[currency])}</td>
    ))}
  </tr>
);

export default Forex;
