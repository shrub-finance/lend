import React, { useState } from 'react';
import Image from 'next/image';
import { formatLargeUsdc, fromEthDate, truncateEthAddress } from '../../utils/ethMethods';
import { lendingPlatformAddress, usdcAbi, usdcAddress } from '../../utils/contracts';
import { ethers } from 'ethers';
import {
  useAddress, Web3Button,
} from '@thirdweb-dev/react';
import {useFinancialData} from "../../components/FinancialDataContext";

interface WithdrawViewProps {
  setIsModalOpen: (isOpen: boolean) => void;
  selectedDepositBalance: ethers.BigNumber;
}

const WithdrawView: React.FC<WithdrawViewProps & { onModalClose: (date: Date) => void }> = (
  {onModalClose,
    selectedDepositBalance,
    setIsModalOpen
    }) =>
{

  const {store, dispatch} = useFinancialData();
  const walletAddress = useAddress();
  const [extendDepositActionInitiated, setExtendDepositActionInitiated] = useState(false);
  const handleExtendDepositActionChange = (initiated) => {
    setExtendDepositActionInitiated(initiated);
  };
  const closeModalAndPassData = () => {
    setIsModalOpen(false);
  };



  return (
    <>
    <div className='flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-shrub-grey-600'>
      <h3 className='text-xl font-semibold text-shrub-grey-900 dark:text-white'>Withdraw Deposit</h3>
      <button type='button' onClick={closeModalAndPassData}
              className='text-shrub-grey-400 bg-transparent hover:bg-shrub-grey-100 hover:text-shrub-grey-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-shrub-grey-600 dark:hover:text-white'>
        <svg className='w-3 h-3' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 14 14'>
          <path stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2'
                d='m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6'></path>
        </svg>
        <span className='sr-only'>Close modal</span>
      </button>
    </div>
  <div className='relative group mt-4 w-full min-w-[500px]'>
    <div className='flex flex-col'>
      <div className='card w-full'>
        <div className='card-body'>
          <div>

            <div className='w-full text-xl font-semibold flex flex-row'>
              <span className='text-4xl  font-medium text-left w-[500px]'>{formatLargeUsdc(selectedDepositBalance)} USDC</span>
              <Image alt='usdc icon' src='/usdc-logo.svg' className='w-10 inline align-baseline' width='40'
                     height='40' />
            </div>
            <p className='text-shrub-grey-700 text-lg text-left font-light pt-8 max-w-[550px]'>
              Withdraw will exchange your, <span className='font-bold'>{} pool share token</span> from the <span className='font-bold'> {}</span> lending pool date of <span
              className='font-bold'>{} </span> for <span className='font-bold'>{formatLargeUsdc(selectedDepositBalance)} USDC</span>, and <span className='font-bold'>{} ETH
              </span>.</p>
            </div>

            <div className='divider h-0.5 w-full bg-shrub-grey-light3 my-8'></div>

            {/*receipt start*/}
            <div>
              <div className='mb-2 flex flex-col gap-3 text-shrub-grey-200 text-lg font-light'>
                <div className='flex flex-row  justify-between'>
                  <span className=''>USDC to receive</span>
                  <span>{formatLargeUsdc(selectedDepositBalance)} USDC</span>
                </div>
                <div className="flex flex-row  justify-between cursor-pointer" >
                  <span className="">ETH to receive</span>
                  <span>{} ETH
                    <Image alt="edit icon" src="/edit.svg" className="w-5 inline align-baseline ml-2" width="20" height="20"/>
                      </span>
                </div>
                <div className="flex flex-row  justify-between">
                  <span className="">End Date</span>
                  <span className="font-semibold text-shrub-green-500"> {}%</span>
                </div>
                <div className="flex flex-row  justify-between">
                  <span className="">Contract Address</span>
                  <span>{truncateEthAddress(lendingPlatformAddress)}
                    <Image alt="copy icon" src="/copy.svg" className="w-6 hidden md:inline align-baseline ml-2" width="24" height="24"/>
                      </span>
                </div>
              </div>

              <div className="divider h-0.5 w-full bg-shrub-grey-light3 my-8"></div>
              <Web3Button contractAddress={usdcAddress}
                          contractAbi={usdcAbi}
                          className="!btn !btn-block !bg-shrub-green !border-0 !text-white !normal-case !text-xl hover:!bg-shrub-green-500 !mb-4"
              action={
                async (usdc) =>
              {
                return await usdc.contractWrapper.writeContract.approve(lendingPlatformAddress, ethers.constants.MaxUint256)
              }}>
                Withdraw Deposit
              </Web3Button>

            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default WithdrawView;
