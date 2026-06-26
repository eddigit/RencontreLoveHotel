import { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: true, // Re-enable Next.js built-in parser for simplicity
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const email = req.body?.email; // Access email safely

    if (!email) {
      return res.status(400).json({ message: "Email is required (from minimal handler)" });
    }

    // Simulate success for now to see if we can get a 200
    return res.status(200).json({ message: "Password reset email sent (simulated by minimal handler)" });
  } else {
    // For non-POST requests, explicitly set Allow header as per HTTP spec for 405
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed" });
  }
}
