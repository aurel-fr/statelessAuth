import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import draftAuthTx from "../services/draftAuthTx";
import { useGetDashboardQuery } from "../services/nextApi";
import { replaceAuthToken } from "../services/walletSlice";

const Authenticate = () => {
  const { address: wallet, iOS } = useSelector((state) => state.wallet);
  const { refetch } = useGetDashboardQuery(wallet, { skip: !wallet });
  const dispatch = useDispatch();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const auth = () => {
    setIsAuthenticating(true);
    draftAuthTx({ wallet })
      .then((token) => {
        dispatch(replaceAuthToken(token));
        localStorage.setItem("authToken", token);
        setIsAuthenticating(false);
      })
      .catch((err) => setErrorMsg(err?.message))
      .finally(() => refetch());
  };

  return (
    <div>
      <a href={iOS ? `algorand-wc://` : `algorand://`}>
        <button disabled={!wallet} onClick={auth}>
          Authenticate
        </button>
      </a>
      {isAuthenticating && (
        <div className="overlay">
          <div className="popup">
            <div className="close" onClick={() => (setIsAuthenticating(false), setErrorMsg(""))}>
              &times;
            </div>
            <div className="content">{errorMsg ? errorMsg : "Review the auth transaction in your wallet"}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Authenticate;
