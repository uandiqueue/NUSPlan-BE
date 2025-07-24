// import { Router } from "express";
// import { buildMapCache } from "../../services/validator/cacheBuilder";

// const router = Router();

// router.get("/rebuild", async (_, res) => {
//     try {
//         const data = await buildMapCache();
//         res.json(data);
//     } catch (err) {
//         res.status(500).json({ error: (err as Error).message });
//     }
// });

// export default router;