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
  const [view, setView] = useState<"borrow" | "duration" | "summary">("borrow");




  const handleBorrowViewChange = (collateral: string, interestRate, amount) => {
    setRequiredCollateral(collateral);
    setInterestRate(interestRate);
    setAmount(amount);
    setView("duration");

  };

  const handleDurationChange = (duration: string) => {
    setDuration(duration);
    setView("summary");
  };

  const handleBack = () => {
    if (view === "summary") {
      setView("duration");
    } else if (view === "duration") {
      setView("borrow");
    }
  };

  const handleCancel = () => {
    setView("borrow");
    
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
        {view === "borrow" &&<BorrowView onBorrowViewChange={handleBorrowViewChange} />}
        {view === "duration" &&<BorrowDurationView requiredCollateral={requiredCollateral} onDurationChange={handleDurationChange} onBackDuration={handleBack}/>}
        {view === "summary" && <BorrowSummaryView duration={duration} requiredCollateral={requiredCollateral} interestRate={interestRate} amount={amount} onBack={handleBack} onCancel={handleCancel}/>}
      </div>
    </  div>
  );
};

export default Home;
