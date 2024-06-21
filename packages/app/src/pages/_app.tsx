import { AppProps } from "next/app";
import Head from "next/head";
import { FC } from "react";
import { AppBar } from "../components/AppBar";
import { MobileMenu } from "../components/MobileMenu";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { ApolloClient, ApolloProvider, InMemoryCache } from "@apollo/client";
import { FinancialDataProvider } from '../components/FinancialDataContext';

require("../styles/globals.css");

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_SUBGRAPH_QUERY,
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
        clientId={"ea246b96599b72dedbc6ebcf0ea09c1e"}
        // activeChain={"localhost"}
        activeChain={{
            chainId: 17000,
          rpc:['https://17000.rpc.thirdweb.com'],
            nativeCurrency: {
                name: "ETH",
                decimals: 18,
                symbol: "ETH"
            },
            shortName: "holesky",
            slug: "holesky",
            testnet: true,
            chain: "holesky",
            name: "Holesky"
        }}
        dAppMeta={{
          name: "Shrub Lend",
          description: "Making Lending Accessible",
          logoUrl:
            "https://shrub.finance/static/media/logo-default.3961bf67.svg",
          url: "https://shrub.finance",
        }}
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
