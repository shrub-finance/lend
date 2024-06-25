import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {DeployOptions} from "hardhat-deploy/dist/types";

async function deployAndVerify(name: string, options: DeployOptions, hre: HardhatRuntimeEnvironment) {
  const { deployments, run, network } = hre;
  const { deploy } = deployments;
  const deployResult = await deploy(name, options);
  if (['hardhat', 'localhost'].includes(network.name)) {
    // Skip verification if local testing
    return deployResult;
  }
  await run('verify:verify', {
    address: deployResult.address,
    constructorArgsParams: deployResult.args,
    libraries: deployResult.libraries
  })
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, run, network } = hre;
    const { deployer } = await getNamedAccounts();

    async function depAndVer(name: string, options: DeployOptions) {
      return deployAndVerify(name, options, hre);
    }

  // CONFIGURATION
  const constants = await depAndVer("Constants", { from: deployer, log: true, args: [] });
  const configuration = await depAndVer("Configuration", { from: deployer, log: true, args: [] });

  // MATH
  const percentageMath = await depAndVer("PercentageMath", { from: deployer, log: true, args: [] });
  const wadRayMath = await depAndVer("WadRayMath", { from: deployer, log: true, args: [] });
  const shrubLendMath = await depAndVer("ShrubLendMath", { from: deployer, log: true, args: [] });

  // VIEW
  const helpersLogic = await depAndVer("HelpersLogic", { from: deployer, log: true, args: [] });
  const shrubView = await depAndVer("ShrubView", { from: deployer, log: true, args: [] });

  // LOGIC
  const borrowInternalLogic = await depAndVer("BorrowInternalLogic", { from: deployer, log: true, args: [] });
  const borrowLogic = await depAndVer("BorrowLogic", { from: deployer, log: true, args: [] });
  const depositLogic = await depAndVer("DepositLogic", { from: deployer, log: true, args: [] });
  const extendBorrowLogic = await depAndVer("ExtendBorrowLogic", { from: deployer, log: true, args: [] });
  const extendSupplyLogic = await depAndVer("ExtendSupplyLogic", { from: deployer, log: true, args: [] });
  const supplyLogic = await depAndVer("SupplyLogic", { from: deployer, log: true, args: [] });

};
export default func;
func.id = "deploy_libraries"; // id to prevent re-execution
func.tags = ["Libraries"];
