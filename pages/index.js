import Head from "next/head";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { UAParser } from "ua-parser-js";
import Authenticate from "../src/components/Authenticate";
import Connect from "../src/components/Connect";
import { useGetDashboardQuery } from "../src/services/nextapi";
import { setIOS } from "../src/services/walletSlice";
import styles from "../styles/Home.module.css";

function Home() {
  const { address: wallet } = useSelector((state) => state.wallet);
  const { currentData, isFetching, error } = useGetDashboardQuery(wallet, { skip: !wallet });
  const dispatch = useDispatch();

  useEffect(() => {
    const ClientUAInstance = new UAParser();
    const os = ClientUAInstance.getOS();
    let iOS = false;
    if (os?.name === "Mac OS" || os?.name === "iOS") {
      iOS = true;
    }
    dispatch(setIOS(iOS));
  }, [dispatch]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Web3 auth</title>
        <meta name="description" content="Web3 auth example" />
        <link rel="icon" href="/favicon.png" />
      </Head>
      <header className={styles.header}>
        <h1>Stateless session management with the Algorand Wallet</h1>
      </header>
      <main className={styles.main}>
        <Connect />
        <p>Wallet connected: {wallet ? wallet : "none"}</p>
        <Authenticate />
        <p />
        <span>My dashboard:</span>
        <br />
        {isFetching ? (
          "Fetching dashboard..."
        ) : currentData ? (
          <div className="dashboardSuccess">{currentData.message}</div>
        ) : (
          <div>
            <span>status: {error?.status}</span>
            <br />
            <span className="dashboardError">{error?.data?.message}</span>
          </div>
        )}
      </main>
    </div>
  );
}

export default Home;
