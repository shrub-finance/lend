import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const usdCoinDeployment = await deployments.get('USDCoin');
  const borrowPositionTokenDeployment = await deployments.get('BorrowPositionToken');
  const mockAaveV3Deployment = await deployments.get('MockAaveV3');
  const aETHDeployment = await deployments.get('AETH');
<<<<<<<< HEAD:packages/hardhat/deploy/06_deploy_lending_platform.ts
  const mockChainlinkAggregatorDeployment = await deployments.get('MockChainlinkAggregator');

  const addresses = [
      usdCoinDeployment.address,
      borrowPositionTokenDeployment.address,
      mockAaveV3Deployment.address,
      aETHDeployment.address,
      mockChainlinkAggregatorDeployment.address
  ];
========
>>>>>>>> 9d69372cef6eee9ea6101f0c576fa7453960d53e:packages/hardhat/deploy/04_deploy_lending_platform.ts

  await deploy("LendingPlatform", {
    from: deployer,
    log: true,
    args: [
<<<<<<<< HEAD:packages/hardhat/deploy/06_deploy_lending_platform.ts
        addresses
========
        usdCoinDeployment.address,
        borrowPositionTokenDeployment.address,
        mockAaveV3Deployment.address,
        aETHDeployment.address
>>>>>>>> 9d69372cef6eee9ea6101f0c576fa7453960d53e:packages/hardhat/deploy/04_deploy_lending_platform.ts
    ]
  });

    const borrowPositionToken = await ethers.getContractAt("BorrowPositionToken", borrowPositionTokenDeployment.address);
    const deployerAccount = await ethers.getSigner(deployer);
    const lendingPlatformDeployment = await deployments.get('LendingPlatform');
    const transferOwnershipResult = await borrowPositionToken.connect(deployerAccount).transferOwnership(lendingPlatformDeployment.address);
    const transferOwnershipTx = await transferOwnershipResult.getTransaction();
    console.log(`Transferring ownership of "BorrowPositionToken" to "LendingPlatform" (tx: ${transferOwnershipTx?.hash})`);
    const transferOwnershipReceipt = await transferOwnershipResult.wait();
    console.log(`Trasnferring ownership complete with a cost of ${transferOwnershipReceipt?.gasUsed} gas`);
};
export default func;
func.id = "deploy_lending_platform"; // id to prevent re-execution
func.tags = ["LendingPlatform"];
