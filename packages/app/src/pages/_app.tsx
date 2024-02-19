import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC } from 'react';
import { AppBar } from '../components/AppBar';
import { MobileMenu } from '../components/MobileMenu';
import {ThirdwebProvider} from '@thirdweb-dev/react';
import {ApolloClient, ApolloProvider, InMemoryCache} from "@apollo/client";
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';

require('../styles/globals.css');

const activeChain = "localhost";
const client = new ApolloClient({
    uri: process.env.NEXT_PUBLIC_SUBGRAPH_QUERY,
    cache: new InMemoryCache(),
    connectToDevTools: process.env.NEXT_PUBLIC_ENVIRONMENT === "development",
});

function getLibrary(provider: any): Web3Provider {
    const library = new Web3Provider(provider);
    library.pollingInterval = 12000; // Set polling interval (optional)
    return library;
}

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <>
          <Head>
            <title>Shrub Lend</title>
          </Head>
            <Web3ReactProvider getLibrary={getLibrary}>
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
            description: "Making Lending Accessible",
            logoUrl: "https://shrub.finance/static/media/logo-default.3961bf67.svg",
            url: "https://shrub.finance"
          }}>

          <ApolloProvider client={client}>
            <div className="flex flex-col h-screen">
              <AppBar/>
              <MobileMenu>
                <Component {...pageProps} />
              </MobileMenu>
            </div>
          </ApolloProvider>

          </ThirdwebProvider>
            </Web3ReactProvider>
        </>
    );
};

export default App;
