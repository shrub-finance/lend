import type { NextPage } from "next";
import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";

const Home: NextPage = (props) => {
  const [requiredCollateral, setRequiredCollateral] = useState<
    string | undefined
  >(undefined);
  const [duration, setDuration] = useState<string | undefined>(undefined);
  const [interestRate, setInterestRate] = useState<string | undefined>(
    undefined,
  );
  const [amount, setAmount] = useState<string | undefined>(undefined);
  const router = useRouter();

  const handleBorrow = () => {
    router.push("/borrow");
  };
  return (
    <>
      <Head>
        <title>Shrub Lend - Home</title>
        <meta name="description" content="Lend" />
      </Head>

      <div className="md:hero mx-auto">
        <div className="md:hero-content flex flex-col">
          <div className="self-start">
            <div className="w-full">
              <div className="flex flex-col ">
                <div className="h-screen flex justify-center items-center">
                  <div className="card w-full text-center">
                    <div className="card-body flex flex-col items-center">
                      <p className="font-bold text-[36px] md:text-[48px] lg:text-[72px] leading-tight md:leading-[56px] lg:leading-[90px] tracking-tight md:tracking-[-0.72px] lg:tracking-[-1.44px] bg-gradient-to-r from-[#1B8E8E] to-[#38F6C9] bg-clip-text text-transparent">
                        0% interest loans
                      </p>
                      <p className="w-full max-w-[506px] text-[16px] md:text-[18px] lg:text-[20px] font-normal leading-[24px] md:leading-[28px] lg:leading-[30px] text-[#475467] mt-6">
                        Borrow USDC against your ETH with full flexibility.
                        Leave your loan open or pay it back whenever you want
                        with for as low as 0-8% APR.{" "}
                      </p>
                      <div className="mt-12">
                        <button
                          className="flex items-center justify-center w-[213px] px-7 py-4 gap-5 rounded-[33px] border border-[#101828] bg-[#101828] font-semibold text-white shadow-[0px_1px_2px_rgba(16,24,40,0.05)] hover:bg-[hsl(221,43%,11%)]"
                          onClick={handleBorrow}
                        >
                          Launch App
                          <svg
                            width="24"
                            height="25"
                            viewBox="0 0 24 25"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <g id="arrow-right">
                              <path
                                id="Icon"
                                d="M5 12.5H19M19 12.5L12 5.5M19 12.5L12 19.5"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>
                          </svg>
                        </button>
                      </div>
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
