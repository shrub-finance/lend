import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { getNamedAccounts, deployAndVerify } = hre;
    const { deployer } = await getNamedAccounts();

  // CONFIGURATION
  const constants = await deployAndVerify("Constants", { from: deployer, log: true, args: [] });
  const configuration = await deployAndVerify("Configuration", { from: deployer, log: true, args: [] });

  // MATH
  const percentageMath = await deployAndVerify("PercentageMath", { from: deployer, log: true, args: [] });
  const wadRayMath = await deployAndVerify("WadRayMath", { from: deployer, log: true, args: [] });
  const shrubLendMath = await deployAndVerify("ShrubLendMath", { from: deployer, log: true, args: [] });

  // VIEW
  const helpersLogic = await deployAndVerify("HelpersLogic", { from: deployer, log: true, args: [] });
  const shrubView = await deployAndVerify("ShrubView", { from: deployer, log: true, args: [] });

  // LOGIC
  const borrowInternalLogic = await deployAndVerify("BorrowInternalLogic", { from: deployer, log: true, args: [] });
  const borrowLogic = await deployAndVerify("BorrowLogic", { from: deployer, log: true, args: [] });
  const depositLogic = await deployAndVerify("DepositLogic", { from: deployer, log: true, args: [] });
  const extendBorrowLogic = await deployAndVerify("ExtendBorrowLogic", { from: deployer, log: true, args: [] });
  const extendSupplyLogic = await deployAndVerify("ExtendSupplyLogic", { from: deployer, log: true, args: [] });
  const priceFeedLogic = await deployAndVerify("PriceFeedLogic", { from: deployer, log: true, args: [] });
  const supplyLogic = await deployAndVerify("SupplyLogic", { from: deployer, log: true, args: [] });

};
export default func;
func.id = "deploy_libraries"; // id to prevent re-execution
func.tags = ["Libraries"];
