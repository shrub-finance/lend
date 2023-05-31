import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/BorrowView";

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
      <BorrowView />
    </div>
  );
};

export default Borrow;
