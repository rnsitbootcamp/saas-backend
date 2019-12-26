require("dotenv").config();
import * as path from "path";

import MailTemplate from "../models/MailTemplate";

import DB from "../services/Db";

import logger from "../services/LoggerService";

setTimeout(async () => {
    await init();
});

async function add({ key, filePath, name }) {
    try {
        return await MailTemplate.create({
            key,
            path: filePath,
            name,
        });
    } catch (error) {
        logger.error(error);
    }
}

async function init() {
    await DB.init();
    await MailTemplate.deleteMany({});
    await add({
        key: "send_email_verification_code",
        filePath: path.resolve(path.join(__dirname, "../../", "templates", "send_verification_code.ejs")),
        name: "send-verification-code",
    });

    await add({
        key: "admin_added_user",
        filePath: path.resolve(path.join(__dirname, "../../", "templates", "admin_added_user.ejs")),
        name: "register",
    });

    await add({
        key: "welcome",
        filePath: path.resolve(path.join(__dirname, "../../", "templates", "welcome.ejs")),
        name: "welcome-email",
    });

    await add({
        key: "reset",
        filePath: path.resolve(path.join(__dirname, "../../", "templates", "reset.ejs")),
        name: "reset-email",
    });

    await add({
        key: "store_disapproved",
        filePath: path.resolve(path.join(__dirname, "../../", "templates", "store_disapproved.ejs")),
        name: "store-disapproved",
    });
    await add({
        key: "store_report",
        filePath: path.resolve(path.join(__dirname, "../../", "templates", "store_report.ejs")),
        name: "store-report",
    });
    process.exit();
}
