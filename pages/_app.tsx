import { AppProps } from 'next/app';

import '../styles/globals.css';
import '../styles/tickers.css';
import '../styles/accounts.css';

const MyApp = ({ Component, pageProps }: AppProps) => {
  return <Component {...pageProps} />;
};

export default MyApp;
