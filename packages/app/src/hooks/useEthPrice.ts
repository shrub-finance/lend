import { useContract, useContractRead } from '@thirdweb-dev/react';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {roundEth} from "../utils/ethMethods";

export function useEthPrice(lendingPlatformAddress, lendingPlatformAbi) {
  const {
    contract: lendingPlatform,
    isLoading: lendingPlatformIsLoading,
    error: lendingPlatformError,
  } = useContract(lendingPlatformAddress, lendingPlatformAbi);

  const {
    data: usdcEthRoundData,
    isLoading: usdcEthRoundIsLoading,
    error: usdcEthRoundError,
  } = useContractRead(lendingPlatform, "getEthPrice", []);

  const [ethPrice, setEthPrice] = useState(ethers.BigNumber.from(0));

  useEffect(() => {
    if (usdcEthRoundData) {
      // Convert from 18 decimals to 8 decimals for compatibility
      const roundedEth = roundEth(usdcEthRoundData, 10);
      setEthPrice(roundedEth.div(ethers.utils.parseUnits("1", 10)));
    }
  }, [usdcEthRoundIsLoading, usdcEthRoundData]);

  return {
    ethPrice,
    isLoading: usdcEthRoundIsLoading || lendingPlatformIsLoading,
    error: usdcEthRoundError || lendingPlatformError
  };
}

export default useEthPrice;
