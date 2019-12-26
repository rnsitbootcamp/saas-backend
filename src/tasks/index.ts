require('events').EventEmitter.prototype._maxListeners = 14;
global.logger = console;

import aggregate from "./aggregateProcessor";
import email from "./email";
import fileUpload from "./fileUpload";
import survey from "./survey";

import DB from "../services/Db";
init();

const LRU = require("lru-cache");

const CONNECTION_CACHE = new LRU({
    max: 300,
    dispose(key, connection) {
        try {
            connection.close();
        } catch (error) {
            // logger.error(S, "closing connection error:", error);
        }
    },
    maxAge: 1000 * 60 * 60 * 1,
});
global.CONNECTION_CACHE = CONNECTION_CACHE;

async function init() {
    await DB.init();
    email();
    survey();
    fileUpload();
    aggregate();
}
