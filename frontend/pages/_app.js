// _app.js
import '../styles/globals.css';
import { useEffect } from 'react';
import { getSocket } from '../lib/socket';

export default function App({ Component, pageProps }) {
  useEffect(() => { getSocket(); }, []);
  return <Component {...pageProps} />;
}
