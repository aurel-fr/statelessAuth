import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { replaceAddress } from "../redux/walletSlice";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";
import { connector } from "../adapters/walletConnect";

const Connect = () => {
  const { address: wallet } = useSelector((state) => state.wallet);
  const dispatch = useDispatch();

  useEffect(() => {
    const escFunction = (event) => {
      if (event.keyCode === 27) QRCodeModal.close();
    };
    document.addEventListener("keydown", escFunction, false);
    return () => {
      document.removeEventListener("keydown", escFunction, false);
    };
  }, []);

  useEffect(() => {
    if (connector.connected && connector.accounts.length > 0) {
      dispatch(replaceAddress(connector.accounts[0]));
    }
  }, [dispatch]);

  const connectToMobileWallet = async () => {
    if (connector.connected) return;
    if (connector.pending) return QRCodeModal.open(connector.uri);
    await connector.createSession();
  };

  const disconnectMobileWallet = async () => {
    if (!connector.connected) return;
    await connector.killSession();
  };

  return (
    <div className="wallet-buttons">
      <button disabled={wallet} onClick={connectToMobileWallet}>
        Connect Wallet
      </button>
      &nbsp;
      <button disabled={!wallet} onClick={disconnectMobileWallet}>
        Disconnect Wallet
      </button>
    </div>
  );
};

export default Connect;
