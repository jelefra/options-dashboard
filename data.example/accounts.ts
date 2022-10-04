import { Account } from '../types';

const accounts: {
  [key: string]: Account;
} = {
  Account1: {
    name: 'Account1',
    id: 'U1234567',
    capitalGains: true,
    colour: 'cFFFFFF',
    currencies: [],
  },
  Account2: {
    name: 'Account2',
    id: 'U2345678',
    capitalGains: false,
    colour: 'cE6E6FA',
    currencies: [],
  },
};

export default accounts;
