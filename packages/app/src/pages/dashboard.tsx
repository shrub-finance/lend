import { ConnectWallet } from "@thirdweb-dev/react";
import type { NextPage } from "next";
import Head from "next/head";
import {DashboardView} from "../views/DashboardView";



const Dashboard: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Shrub Lend - Dashboard</title>
        <meta
          name="description"
          content="Dashboard"
        />
      </Head>
      <DashboardView/>
    </div>
  );
};

export default Dashboard;
