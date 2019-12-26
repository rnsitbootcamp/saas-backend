import { Application } from "express";
import { readdirSync } from "fs";

export default class AdminRoutes {
    public static init(app: Application) {
        readdirSync(__dirname)
            .filter((x) => x !== "index.js")
            .forEach((x) => {
                require(`./${x}`).default.init(app);
            });
    }
}
