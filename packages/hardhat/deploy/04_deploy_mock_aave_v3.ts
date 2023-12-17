import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const aETHDeployment = await deployments.get('AETH');

  const deployResult = await deploy("MockAaveV3", {
    from: deployer,
    log: true,
    args: [
        aETHDeployment.address
    ]
  });

};
export default func;
func.id = "deploy_mock_aave_v3"; // id to prevent re-execution
func.tags = ["MockAaveV3"];
