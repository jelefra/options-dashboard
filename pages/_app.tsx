import '../styles/globals.css';
import '../styles/tickers.css';
import '../styles/accounts.css';

import { AppProps } from 'next/app';

const MyApp = ({ Component, pageProps }: AppProps) => {
  return <Component {...pageProps} />;
};

export default MyApp;
