import * as bodyParser from "body-parser";
import * as compression from "compression";
import { Application, Errback, NextFunction, Request, Response } from "express";
import * as passport from "passport";
import * as zlib from "zlib";

import AdminRoutes from "./components/admin";
import AuthRoutes from "./components/auth";
import MiscellaneousRoutes from "./components/miscellaneous";
import SharedRoutes from "./components/shared";
import ViewerRoutes from "./components/viewer";
import DashboardRoutes from "./components/dashboard";
import logger from "./services/LoggerService";

export default class Routes {

    public static init(app: Application) {
        app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
        app.use(bodyParser.json({ limit: "100mb" }));
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(compression(zlib.Z_BEST_SPEED));

        // Enable cors
        app.use(Routes.cors);

        // Initialize the authorization and other app routes
        AuthRoutes.init(app);
        AdminRoutes.init(app);
        ViewerRoutes.init(app);
        SharedRoutes.init(app);
        MiscellaneousRoutes.init(app);
        DashboardRoutes.init(app);
        // Catch all the mismatch routes
        app.get("/*", Routes.notFound);
        app.post("/*", Routes.notFound);
        app.use(Routes.errorHandler);
    }

    public static notFound(req: Request, res: Response) {
        return res.status(404).json({
            error: true,
            message: "This api does not exist",
        });
    }

    public static errorHandler(error: Errback, req: Request, res: Response, next: NextFunction) {
        logger.error(`[Routes][errorHandler]: `, error);
        return res.status(500).json({
            error: true,
            message: "Internal Server Error!",
        });
    }

    public static cors(req: Request, res: Response, next: NextFunction) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,PATCH,OPTIONS");
        res.header("Access-Control-Allow-Headers",
            "Content-Type, Authorization, Accept,client-security-token, Origin, Content-Length, X-Requested-With");
        if ("OPTIONS" === req.method) {
            return res.status(200).send("OK");
        } else {
            next();
        }
    }
}
