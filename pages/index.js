import Head from "next/head";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { UAParser } from "ua-parser-js";
import Authenticate from "../src/components/Authenticate";
import Connect from "../src/components/Connect";
import { useGetDashboardQuery } from "../src/redux/nextApi";
import { setIOS } from "../src/redux/walletSlice";
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
        <title>Stateless auth</title>
        <meta name="description" content="Stateless session management with the Algorand Wallet" />
        <link rel="icon" href="/favicon.png" />
      </Head>
      <header className={styles.header}>
        <h1>Stateless session management with the Pera Wallet</h1>
      </header>
      <main className={styles.main}>
        <Connect />
        Wallet connected: {wallet ? wallet : "none"}
        <Authenticate />
        <span>My dashboard:</span>
        {isFetching ? (
          "Fetching dashboard..."
        ) : currentData ? (
          <div className="dashboardSuccess">{currentData.message}</div>
        ) : (
          <div>
            <span>{error?.status && `status: ${error?.status}`}</span>
            <br />
            <span className="dashboardError">{error?.data?.message}</span>
          </div>
        )}
      </main>
    </div>
  );
}

export default Home;
