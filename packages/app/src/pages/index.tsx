import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDuration";
import {BorrowSummaryView} from "../views/borrow/BorrowSummaryView";

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
      <BorrowView />
      {/*<BorrowDurationView/>*/}
      {/*<BorrowSummaryView/>*/}
    </div>
  );
};

export default Home;
