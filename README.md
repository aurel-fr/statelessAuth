## Stateless session management using the Pera wallet

A simple example of how a signed transaction can be used as a bearer token for session management.

It hasn't been audited and cannot be used as is in production.

### This is a NextJs project

Both front-end and back-end code are in the same repository. Code that will run in the back-end is in /middleware and /pages/api

### Overview

Our demo app works in two steps. To access their dashboard, users will first need to connect their wallets. Connecting a wallet alone is not a proof of ownership, it cannot be sufficient to grant login credentials. Thus users are required to authenticate: self-sign their own bearer token whose digital signature our server will verify before granting access to the dashboard. 

The backend of the app is a serverless function acting as a simple api that passes requests through a middleware-like auth function.

Source code: https://github.com/AlgoDoggo/statelessAuth  
Demo app: https://stateless-auth.vercel.app/

This tutorial works along these steps:  
1- Create a bearer token by requesting the user to sign a 0 Algo 0 fee transaction.  
2- Set this token in the authorization headers of requests to the backend api.  
3- In the backend verify the signed transaction signature against the user's public key (derived from the wallet address).  

This tutorial also delves deeply into Wallet Connect and how to set it up.

### Background

Stateless authentication is fast and scalable. With JWT authentication, session data being stored with the client, a server has minimal work to carry besides key management. As we will see later, using a transaction as a bearer token even relieves the server of this, tokens are self-signed on the client-side and transmitted to the server for verification.

This system shares several of the same limitations as [JWT authentication](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html#token-storage-on-client-side). A stolen token can be used to impersonate a user and elementary precautions must be taken to mitigate that risk. Hsts should be enabled on the server and an expiration date set on the token. Auth tokens stored in local storage are vulnerable to cross-site scripting attacks and, as we'll see later, so is Wallet Connect.

This tutorial was initially written for the official Algorand wallet, it just has been taken over and rebranded by the Pera team. Since this wallet is in active development, properties such as deep links and others that are true at the time of writing this tutorial (Feb 19, 2022), could change. If you are from the future make sure to look at their latest docs.

In the conclusion of this tutorial we will briefly explore additional avenues to improve the security and user experience of authentication requests.


### 1. A quick recap on Nextjs

Next will render our app server-side and generate html from our js, for both speed and improved SEO. Our app structure lies in the pages folder. Each page is a React component associated with a route based on its filename. Index.js represents the "/" route and you can think of _app.js as the equivalent of the App component in plain React. It is there that we wrap our components in the Redux provider. There are other differences that make _app.js more powerful a feature which you can [read about here](https://nextjs.org/docs/advanced-features/custom-app).  
If you are not yet familiar with Next, go for it, you will pick it up in no time.

Our Next app is created with 

```
npx create-next-app@latest
```
Except for this one bit the install is similar than with create-react-app. The dependecies we'll install are the following: `@json-rpc-tools/utils @noble/ed25519 @reduxjs/toolkit @walletconnect/client algorand-walletconnect-qrcode-modal algosdk react-redux ua-parser-js`

Starting a next app goes with `npm run dev`

### 2. Setting up Wallet Connect

walletConnect.js:

```
import WalletConnect from "@walletconnect/client";
import QRCodeModal from "algorand-walletconnect-qrcode-modal";

export const connector = new WalletConnect({
  bridge: "https://bridge.walletconnect.org",
  qrcodeModal: QRCodeModal,
});
```


Here we are setting up our WalletConnect instance as an ES6 module. We'll be able to access it anywhere in our app by calling it as a top-level import. 

As a side note [do not send the WalletConnect instance to the Redux store](https://redux.js.org/style-guide/style-guide#do-not-put-non-serializable-values-in-state-or-actions)  if you can avoid it.

### 3. Setting up our Connect component

In Connect.jsx, let's start by writing the connect function:

```
const connectToMobileWallet = async () => {
    if (connector.connected) return;
    if (connector.pending) {
      return QRCodeModal.open(connector.uri);
    }
    await connector.createSession();
  }; 
```

Calling `createSession` if the wallet is already connected will throw an error, it's the first thing we check for.

If the connector is already initialized we simply need to re-open the QRCodeModal and feed it the uri that has already been constructed. Calling createSession again would have no effect, unless we created a new WC instance.
To understand this let's take a glance at the guard clauses in the beginning of the createSession method:
![EditorImages/2022/02/21 11:07/wc_create_session.png](https://algorand-devloper-portal-app.s3.amazonaws.com/static/EditorImages/2022/02/21%2011%3A07/wc_create_session.png) 


Finally, if the connector is neither connected nor in the pending state, we call `createSession`.


Upon successful connection Wallet Connect will automatically set the session data to localStorage.
![EditorImages/2022/02/20 23:13/wc_localstorage.png](https://algorand-devloper-portal-app.s3.amazonaws.com/static/EditorImages/2022/02/20%2023%3A13/wc_localstorage.png) 


When a user loads our app, assuming he didn't disconnect his last session, the connector will be up-to-date with the right account, encryption key etc.
Local storage being accessible from all scripts, an attacker exploiting a XSS vulnerability could send malicious payloads to users' wallets. [Hardening our apps](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) against XSS is something frameworks like React [facilitate.](https://reactjs.org/docs/introducing-jsx.html#jsx-prevents-injection-attacks) 

In our app we are making use of this session persistence to send the account address to the Redux store if it exists:



```
useEffect(() => {
    if (connector.connected && connector.accounts.length > 0) {
      dispatch(replaceAddress(connector.accounts[0]));
    }
  }, [dispatch]);
```


For convenience I'm adding a side effect for desktop users to be able to close the QRCodeModal when they press the escape key:



```
useEffect(() => {
    const escFunction = (event) => {
      if (event.keyCode === 27) {
        QRCodeModal.close();
      }
    };
    document.addEventListener("keydown", escFunction, false);
    return () => {
      document.removeEventListener("keydown", escFunction, false);
    };
  }, []);
```
Let's finish with the disconnect function:



```
const disconnectMobileWallet = async () => {
    if (!connector.connected) return;
    await connector.killSession();
  };
```

### 4. Setting up deep links

Let's setup the proper deep-linking to redirect users to their wallet when they press the authenticate button. 
The Android and iOS version of the Pera Wallet have not the same uri schemes registered. We hence need to parse user agents to detect if a user is on iOS or not and send that information to the store so we can set the appropriate deep links throughout the app. 

We just need that effect to run once so we'll set it in pages/index.js. You could also run it in a header component or any other component that mounts when your app first loads. One place you cannot set it is in _app.js since it itself isn't wrapped in the redux provider, this is a slight difference with create-react-app to keep in mind.



```
useEffect(() => {
    const ClientUAInstance = new UAParser();
    const os = ClientUAInstance.getOS();
    let iOS = false;
    if (os?.name === "Mac OS" || os?.name === "iOS") {
      iOS = true;
    }
    dispatch(setIOS(iOS));
  }, [dispatch]);
```


Have you noticed I'm adding dispatch to the dependency array? This serves no other purposes than assuaging eslint. From the Redux docs:
> The dispatch function reference will be stable as long as the same store instance is being passed to the `<Provider>`. Normally, that store instance never changes in an application.
However, the React hooks lint rules do not know that dispatch should be stable, and will warn that the dispatch variable should be added to dependency arrays for `useEffect` and `useCallback`. The simplest solution is to do just that.


Once that's done it's simply a matter of wrapping our buttons with 
`<a href={iOS ? "algorand-wc://" : "algorand://"}>`

On iOS `algorand://` will redirect you to any number of wallets that support Algorand. If your users have several wallets installed and you want to call the Pera wallet, make sure to use `algorand-wc://`

### 5. Drafting the auth transaction

draftAuthTx.js is where we define the bearer token props:



```
async function draftAuthTx({ wallet }) {
  const enc = new TextEncoder();
  const notePlainText = `https://stateless-auth.vercel.app/ ${Date.now() + day1}`;
  const note = enc.encode(notePlainText);
```


We will set two props in the note field, first is our domain address, second is the token expiration date. I've set it to 1 day from now for our convenience, in production we would use a shorter expiry.

I'm then drafting a 0 Algo 0 fee dummy transaction:



```
const authTransaction = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      suggestedParams: {
        fee: 0,
        firstRound: 10,
        flatFee: true,
        genesisHash: "wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=",
        genesisID: "mainnet-v1.0",
        lastRound: 10,
      },
      from: wallet,
      to: wallet,
      amount: 0,
      note,
    });
```

and sending it to the wallet:


```
const txnToSign = [
    {
      txn: Buffer.from(algosdk.encodeUnsignedTransaction(authTransaction)).toString("base64"),
      message: "This transaction is free and for authentication purposes.",
    },
  ];

const requestParams = [txnToSign];
const request = formatJsonRpcRequest("algo_signTxn", requestParams);
const result = await connector.sendCustomRequest(request); 
```


Note that there are active discussions on Github on [how and what these authentication transactions should look like](https://github.com/algorandfoundation/ARCs/pull/41).

Finally, after the wallet has sent back the signed transaction I will return it as a base64 string.

The Android and iOS version of the Pera Wallet _do not return the same type of JSON-RPC Response!_ The Android wallet will return a stringified typed array whereas the iOS wallet will return a base64 string. See what happens when I `console.log(result)`:

![EditorImages/2022/02/20 23:00/Android_iOS.png](https://algorand-devloper-portal-app.s3.amazonaws.com/static/EditorImages/2022/02/20%2023%3A00/Android_iOS.png) 

Let's deal with this and return:


```
const token = Array.isArray(result[0]) ? Buffer.from(result[0]).toString("base64") : result[0];
return token;
```

### 6. Setting up the Authenticate component

Authenticate.jsx is a simple button with an auth function that calls draftAuthTx and sends the token returned to the redux store and to localStorage:


```
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
```


Refetch is a function provided by our RTK query hook to trigger... a refetch. Since we have self-authenticated we want to try getting the dashboard data again. At scale if our api slice had dozens of endpoints we would not call refetch on every hook, instead we would have to setup a [noop queryFn for cache invalidation](https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#using-a-no-op-queryfn) , or use the [invalidate tags action creator](https://redux-toolkit.js.org/rtk-query/api/created-api/api-slice-utils#invalidatetags).


### 7. Setting up the Redux slice for the wallet

Our wallet slice is very straightforward. Since we are on Nextjs, our code will be executed server-side at build time where localStorage, window, and every other browser objects do not exist. Because we are loading our authToken from localStorage, in order to avoid errors at build time we need to check whether the code is being run server-side. If that is the case we just load authToken state with null.

```
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
```

We are mutating state directly in our reducers, something that should never be done in Redux, but is fine in Redux-toolkit thanks to its use of Immer under the hood.

### 8. Setting up the Redux api slice

Here the base url is  /api which is the path to Nextjs serverless functions:


```
const baseUrl = "/api";
```


I like to add retries to my queries, if a user is on a mobile and temporarily loses connectivity or gets a 5xx error it will seamlessly retry and make for a smoother user experience. We also set the headers with the authToken as a bearer token if the user has authenticated.



```
const staggeredBaseQuery = retry(
  async (args, {dispatch, getState}, extraOptions) => {
    const result = await fetchBaseQuery({
      baseUrl,
      prepareHeaders: (headers, { getState }) => {
        const token = getState().wallet.authToken;
        if (token) {
          headers.set("authorization", `Bearer ${token}`);
        }
        return headers;
      },
    })(args, {dispatch, getState}, extraOptions);

    //We remove the authToken if the response is a 401, the token is either expired or invalid
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
```


Here I'm providing the "Dashboard" tag to our endpoint but we won't do any cache invalidation in this demo.



```
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
```

### 9. Setting up Wallet Connect listeners

It looks like we're ready to sign auth requests but we forgot to listen to WalletConnect events. 
We could put those listeners as a side effect of the Connect component, but they would get tied to the component lifecycle, not ideal for an application level websocket. 
The better option is to put those listeners in a custom [Redux middleware.](https://redux.js.org/faq/code-structure#where-should-websockets-and-other-persistent-connections-live) 

Redux middleware use currying, hence the unusual syntax: `(store) => (next) => (action)`
The crucial part here is to put our socket listeners before `(action)` or every single dispatched action would create new listeners, oh yes!

Wallet connect has these events: `connect, disconnect, session_request, session_update, call_request, wc_sessionRequest, wc_sessionUpdate`(and a few more that are used internally). For this demo we'll only listen to connect and disconnect. On connect we'll dispatch the account address to the store, on disconnect we'll remove both the address and the auth token and reset our api state.



```
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
```


Since we are not in a React component here, we cannot use the `useDispatch` hook. Thankfully we can simply destructure `{ dispatch }` from the store object.

### 10. Setting up the store

We just need to concat our walletListeners middleware to the default middleware in the store. We're also adding nextApi middleware here, it's necessary for cache invalidation, polling etc none of which we will do today but it's a good habit to put it there:



```
const store = configureStore({
  reducer: {
    wallet: walletSlice,
    [nextApi.reducerPath]: nextApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat([nextApi.middleware, walletListeners]),
});
```


That's it for the front-end, we're ready to connect, disconnect, authenticate, set the signed transaction as a bearer token and listen to WalletConnect events.

### 11. Front-end conclusion and best practices

We are going to conclude the section on the front-end with a reminder that should we put our Wallet Connect listeners in a component there needs to be a cleanup when that component unmounts. It as easy as returning `connector.off("connect")` etc in our `useEffect`. 

Furthermore if we create new Wallet Connect instances every time a user clicks on a connect button, it would be good to check if the previous connector is unused and gracefully shut the websocket before opening a new one, as an example:


```
if (connector.pending && !connector.connected) {
   connector.transportClose()
}
```

This would prevent what we see in this screenshot, taken from a popular dApp, where a user who opens then closes the QRCodeModal can end up with dozens of concurrent websockets.

![EditorImages/2022/02/21 15:25/tiny_issue_cropped2.png](https://algorand-devloper-portal-app.s3.amazonaws.com/static/EditorImages/2022/02/21%2015%3A25/tiny_issue_cropped2.png) 

If we export our WC instance as a module we won't have this issue to begin with.

### 12. Setting up the back-end api

If you are familiar with the `:wallet` notation with react-router, the `[wallet]` notation is the [equivalent in Nextjs](https://nextjs.org/docs/api-routes/dynamic-api-routes#index-routes-and-dynamic-api-routes). 
Api requests for the user dashboard are therefore routed to `api/dashboard/[wallet]` and the wallet param can be accessible as `req.query`, similar to how `req.params` works in Express.



```
export default async function handler(req, res) {
  try {
    // making sure we're getting a GET request
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { wallet } = req.query;
    const token = req.headers?.authorization?.split(" ");

    // If token is undefined we return early with a 401.
    if (token?.length !== 2) {
      return res.status(401).json({ message: "Error, no authentication header." });
    }

    //middleware-like function to check the token validity
    await auth(wallet, token[1]);

    //if it passes verification, the user is authorized to get his dashboard,
    // here a simple welcome message
    res.status(200).json({ message: `Hello ${wallet}, your bearer token is verified.` });

  } catch (error) {
    console.error(error.message);
    //Sending back raw error messages could give valuable info to an attacker.
    //In production check whether the message corresponds
    //to one thrown by the auth middleware else send a generic error message.
    res.status(401).json({ message: error.message });
  }
}
```

### 13. Setting up the verification function

The last piece of the puzzle is the verification function.
Here we are using [@noble/ed25519 ](https://github.com/paulmillr/noble-ed25519) for the verification rather than Node's built-in crypto module for a couple of reasons.  
First Node's crypto module will only accept ed25519 keys in pem, der or jwk format, whereas the algosdk will give us the key as binary data represented as a Uint8Array.  
Second, noble crypto is fast, it uses precompute functions and caching to speed-up subsequent verifications. On my development server I got 70ms for the first verification, very slow, followed by 7-10 ms for the subsequent requests. For reference on the same server verifying a jwt takes 1-2 ms.




```
const authMidddleware = async (wallet, token) => {
  //converting the base64 encoded tx back to binary data
  const decodeToken = new Uint8Array(Buffer.from(token, "base64"));

  //getting a SignedTransaction object from the array buffer
  const decodedTx = algosdk.decodeSignedTransaction(decodeToken);

  //auth tx whose params we will check
  const toCheck = decodedTx.txn;

  // get the signature from the signed transaction
  const signature = decodedTx.sig;

  // parse the note back to utf-8
  const note = new TextDecoder().decode(toCheck.note);
  const decodedNote = note.split(" ");

  // "from" and "to" are distincts ArrayBuffers,
  // comparing them directly would always return false.
  // We therefore convert them back to base32 for comparison.
  const from = algosdk.encodeAddress(toCheck.from.publicKey);
  const to = algosdk.encodeAddress(toCheck.to.publicKey);

  // Guard clause to make sure the token has not expired.
  // We also check the token expiration is not too far out, which would be a red flag.
  if (Number(decodedNote[1]) < Date.now() || Number(decodedNote[1]) > Date.now() + day1 + minutes30) {
    throw new Error("Token expired, authenticate again");
  }

  // We verify that the params match the ones we set in the front-end.
  if (
    toCheck.firstRound === 10 &&
    toCheck.lastRound === 10 &&
    decodedNote[0] === "https://stateless-auth.vercel.app/" &&
    from === to &&
    // It is crucial to verify this or an attacker could sign
    // their own valid token and log into any account!
    from === wallet
  ) {
    // verify signature and return if it succeeds
    const verified = await nobleEd25519.verify(signature, toCheck.bytesToSign(), toCheck.from.publicKey);
    if (verified) return;
  }
  throw new Error("Invalid authentication");
};
```



Note this function isn't a "real" middleware, since there is no next() function to call. Vercel serverless functions only go so far.

That's it for our demo. We have a full stack app that can login, authenticate a user and return data. No more password for the users, no more key management for the server.

### 14. Conclusion

Have you noticed something inefficient in this app? We are asking users to connect then authentify, in two separate actions...

If you like this tutorial we will make a sequel starting with a discussion on WalletConnect 2.0, implementing stateful authentication, leveraging JWT+JTI and Redis to prevent replay and CRSF attacks, use secure HttpOnly cookies to mitigate potential XSS vulnerabilities, and most importantly we'll chain connect and auth in a single event so that users can be redirected once to their wallet and be done with it. 

Much remains to be done to define the standard that will enable secure and transparent authentication for Algorand powered dApps.

### 14. Acknowledgment and hyperlinks

Thanks to [@joe-p](https://github.com/joe-p) who introduced me to the noble set of crypto libraries, which is making signature verification easier than dealing with Node's OpenSSL formats.


----------


* https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html#token-storage-on-client-side
* https://nextjs.org/docs/advanced-features/custom-app
* https://redux.js.org/style-guide/style-guide#do-not-put-non-serializable-values-in-state-or-actions
* https://react-redux.js.org/api/hooks#usedispatch
* https://github.com/algorandfoundation/ARCs/pull/41
* https://redux-toolkit.js.org/rtk-query/usage/customizing-queries#using-a-no-op-queryfn
* https://redux-toolkit.js.org/rtk-query/api/created-api/api-slice-utils#invalidatetags
* https://redux.js.org/faq/code-structure#where-should-websockets-and-other-persistent-connections-live
* https://nextjs.org/docs/api-routes/dynamic-api-routes#index-routes-and-dynamic-api-routes
* https://github.com/paulmillr/noble-ed25519