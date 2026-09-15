import Head from 'next/head';

export default function App({ Component, pageProps }) {
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
