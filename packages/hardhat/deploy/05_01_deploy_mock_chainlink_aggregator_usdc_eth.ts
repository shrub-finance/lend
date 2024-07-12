import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { singlePriceFeedNetworks } from "../deploy-constants";

const deployName = 'MockChainlinkAggregatorUsdcEth';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { skipDeployIfExists, getNamedAccounts, deployAndVerify } = hre;

  const { deployer } = await getNamedAccounts();

  const alreadyPresent = await skipDeployIfExists(deployName);
  if (alreadyPresent) {
    return;
  }

  const decimals = 18;
  const initialAnswer = 434522907140495  // ETH Price - $2301.37
  const description = "USDC / ETH";

  const deployResult = await deployAndVerify(deployName, {
    from: deployer,
    contract: "MockChainlinkAggregator",
    log: true,
    args: [ decimals, initialAnswer, description ]
  });
};
export default func;
func.id = "deploy_mock_chainlink_aggregator_usdc_eth"; // id to prevent re-execution
func.tags = [deployName];
func.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre;
  // skip this deployment if in sepolia
  return !singlePriceFeedNetworks.includes(network.name);
}
