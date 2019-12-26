import * as _ from "lodash";
import { createConnection } from "mongoose";
import * as Console from "signale";

import Company from "../models/Company";
import ProcessedSurvey from "../models/ProcessedSurveys";
import Store from "../models/Store";
import Survey from "../models/Survey";

import FileMapper from "./FileMapper";
import PocProcessor from "./PocProcessor";
import PopulateAggregateQueries from "./PopulateAggregateQueries";
import QuestionProcessor from "./QuestionProcessor";
import StoreMapReducer from "./StoreMapReducer";

import logger from "../services/LoggerService";

const S = `[processor/index]`;

export default class SurveyProcessor {
    private connection;
    private company;
    private data;

    public constructor(data: { store_id: string; company_id: string; survey_id: string }) {
        this.data = data;
    }

    /**
     *  Processes the survey based on the input data.
     *
     * @param data The survey data
     */
    public async init() {
        await this.setUpConnection();
        // Transform the ids to the store, survey and the company kpis
        const { survey, kpis, skus } = await this.getDataFromDB();

        // If company does not have any kpis, return
        if (!kpis || kpis.length === 0) {
            throw new Error("No kpis found");
        }

        Console.info(
            `Starting to process survey ${this.data.survey_id} for company ${
            this.data.company_id
            } and store ${this.data.store_id}`,
        );

        // Process the survey
        const processedSurvey = this.process(survey, kpis, skus);
        processedSurvey.survey_added_at = survey.survey_added_at;
        processedSurvey.gps = survey.gps;
        const files = await (new FileMapper()).init(survey);

        const finder = {
            store_id: this.data.store_id,
            survey_id: this.data.survey_id,
        };

        // Check if the survey has been processed
        const exists = await ProcessedSurvey(this.connection).findOne(finder);

        // Final data to insert/update
        const data = {
            ...processedSurvey,
            files,
        };

        // If survey has already been processed, we will update it.
        if (exists) {
            await ProcessedSurvey(this.connection).findOneAndUpdate(finder, { $set: { ...data } });
        } else {
            await ProcessedSurvey(this.connection).create(data);
        }
        // MapReduce the data
        const storeMap = await new StoreMapReducer(this.connection);
        await storeMap.init(processedSurvey);
        storeMap.process();
        await storeMap.save();
        PopulateAggregateQueries.addToPending(this.company._id, processedSurvey.survey_added_at);
        return true;
    }

    private async setUpConnection() {
        const M = `${S}[setUpConnection]`;
        const company: any = await Company.findById(this.data.company_id).lean();
        const dbUrl = `${process.env.MONGO_BASE_URL}${company.database.path}`;
        let companyConnection = global.CONNECTION_CACHE.get(dbUrl);
        if (!companyConnection) {
            logger.debug(M, `companyConnection not found in Cache. creating new one`, dbUrl);
            companyConnection = createConnection(dbUrl);
            global.CONNECTION_CACHE.set(dbUrl, companyConnection);
        }
        this.connection = companyConnection;
        this.company = company;
    }

    /**
     * Transforms the input data to the store, survey and the kpis of that company
     *
     * @param data
     * @return { store: {}, survey: {}, kpis: []}
     */
    private async getDataFromDB() {
        const M = `${S}[getDataFromDB]`;
        try {
            const { store_id, survey_id } = this.data;
            // Get store and survey from the company connection
            const store = await Store(this.connection)
                .findById(store_id)
                .lean();
            const survey = await Survey(this.connection)
                .findById(survey_id)
                .lean();
            // Company kpis
            const kpiIndex = _.findIndex(this.company.data, { key: "kpis" });
            const kpis = this.company.kpis ? this.company.kpis : this.company.data[kpiIndex].data;

            // Company skus
            const skuIndex = _.findIndex(this.company.data, { key: "skus" });
            const skus = this.company.skus ? this.company.skus : this.company.data[skuIndex].data;

            if (!kpis) {
                logger.error(M, '\nkpis: ', JSON.stringify(kpis));
                return { store, survey, kpis: [], skus };
            }

            const storeKpis = kpis.find((x) => {
                return store.channel && store.channel.title === x.title;
            });

            if (!storeKpis) {
                logger.error(M, `store channel:`, store.channel, '\nkpis: ', JSON.stringify(kpis));
                throw new Error("StoreKpis not found");
            }
            return { store, survey, kpis: storeKpis.kpis, skus };
        } catch (error) {
            logger.error(M, "try/catch: ", error);
            return {};
        }
    }

    /**
     * Processes the survey by implementing the kpi definition
     *
     * @param survey Survey to process
     * @param kpis KPI definition
     */
    private process(survey: any, kpis: any[], skus: any[]) {
        // Process the kpis and filter the nulls
        kpis = kpis
            .map((kpi) => {
                if (kpi.from === "questions") {
                    const qProcessor = new QuestionProcessor();
                    return qProcessor.processKpi(kpi, survey.questions);
                } else {
                    const pocProcessor = new PocProcessor(kpi, skus, survey);
                    return pocProcessor.processKpi();
                }
            })
            .filter((x) => x);

        const data = {
            title: "Total",
            weight: kpis.reduce((acc, next) => (acc += next.points.possible), 0),
            points: {
                possible: kpis.reduce((acc, next) => (acc += next.points.possible), 0),
                obtained: kpis.reduce((acc, next) => (acc += next.points.obtained), 0),
            },
            sub_kpis: kpis,
            score: 0,
        };
        data.score = _.divide(data.points.obtained, data.points.possible);

        return {
            survey_id: this.data.survey_id,
            store_id: this.data.store_id,
            addedBy: survey.addedBy,
            survey_added_at: survey.survey_added_at || new Date(),
            gps: survey.gps,
            date: survey.date,
            data,
        };
    }
}

PopulateAggregateQueries.listenForPendingPopulate();
