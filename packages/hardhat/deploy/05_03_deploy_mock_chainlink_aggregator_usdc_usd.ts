import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {singlePriceFeedNetworks} from "../deploy-constants";

const deployName = 'MockChainlinkAggregatorUsdcUsd';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployAndVerify, skipDeployIfExists } = hre;

  const { deployer } = await getNamedAccounts();

  const alreadyPresent = await skipDeployIfExists(deployName);
  if (alreadyPresent) {
    return;
  }

  const decimals = 8;
  const initialAnswer = 100004119  // USDC Price - $0.9999
  const description = "USDC / USD";

  const deployResult = await deployAndVerify("MockChainlinkAggregatorUsdcUsd", {
    from: deployer,
    contract: "MockChainlinkAggregator",
    log: true,
    args: [ decimals, initialAnswer, description ]
  });
};
export default func;
func.id = "deploy_mock_chainlink_aggregator_usdc_usd"; // id to prevent re-execution
func.tags = ["MockChainlinkAggregatorUsdcUsd"];
func.skip = async (hre: HardhatRuntimeEnvironment) => {
  const { network } = hre;
  // skip this deployment if not in sepolia
  return singlePriceFeedNetworks.includes(network.name);
}
