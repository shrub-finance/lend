import type { NextPage } from "next";
import Head from "next/head";
import {BorrowView} from "../views/borrow/BorrowView";
import {BorrowDurationView} from "../views/borrow/BorrowDuration";
import {BorrowSummaryView} from "../views/borrow/BorrowSummaryView";
import {useState} from "react";
import {useRouter} from "next/router";

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

  const router = useRouter();

  const handleBorrow = () => {
    router.push('/borrow');
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

      <div className="md:hero mx-auto m-40">
        <div className="md:hero-content flex flex-col">
          <div className='self-start'>
            <div className="w-full">
              <div className="absolute -inset-1 shadow-shrub border rounded-3xl "></div>
              <div className="flex flex-col ">
                <div className="card w-full text-center">
                  <div className="card-body text-base-100">
                    <div className="text-center">
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

                      <button className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 normal-case text-xl" onClick={handleBorrow}>Get Started</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </>
  );
};

export default Home;
