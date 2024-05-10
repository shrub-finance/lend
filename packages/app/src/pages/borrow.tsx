import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDurationView";
import {BorrowSummaryView} from "../views/borrow/BorrowSummaryView";
import {useState} from "react";
import { ethers } from 'ethers';
import { Zero } from '../constants';

const Borrow: NextPage = (props) => {

  const [requiredCollateral, setRequiredCollateral] = useState<ethers.BigNumber>(Zero);
  const [timestamp, setTimestamp] = useState(0);
  const [interestRate, setInterestRate] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState<string | undefined>(undefined);
  const [borrowView, setBorrowView] = useState<"borrow" | "duration" | "summary">("borrow");

  const handleBorrowViewChange = (interestRate, amount) => {
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
        {borrowView === "borrow" && <BorrowView onBorrowViewChange={handleBorrowViewChange} requiredCollateral={requiredCollateral} setRequiredCollateral={setRequiredCollateral}/>}
        {borrowView === "duration" && <BorrowDurationView requiredCollateral={requiredCollateral} onDurationChange={handleTimestampChange} onBackDuration={handleBack}/>}
        {borrowView === "summary" && <BorrowSummaryView timestamp={timestamp} requiredCollateral={requiredCollateral} interestRate={interestRate} amount={amount} onBack={handleBack} onCancel={handleCancel} setRequiredCollateral={setRequiredCollateral}/>}
      </div>
    </>
  );
};

export default Borrow;
