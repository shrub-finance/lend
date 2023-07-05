import type { NextPage } from "next";
import Head from "next/head";
import {LendView} from "../views/lend/LendView";
import {LendSummaryView} from "../views/lend/LendSummaryView";
import {useState} from "react";

const Lend: NextPage = (props) => {

  const [apy, setAPY] = useState<string | undefined>(undefined);
  const [timestamp, setTimestamp] = useState(0);
  const [lockPeriod, setLockPeriod] = useState<string | undefined>(undefined);
  const [supply, setSupply] = useState<string | undefined>(undefined);
  const [view, setView] = useState<"lend" | "summary">("lend");

  const handleLendViewChange = (apy: string, timestamp: number, supply: string) => {
    setAPY(apy);
    // setLockPeriod(lockPeriod);
    setTimestamp(timestamp)
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
      {!apy && view === "lend" && <LendView onLendViewChange={handleLendViewChange}/>}
      {apy && view === "summary" && <LendSummaryView lendAmount={supply} estimatedAPY={apy} timestamp={timestamp} onBackLend={handleBackLend}/>}
    </div>
  );
};

export default Lend;
