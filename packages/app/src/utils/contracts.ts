import deployedContracts from "../../../hardhat/deployments/deployed-contracts.json"

function chainData(chainId: number) {
  return deployedContracts[chainId.toString()].find(o => o.chainId === chainId.toString());
}

export function getContractAddresses(chainId: number) {
  const data = chainData(chainId);
  return {
    usdcAddress: data.contracts.USDCoin.address,
    aethAddress: data.contracts.AETH.address,
    lendingPlatformAddress: data.contracts.LendingPlatform.address,
  }
}

export function getContractAbis(chainId: number) {
  const data = chainData(chainId);
  return {
    usdcAbi: data.contracts.USDCoin.abi,
    aethAbi: data.contracts.AETH.abi,
    lendingPlatformAbi: data.contracts.LendingPlatform.abi,
  }
}
