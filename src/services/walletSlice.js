import { createSlice } from "@reduxjs/toolkit";

const wallet = {
  address: "",
  iOS: false,
  authToken: typeof localStorage !== "undefined" ? localStorage.getItem("authToken") || null : null,
};

export const walletSlice = createSlice({
  name: "wallet",
  initialState: wallet,
  reducers: {
    replaceAddress: (state, action) => {
      state.address = action.payload;
    },
    replaceAuthToken: (state, action) => {
      state.authToken = action.payload;
    },
    setIOS: (state, action) => {
      state.iOS = action.payload;
    },
  },
});

export const { replaceAddress, setIOS, replaceAuthToken } = walletSlice.actions;

export default walletSlice.reducer;
