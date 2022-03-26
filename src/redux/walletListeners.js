import { connector } from "../adapters/walletConnect";
import { nextApi } from "./nextApi";
import { replaceAddress, replaceAuthToken } from "./walletSlice";

export const walletListeners = ({ dispatch }) => {
  connector.on("connect", (error, payload) => {
    try {
      if (error) {
        throw error;
      }
      const { accounts } = payload.params[0];
      dispatch(replaceAddress(accounts[0]));
    } catch (error) {
      console.error(error);
    }
  });

  connector.on("disconnect", (error, payload) => {
    try {
      if (error) {
        throw error;
      }
      dispatch(replaceAuthToken(null));
      dispatch(replaceAddress(null));
      dispatch(nextApi.util.resetApiState());
      localStorage.clear();
    } catch (error) {
      console.error(error);
    }
  });

  return (next) => (action) => next(action);
};
