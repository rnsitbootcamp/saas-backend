require('dotenv').config();
import { createConnection } from "mongoose";

import surveyService from "../components/admin/survey/SurveyService";

import Company from "../models/Company";
import Store from "../models/Store";
import Survey from "../models/Survey";

import Db from "../services/Db";
import logger from "../services/LoggerService";

async function main(companyId) {
    await Db.init();
    const company: any = await Company.findById(companyId).lean();
    const dbUrl = `${process.env.MONGO_BASE_URL}${company.database.path}`;
    const companyConnection = createConnection(dbUrl);
    const surveys = await Survey(companyConnection).find({ company_id: companyId });

    for (const x of surveys) {
        const store = await Store(companyConnection).findOne({ _id: x.store_id });
        if (!store) {
            // await Survey(companyConnection).findByIdAndRemove(x._id);
            continue;
        }
        await Survey(companyConnection).findByIdAndUpdate(x._id, {
            $set: {
                gps: store.gps
            }
        });
        await surveyService.pushToQueueForProcessing(x);
    }
    logger.info("all done");
}

main("5c42b781a54eca4ce8007023");
