import type { NextPage } from "next";
import Head from "next/head";
import {LendView} from "../views/LendView";

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
      <LendView />
    </div>
  );
};

export default Lend;
