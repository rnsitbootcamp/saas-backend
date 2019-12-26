#!/usr/bin/env node
'use strict';

const ArgumentParser = require('argparse').ArgumentParser;
const parser = new ArgumentParser({
    version: '0.0.1',
    addHelp: true,
    description: 'Argparse example'
});
parser.addArgument(
    ['-c', '--cid'],
    {
        help: 'Company id',
        required: true
    }
);
parser.addArgument(
    ['-d', '--data'],
    {
        help: 'Default data folder',
        defaultValue: "mock-new",
        required: true
    }
);

const args = parser.parseArgs();

require('dotenv').load();

import * as _ from "lodash";

import Company from "../models/Company";

import MockData from "../services/CompanyDataGeneratorService";
import Db from "../services/Db";
import Defaults from "../services/DefaultDataService";
import logger from "../services/LoggerService";

import CreateStores from "./createStores";

const S = "[mockScripts/index]";

process.nextTick(async () => {
    try {
        const companyId = args.cid;
        const dataFolder = args.data;
        logger.info(`${companyId} : ${dataFolder}`);
        await Db.init();
        const companyConditions: any = [{ name: companyId }];
        if (typeof (companyId) === "string" && (companyId.length === 12 || companyId.length === 24)) {
            companyConditions.unshift({ _id: companyId });
        }
        const company: any = await Company.findOne({
            $or: companyConditions
        });
        // const dbUrl = `${process.env.MONGO_BASE_URL}${company.database.path}`;
        // const connection = createConnection(dbUrl);
        const Default = new Defaults();
        await Default.init(dataFolder);
        const m = new MockData(company, Default);
        const result: any = await m.init();
        await Company.findOneAndUpdate({
            $or: companyConditions
        }, result);
        const storeCreator = new CreateStores(
            company, Default, result.list,
            { _id: company.auditors[0] }, process.env.AUTH_BYPASS_SECRET

        );
        await storeCreator.init(result.questions);
        await storeCreator.createSurvey(result.questions, new Date());
        const pm = new Date();
        pm.setMonth(pm.getMonth() - 1);
        await storeCreator.createSurvey(result.questions, pm);
        process.exit();
    } catch (error) {
        logger.error(S, error);
        process.exit(1);
    }
});
