import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers, deployAndVerify } = hre;
  const { log } = deployments;
  const { deployer, shrubTreasury } = await getNamedAccounts();
  const borrowPositionTokenDeployment = await deployments.get('BorrowPositionToken');
  const allDeployments = await deployments.all();
  const isSingleChainlinkPriceFeed = Boolean(allDeployments.MockChainlinkAggregatorUsdcEth);

  const addresses = [
      allDeployments.USDCoin.address,
      allDeployments.BorrowPositionToken.address,
      allDeployments.MockAaveV3.address,
      allDeployments.AETH.address,
      isSingleChainlinkPriceFeed ? allDeployments.MockChainlinkAggregatorUsdcEth.address: ethers.ZeroAddress,
      shrubTreasury,
      isSingleChainlinkPriceFeed ? ethers.ZeroAddress : allDeployments.MockChainlinkAggregatorEthUsd.address,
      isSingleChainlinkPriceFeed ? ethers.ZeroAddress : allDeployments.MockChainlinkAggregatorUsdcUsd.address,
  ];

  const deployResult = await deployAndVerify("LendingPlatform", {
    from: deployer,
    log: true,
    libraries: {
      HelpersLogic: allDeployments.HelpersLogic.address,
      ShrubView: allDeployments.ShrubView.address,
      AdminLogic: allDeployments.AdminLogic.address,
      PercentageMath: allDeployments.PercentageMath.address,
      WadRayMath: allDeployments.WadRayMath.address,
      ShrubLendMath: allDeployments.ShrubLendMath.address,
      DepositLogic: allDeployments.DepositLogic.address,
      BorrowInternalLogic: allDeployments.BorrowInternalLogic.address,
      ExtendLogic: allDeployments.ExtendLogic.address,
      RepayLogic: allDeployments.RepayLogic.address,
      LiquidationLogic: allDeployments.LiquidationLogic.address,
      PriceFeedLogic: allDeployments.PriceFeedLogic.address,
    },
    args: [
        addresses
    ]
  });

  if (deployResult.newlyDeployed) {
    const borrowPositionToken = await ethers.getContractAt("BorrowPositionToken", borrowPositionTokenDeployment.address);
    const deployerAccount = await ethers.getSigner(deployer);
    const lendingPlatformDeployment = await deployments.get('LendingPlatform');
    const transferOwnershipResult = await borrowPositionToken.connect(deployerAccount).transferOwnership(lendingPlatformDeployment.address);
    const transferOwnershipTx = await transferOwnershipResult.getTransaction();
    log(`Transferring ownership of "BorrowPositionToken" to "LendingPlatform" (tx: ${transferOwnershipTx?.hash})`);
    const transferOwnershipReceipt = await transferOwnershipResult.wait();
    log(`Transferring ownership complete with a cost of ${transferOwnershipReceipt?.gasUsed} gas`);
  }
};
export default func;
func.id = "deploy_lending_platform"; // id to prevent re-execution
func.dependencies = [
  "Libraries",
  "LibrariesWithDep",
  "USDCoin",
  "AETH",
  "MockAaveV3",
  "MockChainlinkAggregatorUsdcEth",
  "MockChainlinkAggregatorUsdcUsd",
  "MockChainlinkAggregatorEthUsd",
  "BorrowPositionToken"
];
func.tags = ["LendingPlatform"];
