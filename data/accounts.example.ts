import { Account } from '../types';

const accounts: {
  [key: string]: Account;
} = {
  Account1: {
    name: 'Account1',
    capitalGains: true,
    colour: 'cFFFFFF',
    currencies: [],
  },
  Account2: {
    name: 'Account2',
    capitalGains: false,
    colour: 'cE6E6FA',
    currencies: [],
  },
};

export default accounts;
