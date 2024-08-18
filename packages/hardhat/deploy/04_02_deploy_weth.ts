import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployName = 'WETH9';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { skipDeployIfExists, deployments, getNamedAccounts, ethers, deployAndVerify } = hre;
  const { log } = deployments;

  const { deployer } = await getNamedAccounts();

  const alreadyPresent = await skipDeployIfExists(deployName);
  if (alreadyPresent) {
    return;
  }

  const deployResult = await deployAndVerify(deployName, {
    from: deployer,
    log: true,
    args: []
  });

};
export default func;
func.id = "deploy_weth9"; // id to prevent re-execution
func.dependencies = [];
func.tags = [deployName];
