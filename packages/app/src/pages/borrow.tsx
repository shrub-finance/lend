import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDuration";
import {BorrowSummaryView} from "../views/borrow/BorrowSummaryView";


const Borrow: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Shrub Lend - Borrow</title>
        <meta
          name="description"
          content="Borrow"
        />
      </Head>
      {/*<BorrowView />*/}
      {/*<BorrowDurationView/>*/}
      <BorrowSummaryView/>
    </div>
  );
};

export default Borrow;
