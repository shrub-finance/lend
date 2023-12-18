import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC } from 'react';
import { AppBar } from '../components/AppBar';
import { MobileMenu } from '../components/MobileMenu';
import {ThirdwebProvider} from '@thirdweb-dev/react';
require('../styles/globals.css');

const activeChain = "localhost";

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <>
          <Head>
            <title>Shrub Lend</title>
          </Head>
          <ThirdwebProvider
            clientId={"ea246b96599b72dedbc6ebcf0ea09c1e"}
              activeChain={"localhost"}
              // activeChain={{
              //     chainId: 31337,
              //     rpc: ['http://localhost:8545'],
              //     nativeCurrency: {
              //         decimals: 18,
              //         symbol: "ETH"
              //     },
              //     shortName: "hardhat",
              //     slug: "localhost",
              //     testnet: true,
              //     chain: "hardhat",
              //     name: "Hardhat EVM"
              // }}
              dAppMeta={{
            name: "Shrub Lend",
            description: "DeFi Lending Simplified",
            logoUrl: "https://shrub.finance/static/media/logo-default.3961bf67.svg",
            url: "https://shrub.finance"
          }}>

            <div className="flex flex-col h-screen">

              <AppBar/>
              <MobileMenu>
                <Component {...pageProps} />
              </MobileMenu>
            </div>

          </ThirdwebProvider>
        </>
    );
};

export default App;
