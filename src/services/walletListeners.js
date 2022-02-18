import { connector } from "./connector";

export const walletListeners = (store) => {
  connector.on("connect", (error, payload) => {
    try {
      if (error) {
        throw error;
      }
      const { accounts } = payload.params[0];
      store.dispatch({
        type: "wallet/replaceAddress",
        payload: accounts[0],
      });
    } catch (error) {
      console.error(error);
    }
  });

  connector.on("disconnect", (error, payload) => {
    try {
      if (error) {
        throw error;
      }
      store.dispatch({
        type: "wallet/replaceAddress",
        payload: null,
      });
      store.dispatch({
        type: "wallet/replaceAuthToken",
        payload: null,
      });
      localStorage.clear();
    } catch (error) {
      console.error(error);
    }
  });

  return (next) => (action) => next(action);
};
