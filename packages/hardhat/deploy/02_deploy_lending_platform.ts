import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const usdCoinDeployment = await deployments.get('USDCoin');

  await deploy("LendingPlatform", {
    from: deployer,
    log: true,
    args: [usdCoinDeployment.address]
  });
};
export default func;
func.id = "deploy_lending_platform"; // id to prevent re-execution
func.tags = ["LendingPlatform"];
