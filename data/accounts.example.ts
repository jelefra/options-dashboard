import { Account } from '../types';

const accounts: {
  [key: string]: Account;
} = {
  'Account 1': {
    name: 'Account 1',
    capitalGains: true,
    colour: 'cFFFFFF',
    currencies: [],
  },
  'Account 2': {
    name: 'Account 2',
    capitalGains: false,
    colour: 'cE6E6FA',
    currencies: [],
  },
};

export default accounts;
