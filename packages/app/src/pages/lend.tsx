import type { NextPage } from "next";
import Head from "next/head";
import {LendView} from "../views/lend/LendView";
import {LendSummaryView} from "../views/lend/LendSummaryView";

const Lend: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Shrub Lend - Lend</title>
        <meta
          name="description"
          content="Lend"
        />
      </Head>
      {/*<LendView />*/}
      <LendSummaryView/>
    </div>
  );
};

export default Lend;
