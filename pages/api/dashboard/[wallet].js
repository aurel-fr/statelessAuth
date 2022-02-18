import auth from "../../../middleware/auth.js";

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
      return res.status(401).json({ message: "Please authenticate to access your dashboard." });
    }

    //middleware-like function to check the token validity
    await auth(wallet, token[1]);
    //if it passes the verification, the user is authorized to get his dashboard
    // here a simple welcome message
    res.status(200).json({ message: `Hello ${wallet}, your bearer token is verified.` });
  } catch (error) {
    console.error(error.message);
    //Sending back raw error messages could give valuable info to an attacker.
    //In production check whether the message corresponds
    //to one thrown by the auth function else send a generic error message.
    res.status(401).json({ message: error.message });
  }
}
