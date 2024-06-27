import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, deployAndVerify } = hre;
  const { deployer } = await getNamedAccounts();
  const allDeployments = await deployments.all();

  await deployAndVerify("AdminLogic", {
    from: deployer,
    log: true,
    args: [],
    libraries: {
      HelpersLogic: allDeployments.HelpersLogic.address,
    }
  });
  await deployAndVerify("ExtendLogic", {
    from: deployer,
    log: true,
    args: [],
    libraries: {
      HelpersLogic: allDeployments.HelpersLogic.address,
      ShrubView: allDeployments.ShrubView.address,
    }
  });
  await deployAndVerify("RepayLogic", {
    from: deployer,
    log: true,
    args: [],
    libraries: {
      ShrubView: allDeployments.ShrubView.address,
    }
  });
  await deployAndVerify("LiquidationLogic", {
    from: deployer,
    log: true,
    args: [],
    libraries: {
      HelpersLogic: allDeployments.HelpersLogic.address,
      ShrubView: allDeployments.ShrubView.address,
    }
  });
};
export default func;
func.id = "deploy_libraries_with_dep"; // id to prevent re-execution
func.dependencies = ["Libraries"];
func.tags = ["LibrariesWithDep"];
