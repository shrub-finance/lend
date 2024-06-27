import {ChainInfo} from "../types/types";

/**
 * @notice Returns chain specific configuration for valid chains
 * @dev looks up based on NEXT_PUBLIC_CHAIN_NAME (localhost, sepolia, holesky)
 * @return maxBorrowV the maximum USDC that can be borrowed (expressed with 6 decimals)
 */
export function getChainInfo(): ChainInfo {
  const validChainNames = ['localhost', 'sepolia', 'holesky'];
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME;
  if (!validChainNames.includes(chainName)) {
    throw new Error("Invalid chain name");
  }
  if (chainName === 'localhost') {
    return {
      chainId: 1337,
      subgraphUrl: 'http://localhost:8000/subgraphs/name/shrub-lend',
      rpcUrl: ''
    };
  }
  if (chainName === 'sepolia') {
    return {
      chainId: 11155111,
      subgraphUrl: 'https://api.studio.thegraph.com/query/77063/shrub-lend-sepolia/v0.0.1',
      rpcUrl: 'https://11155111.rpc.thirdweb.com'
    };
  }
  if (chainName === 'holesky') {
    return {
      chainId: 17000,
      subgraphUrl: 'https://api.studio.thegraph.com/query/77063/shrub-lend-holesky/v0.0.3',
      rpcUrl: 'https://17000.rpc.thirdweb.com'
    }
  }
}
