"use strict";
import * as mongoose from "mongoose";

import DBConfig from "../config/DB";
import logger from "./LoggerService";

const S = "[Db]";

mongoose.set("useFindAndModify", false);
mongoose.set("useNewUrlParser", true);
mongoose.set("useCreateIndex", true);

export default class Db {
    public static queries = 0;
    public static logQueries = false;

    public static async init(logQueries = false) {
        // Url validation
        const URL = DBConfig.url;
        if (!URL) {
            throw Error(`MongoDB connection url is required, none given in DBConfig.url.`);
        }

        // Connection options
        const options = {
            user: DBConfig.user,
            pass: DBConfig.pass,
        };
        Db.logQueries = logQueries;
        return await Db.establishConnection(URL, options);
    }

    public static establishConnection(url: string, options = {}) {
        // options.server = { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } };
        // options.replicaSet = { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } };

        const M = `${S}[establishConnection]`;
        return new Promise((resolve, reject) => {
            mongoose.connect(url, options)
                .then(() => {
                    logger.info(M, `DB: Connected to ${url}`);
                    if (!Db.logQueries) {
                        return resolve(true);
                    }
                    mongoose.set("debug", (collectionName, method, query, doc) => {
                        Db.queries++;
                        logger.debug(M, `Query#${Db.queries}: ${collectionName}.${method}`, JSON.stringify(query));
                        return resolve(true);
                    });
                })
                .catch((error) => {
                    logger.error("Mongoose failed to connect to MongoDB.", error);
                    return reject(false);
                });
        });
    }

    public static registerSchemas(models: string[], connection) {
        models.forEach((x) => {
            require(`../models/${x}`).default(connection);
        });
    }
}
