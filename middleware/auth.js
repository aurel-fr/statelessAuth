import * as nobleEd25519 from "@noble/ed25519";
import algosdk from "algosdk";
import { day2 } from "../src/constants";

const authMidddleware = async (wallet, token) => {
  //algosdk decodeSignedTx needs a Uint8Array
  const decodeToken = new Uint8Array(Buffer.from(token, "base64"));

  const decodedTx = algosdk.decodeSignedTransaction(decodeToken);

  //auth tx whose params we'll check
  const toCheck = decodedTx.txn;

  // get the public key from the account address
  const address = algosdk.decodeAddress(wallet);
  const publicKey = address.publicKey;

  // get the signature from the signed transaction
  const signature = decodedTx.sig;

  // parse the note back to utf-8
  const note = new TextDecoder().decode(toCheck.note);
  const decodedNote = note.split(" ");

  // Typed arrays represent binary data in memory,
  // comparing them directly would always return false since
  // "from" and "to" are distincts array buffers.
  // We therefore convert them back to base32 for comparison.
  const fromString = algosdk.encodeAddress(toCheck.from.publicKey);
  const toString = algosdk.encodeAddress(toCheck.to.publicKey);

  // Guard clause to make sure the token isn't expired.
  // We also check the token expiration is not too far out, which would be a red flag.
  if (Number(decodedNote[1]) < Date.now() || Number(decodedNote[1]) > Date.now() + day2) {
    throw new Error("Token expired, authenticate again");
  }

  // We check if the params match the ones we set in the front-end
  if (
    toCheck.genesisID === "mainnet-v1.0" &&
    toCheck.type === "pay" &&
    !toCheck.fee &&
    toCheck.firstRound === 10 &&
    toCheck.lastRound === 10 &&
    !toCheck.amount &&
    decodedNote[0] === "https://yourdomain.com" &&
    fromString === toString &&
    fromString === wallet
  ) {
    // verify signature and return if it succeeds
    const verified = await nobleEd25519.verify(signature, toCheck.bytesToSign(), publicKey);
    if (verified) return;
  }
  throw new Error("Invalid authentication");
};

export default authMidddleware;
