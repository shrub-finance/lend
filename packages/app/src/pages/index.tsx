import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDuration";
import {BorrowSummaryView} from "../views/borrow/BorrowSummaryView";
import {useState} from "react";

const Home: NextPage = (props) => {

  const [requiredCollateral, setRequiredCollateral] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState<string | undefined>(undefined);



  const handleRequiredCollateralChange = (collateral: string) => {
    setRequiredCollateral(collateral);
  };

  const handleDurationChange = (duration: string) => {
    setDuration(duration);
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
        {requiredCollateral && !duration &&<BorrowDurationView requiredCollateral={requiredCollateral} onDurationChange={handleDurationChange}/>}
        {duration && <BorrowSummaryView duration={duration}/>}
      </div>
      {/*<BorrowSummaryView/>*/}
    </  div>
  );
};

export default Home;
