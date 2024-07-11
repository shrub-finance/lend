import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployAndVerify } = hre;

  const { deployer } = await getNamedAccounts();

  const decimals = 18;
  const initialAnswer = 434522907140495  // ETH Price - $2301.37
  const description = "USDC / ETH";

  const deployResult = await deployAndVerify("MockChainlinkAggregatorUsdcEth", {
    from: deployer,
    contract: "MockChainlinkAggregator",
    log: true,
    args: [ decimals, initialAnswer, description ]
  });
};
export default func;
func.id = "deploy_mock_chainlink_aggregator_usdc_eth"; // id to prevent re-execution
func.tags = ["MockChainlinkAggregatorUsdcEth"];
