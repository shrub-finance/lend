import type { NextPage } from "next";
import Head from "next/head";
import {DashboardView} from "../views/dashboard/DashboardView.bak";

const DashboardBak: NextPage = (props) => {
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

export default DashboardBak;
