import usdcAbi from "./abis/FiatTokenV2_2.json";
import priceFeedAbi from "./abis/EACAggregatorProxy.json";
import wethGatewayAbi from "./abis/WrappedTokenGatewayV3.json";
import aToken from "./abis/AToken.json";

// If an address is included for a contract for a network than rather than deploying the contract on the network
// deployments.save will be called setting the abi to the specified address

export const contractAddresses: {
  [contractName: string]: {
    abi: any[],
    networks: {
      [networkName: string]: string
    }
  }
} = {
  AETH: {
    abi: aToken,
    networks: {
      sepolia: "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830",
      ethereum: "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8"
    }
  },
  USDCoin: {
    abi: usdcAbi,
    networks: {
      sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    }
  },
  // WETH_GATEWAY
  MockAaveV3: {
    abi: wethGatewayAbi,
    networks: {
      sepolia: "0x387d311e47e80b498169e6fb51d3193167d89F7D",
      ethereum: "0x893411580e590D62dDBca8a703d61Cc4A8c7b2b9"
    }
  },
  MockChainlinkAggregatorUsdcEth: {
    abi: priceFeedAbi,
    networks: {
      ethereum: "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4"
    }
  },
  MockChainlinkAggregatorEthUsd: {
    abi: priceFeedAbi,
    networks: {
      sepolia: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    }
  },
  MockChainlinkAggregatorUsdcUsd: {
    abi: priceFeedAbi,
    networks: {
      sepolia: "0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E",
    }
  },
};

// Use this to test localhost with single price feed ETH / USDC
export const singlePriceFeedNetworks = ["ethereum", "hardhat"];

// Use this to test localhost with multi price feed ETH / USD & USD / USDC
// export const singlePriceFeedNetworks = ["ethereum"];
