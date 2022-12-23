import { decimalTwo } from '../utils/format';

import { ForexRates } from '../types';

const Forex = ({ currencies, rates }: { currencies: string[]; rates: ForexRates }) => (
  <tr>
    <td>Forex rate</td>
    {currencies.map((currency, index) => (
      <td key={index}>{rates[currency] !== 1 && decimalTwo(rates[currency])}</td>
    ))}
  </tr>
);

export default Forex;
