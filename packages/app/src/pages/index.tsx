import type { NextPage } from "next";
import Head from "next/head";
import {DashboardView} from "../views/DashboardView";


// we are using dashboard view also as the home view, can be changed in the future
const Dashboard: NextPage = () => {
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
