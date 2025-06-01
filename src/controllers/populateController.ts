import { RequestHandler } from "express";
import path from "path";
import fs from "node:fs/promises";
import { AcadProgram } from "../model/acadProgram";
import { categoriseModulesByRequirement } from "../services/categoriseModulesByRequirement";
import { Programme } from "../types/requirement";

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
            const cats  = await categoriseModulesByRequirement(prog);

            // Testing
            console.log(`Populated ${name} (${type})`);
            return { name, type, categorised: cats };
        })
    );

    res.json(results);
  } catch (err) {
    // global error middleware in server.ts handles it
    // improve readability as all errors will be handled at one place
    next(err); 
  }
}
