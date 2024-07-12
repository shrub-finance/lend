import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {singlePriceFeedNetworks} from "../deploy-constants";

const deployName = 'MockChainlinkAggregatorEthUsd';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployAndVerify, skipDeployIfExists } = hre;

  const { deployer } = await getNamedAccounts();

  const alreadyPresent = await skipDeployIfExists(deployName);
  if (alreadyPresent) {
    return;
  }

  const decimals = 8;
  const initialAnswer = 312618479403  // ETH Price - $3126.18
  const description = "ETH / USD";

  const deployResult = await deployAndVerify(deployName, {
    from: deployer,
    contract: "MockChainlinkAggregator",
    log: true,
    args: [ decimals, initialAnswer, description ]
  });
};
export default func;
func.id = "deploy_mock_chainlink_aggregator_eth_usd"; // id to prevent re-execution
func.tags = [deployName];
func.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre;
  // skip this deployment if in sepolia
  return singlePriceFeedNetworks.includes(network.name);
}
