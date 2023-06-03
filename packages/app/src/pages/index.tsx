import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDuration";
import {BorrowSummaryView} from "../views/borrow/BorrowSummaryView";
import {useState} from "react";

const Home: NextPage = (props) => {

  const [requiredCollateral, setRequiredCollateral] = useState<string | undefined>(undefined);


  const handleRequiredCollateralChange = (collateral: string) => {
    setRequiredCollateral(collateral);
  };

  return (
    <div>
      <Head>
        <title>Shrub Lend</title>
        <meta
          name="description"
          content="Shrub Lend"
        />
      </Head>
      <div>
        {!requiredCollateral &&<BorrowView onRequiredCollateralChange={handleRequiredCollateralChange} />}
        {requiredCollateral && <BorrowDurationView requiredCollateral={requiredCollateral} />}
      </div>
      {/*<BorrowSummaryView/>*/}
    </div>
  );
};

export default Home;
