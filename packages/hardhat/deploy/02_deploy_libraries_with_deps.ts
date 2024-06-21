import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const allDeployments = await deployments.all();

  await deploy("AdminLogic", {
    from: deployer,
    log: true,
    args: [],
    libraries: {
      HelpersLogic: allDeployments.HelpersLogic.address,
    }
  });
  await deploy("ExtendLogic", {
    from: deployer,
    log: true,
    args: [],
    libraries: {
      HelpersLogic: allDeployments.HelpersLogic.address,
      ShrubView: allDeployments.ShrubView.address,
    }
  });
  await deploy("RepayLogic", {
    from: deployer,
    log: true,
    args: [],
    libraries: {
      ShrubView: allDeployments.ShrubView.address,
    }
  });
  await deploy("LiquidationLogic", {
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
func.tags = ["LibrariesWithDep"];
