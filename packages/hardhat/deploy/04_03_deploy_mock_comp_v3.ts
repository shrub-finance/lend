import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployName = 'CWETH';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { skipDeployIfExists, deployments, getNamedAccounts, ethers, deployAndVerify } = hre;
  const { log } = deployments;

  const { deployer } = await getNamedAccounts();

  const alreadyPresent = await skipDeployIfExists(deployName);
  if (alreadyPresent) {
    return;
  }

  const name = "Compount WETH";
  const symbol = "cWETHv3";
  const weth9Deployment = await deployments.get('WETH9');

  const deployResult = await deployAndVerify(deployName, {
    from: deployer,
    log: true,
    args: [
        name,
        symbol,
        weth9Deployment.address
    ]
  });

};
export default func;
func.id = "deploy_mock_comp_v3"; // id to prevent re-execution
func.dependencies = ["WETH9"];
func.tags = [deployName];
