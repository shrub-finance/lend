import type { NextPage } from "next";
import Head from "next/head";
import { HomeView } from "../views";
import {LendView} from "../views/LendView";

const Home: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Shrub Lend</title>
        <meta
          name="description"
          content="Shrub Lend"
        />
      </Head>
      <LendView />
    </div>
  );
};

export default Home;
