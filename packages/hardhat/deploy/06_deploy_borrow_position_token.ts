import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, deployAndVerify } = hre;
  const { deployer } = await getNamedAccounts();
  const allDeployments = await deployments.all();

  const NAME = "Shrub Borrow Position Token";
  const SYMBOL = "SBPT";
  const usdcAddress = allDeployments.USDCoin.address;

  await deployAndVerify("BorrowPositionToken", {
    from: deployer,
    log: true,
    args: [NAME, SYMBOL, usdcAddress],
      libraries: {
        PercentageMath: allDeployments.PercentageMath.address,
        WadRayMath: allDeployments.WadRayMath.address,
        ShrubLendMath: allDeployments.ShrubLendMath.address,
        HelpersLogic: allDeployments.HelpersLogic.address,
      }
  });

};
export default func;
func.id = "deploy_borrow_position_token"; // id to prevent re-execution
func.tags = ["BorrowPositionToken"];
func.dependencies = ["MockUsdc", "Libraries"];
