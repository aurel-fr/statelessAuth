import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import draftAuthTx from "../services/draftAuthTx";
import { useGetDashboardQuery } from "../services/nextapi";
import { replaceAuthToken } from "../services/walletSlice";

const Authenticate = () => {
  const { address: wallet, iOS } = useSelector((state) => state.wallet);
  const { refetch } = useGetDashboardQuery(wallet, { skip: !wallet });
  const dispatch = useDispatch();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  return wallet ? (
    <div>
      <a href={iOS ? `algorand-wc://` : `algorand://`}>
        <button
          onClick={() => {
            setIsAuthenticating(true);
            draftAuthTx({ wallet })
              .then((token) => (dispatch(replaceAuthToken(token)), localStorage.setItem("authToken", token)))
              .catch((err) => console.log(err?.message))
              .finally(() => (refetch(), setIsAuthenticating(false)));
          }}
        >
          Authenticate
        </button>
      </a>
      {isAuthenticating && (
        <div className="overlay">
          <div className="popup">
            <div className="close" onClick={() => setIsAuthenticating(false)}>
              &times;
            </div>
            <div className="content">Review the auth transaction in your wallet</div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <p>
      <button disabled>Authenticate</button>
    </p>
  );
};

export default Authenticate;
