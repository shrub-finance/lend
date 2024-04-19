import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy } = deployments;

  const { deployer, shrubTreasury } = await getNamedAccounts();
  const borrowPositionTokenDeployment = await deployments.get('BorrowPositionToken');
  const allDeployments = await deployments.all();

  const addresses = [
      allDeployments.USDCoin.address,
      allDeployments.BorrowPositionToken.address,
      allDeployments.MockAaveV3.address,
      allDeployments.AETH.address,
      allDeployments.MockChainlinkAggregator.address,
      shrubTreasury
  ];

  await deploy("LendingPlatform", {
    from: deployer,
    log: true,
    libraries: {
        HelpersLogic: allDeployments.HelpersLogic.address,
        AdminLogic: allDeployments.AdminLogic.address,
        PercentageMath: allDeployments.PercentageMath.address,
        WadRayMath: allDeployments.WadRayMath.address,
        ShrubLendMath: allDeployments.ShrubLendMath.address,
    },
    args: [
        addresses
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
