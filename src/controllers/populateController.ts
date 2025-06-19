import { RequestHandler } from "express";
import path from "path";
import fs from "node:fs/promises";
import { AcadProgram } from "../model/acadProgram";
import { buildPopulatedProgramPayload } from "../services/populator/transform";
import { validatePopulatedPayload } from "../services/validator/courseValidator";
import { Programme } from "../types/populator";

// Populate requested programme with categorised modules
export const populateProgrammes: RequestHandler = async (req, res, next) => {
  try {
    const selections = req.body as Programme[];
    if (selections.length === 0) {
        res.status(400).json({ error: "Array of programme selections required" });
        return;
    }

    //Load, instantiate, and categorise every requested programme
    const results = await Promise.all(
        selections.map(async ({ name, type }) => {
            // example path: data/acadPrograms/mock/majors/Life Sciences.json
            const filePath = path.join(
                __dirname, `../data/acadPrograms/mock/${type}/${name}.json`
            );
            const raw = await fs.readFile(filePath, "utf-8");
            const { meta, requirement } = JSON.parse(raw);

            const prog  = new AcadProgram(meta, requirement);
            const populatedPayload = await buildPopulatedProgramPayload(prog);
            await validatePopulatedPayload([populatedPayload]);

            // Testing
            console.log(`Populated ${populatedPayload.metadata.name} (${populatedPayload.metadata.type})`);
            return { populatedPayload };
        })
    );

    res.json(results);
  } catch (err) {
    // global error middleware in server.ts handles it
    // improve readability as all errors will be handled at one place
    next(err); 
  }
}
