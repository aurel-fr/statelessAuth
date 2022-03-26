import * as nobleEd25519 from "@noble/ed25519";
import algosdk from "algosdk";
import { day1, minutes30 } from "../src/constants/milliseconds";

const authMidddleware = async (wallet, token) => {
  //converting the base64 encoded tx back to binary data
  const decodeToken = new Uint8Array(Buffer.from(token, "base64"));

  //getting a SignedTransaction object from the array buffer
  const decodedTx = algosdk.decodeSignedTransaction(decodeToken);

  //auth tx whose params we'll check
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

  // We check if the params match the ones we set in the front-end
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

export default authMidddleware;
