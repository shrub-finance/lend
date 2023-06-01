import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDuration";


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
      <BorrowDurationView/>
    </div>
  );
};

export default Borrow;
