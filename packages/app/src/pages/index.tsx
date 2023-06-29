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
    <>
      <Head>
        <title>Shrub Lend</title>
        <meta
          name="description"
          content="Shrub Lend"
        />
      </Head>
      <div className="p-40 text-center ">

            {/*heading*/}
            <p className=" text-5xl font-bold text-base-100 w-100 leading-relaxed font-semibold">
              Borrow or lend USDC
            </p>
        <p className=" text-5xl font-bold text-base-100 w-100 font-semibold ">
          with <span className="text-shrub-green font-medium">fixed</span> rates
        </p>

        <p className=" text-5xl font-bold text-base-100 w-100 leading-relaxed font-light mb-10">
          (0 -8% APR)
        </p>

        <button className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 normal-case text-xl">Get Started</button>

      </div>
    </>
  );
};

export default Home;
