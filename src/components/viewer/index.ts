import { Application, Router } from "express";
import { readdirSync } from "fs";

export default class ViewerRoutes {
    public static init(app: Application) {
        const router = Router();
        readdirSync(__dirname)
            .filter((x) => x !== "index.js")
            .forEach((x) => {
                require(`./${x}`).default.init(router);
            });

        app.use("/v", router);
    }
}
