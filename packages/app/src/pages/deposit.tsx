import type { NextPage } from "next";
import Head from "next/head";
import {DepositView} from "../views/deposit/DepositView";
import {DepositSummaryView} from "../views/deposit/DepositSummaryView";
import {useState} from "react";

const Deposit: NextPage = (props) => {

  const [apy, setAPY] = useState<string | undefined>(undefined);
  const [timestamp, setTimestamp] = useState(0);
  const [supply, setSupply] = useState<string | undefined>(undefined);
  const [depositView, setDepositView] = useState<"deposit" | "summary">("deposit");

  const handleDepositViewChange = (apy: string, timestamp: number, supply: string) => {
    setAPY(apy);
    // setLockPeriod(lockPeriod);
    setTimestamp(timestamp)
    setSupply(supply);
    setDepositView("summary");
  };

  const handleBackDeposit = () => {
      setDepositView("deposit");

  };


  return (
    <>
      <Head>
        <title>Shrub Lend - Deposit</title>
        <meta
          name="description"
          content="Deposit"
        />
      </Head>
      {depositView === "deposit" && <DepositView onDepositViewChange={handleDepositViewChange}/>}
      {apy && depositView === "summary" && <DepositSummaryView depositAmount={supply} estimatedAPY={apy} timestamp={timestamp} backOnDeposit={handleBackDeposit}/>}
    </>
  );
};

export default Deposit;
