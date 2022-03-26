import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import draftAuthTx from "../helpers/draftAuthTx";
import { useGetDashboardQuery } from "../redux/nextApi";
import { replaceAuthToken } from "../redux/walletSlice";

const Authenticate = () => {
  const { address: wallet, iOS } = useSelector((state) => state.wallet);
  const { refetch } = useGetDashboardQuery(wallet, { skip: !wallet });
  const dispatch = useDispatch();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const auth = async () => {
    window.location.href = iOS ? `algorand-wc://` : `algorand://`;
    setIsAuthenticating(true);
    try {
      const token = await draftAuthTx({ wallet });
      dispatch(replaceAuthToken(token));
      localStorage.setItem("authToken", token);
      setIsAuthenticating(false);
    } catch (error) {
      setErrorMsg(error?.message);
    }
    refetch();
  };

  return (
    <div>
      <button disabled={!wallet} onClick={auth}>
        Authenticate
      </button>
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
