import type { NextPage } from "next";
import Head from "next/head";
import {LendView} from "../views/lend/LendView";
import {LendSummaryView} from "../views/lend/LendSummaryView";
import {useState} from "react";

const Lend: NextPage = (props) => {

  const [apy, setAPY] = useState<string | undefined>(undefined);
  const [lockPeriod, setLockPeriod] = useState<string | undefined>(undefined);
  const [supply, setSupply] = useState<string | undefined>(undefined);
  const [view, setView] = useState<"lend" | "summary">("lend");

  const handleLendViewChange = (apy: string, lockPeriod: string, supply: string) => {
    setAPY(apy);
    setLockPeriod(lockPeriod);
    setSupply(supply);
    setView("summary");
  };

  const handleBackLend = () => {
    if (view === "summary") {
      setView("lend");
    }
  };


  return (
    <div>
      <Head>
        <title>Shrub Lend - Lend</title>
        <meta
          name="description"
          content="Lend"
        />
      </Head>
      {!apy || view === "lend" && <LendView onLendViewChange={handleLendViewChange}/>}
      {apy && view === "summary" && <LendSummaryView lendAmount={supply} estimatedAPY={apy} lockupPeriod={lockPeriod} onBackLend={handleBackLend}/>}
    </div>
  );
};

export default Lend;
