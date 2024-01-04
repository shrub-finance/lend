import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const deployResult = await deploy("MockChainlinkAggregator", {
    from: deployer,
    log: true,
    args: [
        185211030001   // ETH Price - $1852.11 (8 decimals)
    ]
  });
};
export default func;
func.id = "deploy_mock_chainlink_aggregator"; // id to prevent re-execution
func.tags = ["MockChainlinkAggregator"];
