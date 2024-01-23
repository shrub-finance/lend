import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDuration";
import {BorrowSummaryView} from "../views/borrow/BorrowSummaryView";
import {useState} from "react";

const Borrow: NextPage = (props) => {

  const [requiredCollateral, setRequiredCollateral] = useState<string | undefined>(undefined);
  // const [duration, setDuration] = useState<string | undefined>(undefined);
  const [timestamp, setTimestamp] = useState(0);
  const [interestRate, setInterestRate] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState<string | undefined>(undefined);
  const [borrowView, setBorrowView] = useState<"borrow" | "duration" | "summary">("borrow");

  const handleBorrowViewChange = (collateral: string, interestRate, amount) => {
    setRequiredCollateral(collateral);
    setInterestRate(interestRate);
    setAmount(amount);
    setBorrowView("duration");

  };

  const handleTimestampChange = (timestamp: number) => {
    setTimestamp(timestamp);
    setBorrowView("summary");
  };

  const handleBack = () => {
    if (borrowView === "summary") {
      setBorrowView("duration");
    } else if (borrowView === "duration") {
      setBorrowView("borrow");
    }
  };

  const handleCancel = () => {
    setBorrowView("borrow");
    
  };

  return (
    <>
      <Head>
        <title>Shrub Lend - Borrow</title>
        <meta
          name="description"
          content="Shrub Lend"
        />
      </Head>
      <div>
        {borrowView === "borrow" &&<BorrowView onBorrowViewChange={handleBorrowViewChange} />}
        {borrowView === "duration" &&<BorrowDurationView requiredCollateral={requiredCollateral} onDurationChange={handleTimestampChange} onBackDuration={handleBack}/>}
        {borrowView === "summary" && <BorrowSummaryView timestamp={timestamp} requiredCollateral={requiredCollateral} interestRate={interestRate} amount={amount} onBack={handleBack} onCancel={handleCancel}/>}
      </div>
    </>
  );
};

export default Borrow;
