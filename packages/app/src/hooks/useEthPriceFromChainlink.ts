import { useContract, useContractRead } from '@thirdweb-dev/react';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

function useEthPrice(chainlinkAggregatorAddress, chainlinkAggregatorAbi) {
  const {
    contract: chainLinkAggregator,
    isLoading: chainLinkAggregatorIsLoading,
    error: chainLinkAggregatorError,
  } = useContract(chainlinkAggregatorAddress, chainlinkAggregatorAbi);

  const {
    data: usdcEthRoundData,
    isLoading: usdcEthRoundIsLoading,
    error: usdcEthRoundError,
  } = useContractRead(chainLinkAggregator, "latestRoundData", []);

  const [ethPrice, setEthPrice] = useState(ethers.BigNumber.from(0));

  useEffect(() => {
    if (usdcEthRoundData) {
      const invertedPrice = usdcEthRoundData.answer;
      const ethPriceTemp = ethers.utils.parseUnits("1", 26).div(invertedPrice);
      setEthPrice(ethPriceTemp);
    }
  }, [usdcEthRoundIsLoading, usdcEthRoundData]);

  return {
    ethPrice,
    isLoading: usdcEthRoundIsLoading || chainLinkAggregatorIsLoading,
    error: usdcEthRoundError || chainLinkAggregatorError
  };
}

export default useEthPrice;
