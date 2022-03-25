import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import { replaceAuthToken } from "./walletSlice";

const baseUrl = "/api";

const staggeredBaseQuery = retry(
  async (args, { dispatch, getState }, extraOptions) => {
    const result = await fetchBaseQuery({
      baseUrl,
      prepareHeaders: (headers, { getState }) => {
        const token = getState().wallet.authToken;
        if (token) {
          headers.set("authorization", `Bearer ${token}`);
        }
        return headers;
      },
    })(args, { dispatch, getState }, extraOptions);

    //Let's remove the authToken if the response is a 401, the token is either expired or invalid
    if (result.error?.status === 401 && getState().wallet.authToken) {
      dispatch(replaceAuthToken(null));
      localStorage.removeItem("authToken");
    }

    // There is no use retrying when we get these errors
    if ([400, 401, 403, 404, 405, 429].includes(result.error?.status)) {
      retry.fail(result.error);
    }

    return result;
  },
  {
    maxRetries: 3,
  }
);

export const nextApi = createApi({
  reducerPath: "nextApi",
  baseQuery: staggeredBaseQuery,
  tagTypes: ["Dashboard"],
  endpoints: (builder) => ({
    getDashboard: builder.query({
      query: (wallet) => `/dashboard/${wallet}`,
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useGetDashboardQuery } = nextApi;
