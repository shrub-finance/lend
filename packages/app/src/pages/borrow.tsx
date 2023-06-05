import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDuration";
import {BorrowSummaryView} from "../views/borrow/BorrowSummaryView";
import {useState} from "react";

const Home: NextPage = (props) => {

  const [requiredCollateral, setRequiredCollateral] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState<string | undefined>(undefined);
  const [interestRate, setInterestRate] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState<string | undefined>(undefined);



  const handleBorrowViewChange = (collateral: string, interestRate, amount) => {
    setRequiredCollateral(collateral);
    setInterestRate(interestRate);
    setAmount(amount);

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
        {!requiredCollateral &&<BorrowView onBorrowViewChange={handleBorrowViewChange} />}
        {requiredCollateral && !duration &&<BorrowDurationView requiredCollateral={requiredCollateral} onDurationChange={handleDurationChange}/>}
        {duration && <BorrowSummaryView duration={duration} requiredCollateral={requiredCollateral} interestRate={interestRate} amount={amount}/>}
      </div>
    </  div>
  );
};

export default Home;
