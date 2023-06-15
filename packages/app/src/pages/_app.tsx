import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC } from 'react';
import { ContextProvider } from '../contexts/ContextProvider';
import { AppBar } from '../components/AppBar';
import { MobileMenu } from '../components/MobileMenu';
import Notifications from '../components/Notification'
import { ThirdwebProvider } from '@thirdweb-dev/react';
require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');

const activeChain = "goerli";

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <>
          <Head>
            <title>Shrub Lend</title>
          </Head>
          <ThirdwebProvider activeChain={activeChain}>
          <ContextProvider>
            <div className="flex flex-col h-screen">
              <Notifications />
              <AppBar/>
              <MobileMenu>
                <Component {...pageProps} />
              </MobileMenu>
            </div>
          </ContextProvider>
          </ThirdwebProvider>
        </>
    );
};

export default App;
