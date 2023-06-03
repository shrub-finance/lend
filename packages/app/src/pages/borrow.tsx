import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDuration";
import {BorrowSummaryView} from "../views/borrow/BorrowSummaryView";
import {useState} from "react";


const Borrow: NextPage = (props) => {

  const [requiredCollateral, setRequiredCollateral] = useState<string | undefined>(undefined);


  const handleRequiredCollateralChange = (collateral: string) => {
    setRequiredCollateral(collateral);
  };

  return (
    <div>
      <Head>
        <title>Shrub Lend - Borrow</title>
        <meta
          name="description"
          content="Borrow"
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

export default Borrow;
