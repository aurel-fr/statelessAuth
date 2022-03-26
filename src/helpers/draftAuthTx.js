import { formatJsonRpcRequest } from "@json-rpc-tools/utils";
import algosdk from "algosdk";
import { day1 } from "../constants/milliseconds";
import { connector } from "../adapters/walletConnect";

async function draftAuthTx({ wallet }) {
  const enc = new TextEncoder();
  const notePlainText = `https://stateless-auth.vercel.app/ ${Date.now() + day1}`;
  const note = enc.encode(notePlainText);

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

  const txnToSign = [
    {
      txn: Buffer.from(algosdk.encodeUnsignedTransaction(authTransaction)).toString("base64"),
      message: "This transaction is free and for authentication purposes.",
    },
  ];

  const requestParams = [txnToSign];
  const request = formatJsonRpcRequest("algo_signTxn", requestParams);
  const result = await connector.sendCustomRequest(request);
  const token = Array.isArray(result[0]) ? Buffer.from(result[0]).toString("base64") : result[0];
  return token;
}
export default draftAuthTx;
