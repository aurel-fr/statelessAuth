import { configureStore } from "@reduxjs/toolkit";
import { nextApi } from "./nextApi";
import walletSlice from "./walletSlice";
import { walletListeners } from "./walletListeners";

const store = configureStore({
  reducer: {
    wallet: walletSlice,
    [nextApi.reducerPath]: nextApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat([nextApi.middleware, walletListeners]),
});

export default store;
