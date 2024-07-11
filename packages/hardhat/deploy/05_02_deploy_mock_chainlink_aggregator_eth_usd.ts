import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployAndVerify } = hre;

  const { deployer } = await getNamedAccounts();

  const decimals = 8;
  const initialAnswer = 312618479403  // ETH Price - $3126.18
  const description = "ETH / USD";

  const deployResult = await deployAndVerify("MockChainlinkAggregatorEthUsd", {
    from: deployer,
    contract: "MockChainlinkAggregator",
    log: true,
    args: [ decimals, initialAnswer, description ]
  });
};
export default func;
func.id = "deploy_mock_chainlink_aggregator_eth_usd"; // id to prevent re-execution
func.tags = ["MockChainlinkAggregatorEthUsd"];
