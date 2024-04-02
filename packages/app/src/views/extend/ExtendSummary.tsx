import React from 'react';
import Image from 'next/image';
import { truncateEthAddress } from '../../utils/ethMethods';
import { lendingPlatformAddress } from '../../utils/contracts';
import { ethers } from 'ethers';

interface ExtendSummaryProps {
  amountBeingExtended: string;
  estimatedAPY: string;
  oldTimestamp: Date;
  newTimestamp: Date;
  poolShareTokenAmount: number;
  totalEthYield: number;
  tokenSupply: number;
}

const ExtendSummaryView: React.FC<ExtendSummaryProps> = ({ amountBeingExtended, estimatedAPY, oldTimestamp, newTimestamp, poolShareTokenAmount, totalEthYield, tokenSupply}) =>

{
  return (

    <div className="relative group mt-4 w-full min-w-[500px]">
      <div className="flex flex-col ">
        <div className="card w-full">
          <div className="card-body ">
           <div>
              <p className="text-lg font-bold pb-2 text-left">
                Extend Deposit
              </p>
              <div className="w-full text-xl font-semibold flex flex-row">
                <span className="text-4xl  font-medium text-left w-[500px]">{amountBeingExtended} USDC</span>
                <Image alt="usdc icon" src="/usdc-logo.svg" className="w-10 inline align-baseline" width="40" height="40"/>
              </div>
              <p className="text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]">When you
                extend this deposit, <span className="font-bold">{amountBeingExtended} USDC</span> will be moved from the old lending pool with end date<span className="font-bold"> {oldTimestamp.toLocaleString()}</span> to the new lending pool with the end date <span className="font-bold">{newTimestamp.toLocaleString()}</span>. You will collect earned ETH yield of <span className="font-bold">
                  {
                    ethers.utils.formatUnits(
                      ethers.BigNumber.from(poolShareTokenAmount).mul(totalEthYield).div(tokenSupply),
                      6
                    )
                  }

              </span>.</p>
            </div>

            <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>

            {/*receipt start*/}
           <div>
              <div className="mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light">
                <div className="flex flex-row  justify-between">
                  <span className="">Previous End Date</span>
                  <span>{oldTimestamp.toDateString()}</span>
                </div>
                <div className="flex flex-row  justify-between">
                  <span className="">New End Date</span>
                  <span>{newTimestamp.toDateString()}
                    <Image alt="edit icon" src="/edit.svg" className="w-5 inline align-baseline ml-2" width="20" height="20"/>
                      </span>
                </div>
                <div className="flex flex-row  justify-between">
                  <span className="">Estimated Yield ✨</span>
                  <span className="font-semibold text-shrub-green-500"> {estimatedAPY}%</span>
                </div>
                <div className="flex flex-row  justify-between">
                  <span className="">Contract Address</span>
                  <span>{truncateEthAddress(lendingPlatformAddress)}
                    <Image alt="copy icon" src="/copy.svg" className="w-6 hidden md:inline align-baseline ml-2" width="24" height="24"/>
                      </span>
                </div>
              </div>

              <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>

             {/*CTA*/}
             <button
               className="btn btn-block bg-shrub-green border-0 hover:bg-shrub-green-500 text-xl text-white normal-case disabled:bg-shrub-grey-50 disabled:border-shrub-grey-100 disabled:text-white disabled:border">
               Extend Loan
             </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtendSummaryView;
