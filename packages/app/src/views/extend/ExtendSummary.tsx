import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { timestamps, toEthDate, truncateEthAddress } from '../../utils/ethMethods';
import { lendingPlatformAbi, lendingPlatformAddress, usdcAbi, usdcAddress } from '../../utils/contracts';
import { BigNumber, ethers } from 'ethers';
import {
  useAddress,
  useBalance,
  useContract,
  useContractRead,
  useContractWrite,
  Web3Button,
} from '@thirdweb-dev/react';
import { handleErrorMessagesFactory } from '../../utils/handleErrorMessages';
import { useLazyQuery } from '@apollo/client';
import { ACTIVE_LENDINGPOOLS_QUERY } from '../../constants/queries';

interface ExtendSummaryProps {
  lendAmountBeingExtended: string;
  estimatedAPY: string;
  oldTimestamp: Date;
  newTimestamp: Date;
  poolShareTokenAmount: number;
  totalEthYield: number;
  tokenSupply: number;
  poolTokenId: string;
}

const ExtendSummaryView: React.FC<ExtendSummaryProps> = (
  { lendAmountBeingExtended, estimatedAPY, oldTimestamp, newTimestamp, poolShareTokenAmount, totalEthYield, tokenSupply, poolTokenId}) =>
{
  const [
    getActiveLendingPools,
    {
      loading: activeLendingPoolsLoading,
      error: activeLendingPoolsError,
      data: activeLendingPoolsData,
      startPolling: activeLendingPoolsStartPolling,
      stopPolling: activeLendingPoolsStopPolling,
    },
  ] = useLazyQuery(ACTIVE_LENDINGPOOLS_QUERY);

  const walletAddress = useAddress();
  const {
    contract: usdc,
    isLoading: usdcIsLoading,
    error: usdcError
  } = useContract(usdcAddress, usdcAbi);
  const {
    contract: lendingPlatform,
    isLoading: lendingPlatformIsLoading,
    error: lendingPlatformError
  } = useContract(lendingPlatformAddress, lendingPlatformAbi);
  const {
    mutateAsync: mutateAsyncApprove,
    isLoading: isLoadingApprove,
    error: errorApprove
  } = useContractWrite(
    usdc,
    "approve",
  );
  const [localError, setLocalError] = useState("");
  const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
  const {
    data: allowance,
    isLoading: allowanceIsLoading,
    error: errorAllowance
  } = useContractRead(usdc, "allowance", [walletAddress, lendingPlatformAddress]);


  useEffect(() => {
    if (!walletAddress) return;

    getActiveLendingPools().then().catch(error => {
      console.error("Failed to fetch active lending pools:", error);
    });
  }, [walletAddress, getActiveLendingPools]);


  useEffect(() => {
    // console.log("running userPositionsDataLoading useEffect");
    if (activeLendingPoolsLoading) {
      return;
    }
  }, [activeLendingPoolsLoading]);

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
                <span className="text-4xl  font-medium text-left w-[500px]">{lendAmountBeingExtended} USDC</span>
                <Image alt="usdc icon" src="/usdc-logo.svg" className="w-10 inline align-baseline" width="40" height="40"/>
              </div>
              <p className="text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]">When you
                extend this deposit, <span className="font-bold">{lendAmountBeingExtended} USDC</span> will be moved from the old lending pool ending<span className="font-bold"> {oldTimestamp?.toLocaleString()}</span> to the new lending pool ending <span className="font-bold">{newTimestamp?.toLocaleString()}</span>. You will collect earned ETH yield of <span className="font-bold">
                  {
                    poolShareTokenAmount && ethers.utils.formatUnits(
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
                  <span>{oldTimestamp?.toDateString()}</span>
                </div>
                <div className="flex flex-row  justify-between">
                  <span className="">New End Date</span>
                  <span>{newTimestamp?.toDateString()}
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
             {/*approve and extend deposit*/}
             {(allowanceIsLoading) ? (
               <p>Loading balance...</p>
             ) : (
               <>
                 {/* Approve if allowance is insufficient, and balance is enough */}
                 {!allowance ||
                 BigNumber.from(allowance).lt(
                   ethers.utils.parseUnits(lendAmountBeingExtended, 6),
                 )
                   && (
                     <Web3Button
                       contractAddress={lendingPlatformAddress}
                       contractAbi={lendingPlatformAbi}
                       className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
                       action={() =>
                         mutateAsyncApprove({
                           args: [
                             lendingPlatformAddress,
                             ethers.constants.MaxUint256,
                           ],
                         })
                       }
                       onSuccess={() => {}}
                       onError={(e) => {
                         if (e instanceof Error) {
                           handleErrorMessages({ err: e });
                         }
                       }}
                     >
                       Approve USDC
                     </Web3Button>
                   )
                   }

                 {allowance &&
                   !BigNumber.from(allowance).lt(
                     ethers.utils.parseUnits(lendAmountBeingExtended, 6),
                   ) && (
                     <Web3Button
                       contractAddress={lendingPlatformAddress}
                       contractAbi = {lendingPlatformAbi}
                       className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4 web3button"
                       action={
                         async (lendingPlatform) =>
                         {
                             return await lendingPlatform?.contractWrapper?.writeContract?.extendDeposit(
                               toEthDate(oldTimestamp),
                               toEthDate(newTimestamp),
                               ethers.utils.formatUnits(poolShareTokenAmount, 0)
                             );
                         }
                     }

                       onSuccess={async (tx) => {

                         try {
                           const receipt = await tx.wait();
                           if(!receipt.status) {
                             throw new Error("Transaction failed")
                           }


                         } catch (e) {
                           console.log("Transaction failed:", e);

                         }

                       }}
                       onError={(e) => {
                         handleErrorMessages({err: e});

                       }}
                     >
                       Extend Deposit
                     </Web3Button>
                   )}
               </>
             )}


            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtendSummaryView;
