// _app.js
import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  useEffect(() => { getSocket(); }, []);
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
        <meta name="theme-color" content="#07090f" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
