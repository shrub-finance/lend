import { AppProps } from "next/app";
import Head from "next/head";
import { FC } from "react";
import { AppBar } from "../components/AppBar";
import { MobileMenu } from "../components/MobileMenu";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { FinancialDataProvider } from '../components/FinancialDataContext';
import {getChainInfo} from "../utils/chains";

require("../styles/globals.css");

const {subgraphUrl, thirdwebActiveChain} = getChainInfo();

const client = new ApolloClient({
  uri: subgraphUrl,
  cache: new InMemoryCache(),
  connectToDevTools: process.env.NEXT_PUBLIC_ENVIRONMENT === "development",
});
const App: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>Shrub Lend</title>
      </Head>
      <ThirdwebProvider
        autoConnect={true}
        dAppMeta={{
          name: "Shrub Lend",
          description: "Simplified DeFi Lending and Borrowing",
          logoUrl: "https://shrub.finance/static/media/logo-default.c2ca9b15.svg",
          url: "https://shrub.finance",
          isDarkMode: false,
        }}
        clientId={"ea246b96599b72dedbc6ebcf0ea09c1e"}
        activeChain={thirdwebActiveChain}
      >
        <ApolloProvider client={client}>
          <FinancialDataProvider>
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
