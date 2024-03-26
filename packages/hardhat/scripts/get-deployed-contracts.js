async function getDeployedContracts(env) {
  const {ethers, deployments} = env;
  return {
    aeth: await ethers.getContractAt("AETH", (await deployments.get('AETH')).address),
    usdc: await ethers.getContractAt("USDCoin", (await deployments.get('USDCoin')).address),
    bpt: await ethers.getContractAt("BorrowPositionToken", (await deployments.get('BorrowPositionToken')).address),
    lendingPlatform: await ethers.getContractAt("LendingPlatform", (await deployments.get('LendingPlatform')).address),
    mockAaveV3: await ethers.getContractAt("MockAaveV3", (await deployments.get('MockAaveV3')).address),
    mockChainlinkAggregator: await ethers.getContractAt("MockChainlinkAggregator", (await deployments.get('MockChainlinkAggregator')).address),
  }
}

module.exports = getDeployedContracts;


