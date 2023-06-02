
// Next, React
import { FC, useEffect, useState } from 'react';

// Wallet
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

import * as splToken from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import useUserSOLBalanceStore from "../stores/useUserSOLBalanceStore";
import {RequestAirdrop} from "../components/RequestAirdrop";
const useTokenBalance = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const { getUserSOLBalance } = useUserSOLBalanceStore();

  const [tokenBalance, setTokenBalance] = useState(null);

  useEffect(() => {
    if (wallet.publicKey) {
      getUserSOLBalance(wallet.publicKey, connection);

      async function getTokenBalance() {
        const tokenAccount = await splToken.getAssociatedTokenAddress(
          new web3.PublicKey('7TCPsCbHcRpMdikrrqWbP6kifQJ9K3aE2drgPvpyjHns'),
          wallet.publicKey
        );

        const tokenBalance = await connection.getTokenAccountBalance(tokenAccount);
        setTokenBalance(tokenBalance.value.uiAmountString);
      }

      getTokenBalance().catch(console.error);
    }
  }, [wallet.publicKey, connection, getUserSOLBalance]);

  return tokenBalance;
};

export default useTokenBalance;
