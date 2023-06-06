import type { NextPage } from "next";
import Head from "next/head";
import {LendView} from "../views/lend/LendView";
import {LendSummaryView} from "../views/lend/LendSummaryView";
import {useState} from "react";

const Lend: NextPage = (props) => {

  const [apy, setAPY] = useState<string | undefined>(undefined);
  const [lockPeriod, setLockPeriod] = useState<string | undefined>(undefined);
  const [supply, setSupply] = useState<string | undefined>(undefined);

  const handleLendViewChange = (apy: string, lockPeriod: string, supply: string) => {
    setAPY(apy);
    setLockPeriod(lockPeriod);
    setSupply(supply);
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
      {!apy && <LendView onLendViewChange={handleLendViewChange}/>}
      {apy && <LendSummaryView lendAmount={supply} estimatedAPY={apy} lockupPeriod={lockPeriod}/>}
    </div>
  );
};

export default Lend;
