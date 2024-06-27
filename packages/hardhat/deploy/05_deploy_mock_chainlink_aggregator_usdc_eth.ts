import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployAndVerify } = hre;

  const { deployer } = await getNamedAccounts();

  const decimals = 18;
  const initialAnswer = 434522907140495  // ETH Price - $2301.37

  const deployResult = await deployAndVerify("MockChainlinkAggregator", {
    from: deployer,
    log: true,
    args: [ decimals, initialAnswer, "USDC / ETH" ]
  });
};
export default func;
func.id = "deploy_mock_chainlink_aggregator"; // id to prevent re-execution
func.tags = ["MockChainlinkAggregator"];
