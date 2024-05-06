import { AppProps } from "next/app";
import Head from "next/head";
import { FC } from "react";
import { AppBar } from "../components/AppBar";
import { MobileMenu } from "../components/MobileMenu";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { FinancialDataProvider, useFinancialData } from '../components/FinancialDataContext';

require("../styles/globals.css");

const activeChain = "localhost";
const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_SUBGRAPH_QUERY,
  cache: new InMemoryCache(),
  connectToDevTools: process.env.NEXT_PUBLIC_ENVIRONMENT === "development",
});

const userFinancialData = {
  borrows: [], // initial borrows data
  deposits: [], // initial deposits data
};


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
          description: "Making Lending Accessible",
          logoUrl:
            "https://shrub.finance/static/media/logo-default.3961bf67.svg",
          url: "https://shrub.finance",
        }}
      >
        <ApolloProvider client={client}>
          <FinancialDataProvider userData={userFinancialData}>
            <div className="flex flex-col h-screen">
              <AppBar />
              <MobileMenu>
                <Component {...pageProps} />
              </MobileMenu>
            </div>
          </FinancialDataProvider>
        </ApolloProvider>
      </ThirdwebProvider>
    </>
  );
};

export default App;
