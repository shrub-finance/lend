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

const activeChain = "localhost";

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <>
          <Head>
            <title>Shrub Lend</title>
          </Head>
          <ThirdwebProvider activeChain={activeChain} dAppMeta={{
            name: "Shrub Lend",
            description: "DeFi Lending Simplified",
            logoUrl: "https://shrub.finance/static/media/logo-default.3961bf67.svg",
            url: "https://shrub.finance"
          }}>
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
