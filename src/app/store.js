import { configureStore } from "@reduxjs/toolkit";
import { nextApi } from "../services/nextapi";
import { walletListeners } from "../services/walletListeners";
import walletSlice from "../services/walletSlice";

const store = configureStore({
  reducer: {
    wallet: walletSlice,
    [nextApi.reducerPath]: nextApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat([nextApi.middleware, walletListeners]),
});

export default store;

