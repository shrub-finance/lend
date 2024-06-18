import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();

  const aETHDeployment = await deployments.get('AETH');

  const deployResult = await deploy("MockAaveV3", {
    from: deployer,
    log: true,
    args: [
        aETHDeployment.address
    ]
  });

  // Set as the owner of aETH
  if (deployResult.newlyDeployed) {
    const aeth = await ethers.getContractAt("AETH", aETHDeployment.address);
    const tx = await aeth.transferOwnership(deployResult.address);
    log(`Transferring ownership of AETH (${aETHDeployment.address}) to mockAaveV3 (${deployResult.address}) (tx: ${tx.hash})`);
    const receipt = await tx.wait();
    log(`Trasnferring ownership complete with a cost of ${receipt?.gasUsed} gas`);
  }
};
export default func;
func.id = "deploy_mock_aave_v3"; // id to prevent re-execution
func.tags = ["MockAaveV3"];
