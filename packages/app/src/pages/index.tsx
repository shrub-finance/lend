import type { NextPage } from "next";
import Head from "next/head";
import {useState} from "react";
import {useRouter} from "next/router";

const Home: NextPage = (props) => {

  const [requiredCollateral, setRequiredCollateral] = useState<string | undefined>(undefined);
  const [duration, setDuration] = useState<string | undefined>(undefined);
  const [interestRate, setInterestRate] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState<string | undefined>(undefined);
  const router = useRouter();

  const handleBorrow = () => {
    router.push('/borrow');
  };
  return (
    <>
      <Head>
        <title>Shrub Lend - Lend</title>
        <meta
          name="description"
          content="Lend"
        />
      </Head>

      <div className="md:hero mx-auto m-40">
        <div className="md:hero-content flex flex-col">
          <div className='self-start'>
            <div className="w-full">
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
