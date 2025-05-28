import { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase";

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
    // The id token should be in the Authorization header
    const idToken = req.headers.authorization;

    if (!idToken) {
        return res.status(401).json({ error: "No token provided" });
    }

    // idToken comes from the client app
    auth.verifyIdToken(idToken)
    .then((decodedToken) => {
        next()
    })
    .catch((err) => {
        return res.status(401).json({ error: "Invalid or expired token" });
    });
}
