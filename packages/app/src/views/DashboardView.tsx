// Next, React
import { FC, useEffect, useState } from 'react';

// Wallet
import useUserSOLBalanceStore from "../stores/useUserSOLBalanceStore";
import {RequestAirdrop} from "../components/RequestAirdrop";
import { useConnectedWallet, useTokenBalance, useContract } from "@thirdweb-dev/react";
import * as contracts from "../../../hardhat/deployments/deployed-contracts.json"



export const DashboardView: FC = ({ }) => {
  const w = useConnectedWallet();
  // const wallet = useWallet();
  // const { connection } = useConnection();

  const [ethBalance, setEthBalance] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('');
  const [address, setAddress] = useState('');

// Your smart contract address
  const contractAddress = contracts.contracts.USDCoin.address;

// Your wallet address
  const walletAddress = "{{wallet_address}}";

  const { contract } = useContract(address, "token");
  const { data, isLoading, error } = useTokenBalance(contract, walletAddress);

  // const balance = useUserSOLBalanceStore((s) => s.balance)
  // const { getUserSOLBalance } = useUserSOLBalanceStore()

  const [tokenBalance, setTokenBalance] = useState(null);

  useEffect(() => {
    console.log('running useEffect');
    // console.log(w.balance());
    if (w && w.isConnected()) {
    //   console.log(wallet.publicKey.toBase58())
      // getUserSOLBalance(wallet.publicKey, connection)
      // setTokenBalance(w.balance());
      async function shrubBalanceHandler() {
        console.log('calculating balance');
        // const tokenAccount = await splToken.getAssociatedTokenAddress(new web3.PublicKey('7TCPsCbHcRpMdikrrqWbP6kifQJ9K3aE2drgPvpyjHns'),wallet.publicKey)
        // const tokenBalance = await connection.getTokenAccountBalance(tokenAccount)
        // const balance = await connection.getTokenAccountBalance(tokenAccount)
        // setTokenBalance(tokenBalance.value.uiAmountString);
        const fetchedAddress = await w.getAddress();
        const balance = await w.balance();
        console.log(balance);
        console.log(data,isLoading,error);
        if (fetchedAddress !== address) {
          setAddress(fetchedAddress);
        }
        if (ethBalance !== balance.displayValue) {
          setEthBalance(balance.displayValue);
        }
      }


      shrubBalanceHandler().catch(console.error);

    }
  }, [w,data,isLoading,error])



  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6'>
          <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mb-4">
            Shrub Lend
          </h1>
        </div>
        {/*<h4 className="md:w-full text-2x1 md:text-4xl text-center text-slate-300 my-2">*/}
        {/*  <p>You can do it</p>*/}
        {/*  <p className='text-slate-500 text-2x1 leading-relaxed'>I believe in you</p>*/}
        {/*</h4>*/}

        <div className="flex flex-col mt-2">
          <RequestAirdrop />
          <h4 className="md:w-full text-2xl text-slate-300 my-2">

            {w &&
              <>
                <div className="flex flex-row justify-center">
                  <div>
                    {(ethBalance || 0).toLocaleString()}
                  </div>
                  <div className='text-slate-600 ml-2'>
                    ETH
                  </div>
                </div>
                <div className='text-slate-600 ml-2'>
                  {usdcBalance !== null ? (
                    <p className='text-base-100 ml-2'>USDC Balance: {(usdcBalance || 0).toLocaleString()}</p>
                  ) : (
                    <p className='text-base-100 ml-2'>Loading USDC balance...</p>
                  )}
                </div>
              </>

            }
          </h4>
        </div>
      </div>
    </div>
  );
};
