// Next, React
import { FC, useEffect, useState } from 'react';
import Link from 'next/link';

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

// Components
import { RequestAirdrop } from '../components/RequestAirdrop';
import useUserSOLBalanceStore from "../stores/useUserSOLBalanceStore";

// Store


export const DashboardView: FC = ({ }) => {
  const wallet = useWallet();
  const { connection } = useConnection();

  const balance = useUserSOLBalanceStore((s) => s.balance)
  const { getUserSOLBalance } = useUserSOLBalanceStore()

  useEffect(() => {
    if (wallet.publicKey) {
      console.log(wallet.publicKey.toBase58())
      getUserSOLBalance(wallet.publicKey, connection)
    }
  }, [wallet.publicKey, connection, getUserSOLBalance])

  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6'>
          <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text bg-gradient-to-br from-shrub-green to-shrub-green-50 mb-4">
            Shrub Lend
          </h1>
        </div>
        <h4 className="md:w-full text-2x1 md:text-4xl text-center text-slate-300 my-2">
          <p>You can do it</p>
          <p className='text-slate-500 text-2x1 leading-relaxed'>I believe in you</p>
        </h4>
        <div className="relative group">
            <div className="hero-content flex-col lg:flex-row-reverse">
              <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
                <div className="card-body">
                  E pluribus unum
                </div>
              </div>
            </div>

        </div>
        <div className="flex flex-col mt-2">
          <RequestAirdrop />
          <h4 className="md:w-full text-2xl text-slate-300 my-2">
            {wallet &&
              <div className="flex flex-row justify-center">
                <div>
                  {(balance || 0).toLocaleString()}
                </div>
                <div className='text-slate-600 ml-2'>
                  SOL
                </div>
              </div>
            }
          </h4>
        </div>
      </div>
    </div>
  );
};
