const path = require("path");
const fs = require("fs");

import logger from "./LoggerService";

const S = "[mockScripts/Default]";

const dataFolder = path.resolve(__dirname, "../", "../", "other", "data");
export default class Default {

    public places = {};

    public channels = {};

    public questionGroups: any = [];
    public Questionnaires: any = [];

    public async init(folder) {
        if (!folder) {
            return;
        }
        this.places = await this.readJSON(path.join(dataFolder, folder, "places.json"));

        this.channels = await this.readJSON(path.join(dataFolder, folder, "channels.json"));

        this.questionGroups = await this.readJSON(path.join(dataFolder, folder, "question_groups.json"));

        this.Questionnaires = await this.readJSON(path.join(dataFolder, folder, "Questionnaires.json"));
    }

    public async readJSON(jsonPath: string) {
        const M = `${S}[readJSON]`;
        try {
            return await new Promise((resolve) => {
                fs.readFile(jsonPath, (error, data) => {
                    if (error) {
                        logger.error(M, error);
                        return resolve(null);
                    }
                    return resolve(JSON.parse(data));
                });
            });
        } catch (error) {
            logger.error(M, error);
            return null;
        }
    }
}
