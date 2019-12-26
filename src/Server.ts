"use strict";

global.logger = console;
require("dotenv").config();
if (process.env.NODE_ENV === "development") {
    global.jsome = require('jsome');
}

import * as express from "express";
import * as expressPino from "express-pino-logger";
import * as Rollbar from "rollbar";
import * as signale from "signale";
import Routes from "./Routes";
import Db from "./services/Db";

// App
const app: express.Application = express();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";
app.set('host', HOST); // process.env.development ? '0.0.0.0' : '127.0.0.1');
app.set('port', Number(PORT));

// @ts-ignore
const rollbar = new Rollbar({ accessToken: process.env.ROLLBAR_TOKEN });

app.use(expressPino());
app.use(rollbar.errorHandler());
app.disable("x-powered-by");
process.on("uncaughtException", (err) => {
    signale.error("Uncaught Exception: ", err);
    process.exit(-1);
});
process.on("unhandledRejection", (reason, p) => {
    signale.error("Unhandled Rejection: Promise:", p, "Reason:", reason);
    process.exit(-1);
});

// Init the routes
Routes.init(app);

async function start() {
    // Initialize the db, routes
    await Db.init(process.env.NODE_ENV === "development");
    // The server start
    app.listen(app.get('port'), app.get('host'), (error) => {
        if (error) {
            return signale.error(`Server start failed`, error);
        }
        signale.success(`Server environment: ${process.env.NODE_ENV}`);
        signale.success(`Server is up: http://${app.get('host')}:${app.get('port')}`);
    });
}
start();
