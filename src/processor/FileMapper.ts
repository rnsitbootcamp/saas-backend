import * as bluebird from "bluebird";
import * as _ from "lodash";
import * as Console from "signale";

import Company from "../models/Company";
import File from "../models/File";

import logger from "../services/LoggerService";

const S = "[FileMapper]";

export default class FileMapper {
    private company;

    public async init(survey: any) {
        Console.info(`Mapping survey files`);
        this.company = await Company.findOne({
            _id: survey.company_id,
        });
        const questions = await this.mapQuestions(survey.questions);
        let audios = await this.getAudiosFromQuestions(survey.questions);
        const surveyAudios = await this.getAudios(survey.audios) || [];
        audios = [...audios, ...surveyAudios];
        return {
            audios,
            images: await this.getImages(survey.questions),
            files: await this.getFiles(questions),
        };
    }

    private async mapQuestions(questions) {
        const companyQuestionsIndex = _.findIndex(this.company.data, { key: "questions" });
        // tslint:disable-next-line:max-line-length
        const companyQuestions = this.company.questions ? this.company.questions : companyQuestionsIndex > -1 ? this.company.data[companyQuestionsIndex].data : [];

        questions = questions.filter((question) => {
            const companyQuestionIndex = _.findIndex(companyQuestions, { id: question.id });
            const companyQuestion = companyQuestionIndex > -1 ? companyQuestions[companyQuestionIndex] : {};
            // tslint:disable-next-line:max-line-length
            const condition = (companyQuestion.type.key === "file") && companyQuestion.type.validations && companyQuestion.type.validations.length > 0;
            if (condition) {
                question.validations = companyQuestion.type.validations;
            }
            return condition;
        });
        // question.validations[*].key === 'filetype' (image/others)
        // question.validations[*].key === 'multiple_file' (yes/no)
        questions = questions.map((question) => {
            question.validations.forEach((validation) => {
                if (validation.key === "filetype") {
                    question.filetype = validation.answer.filter((x) => x.value)[0].title;
                }

                if (validation.key === "multiple_file") {
                    question.multiple_file = validation.answer.filter((x) => {
                        return x.value;
                    })[0].title.toLowerCase() === "yes" ? true : false;
                }
            });

            return question;
        });

        return questions;
    }

    private async getAudios(audios) {
        const M = `${S}[getAudios]`;
        if (!audios) {
            return [];
        }
        try {
            const result = await bluebird.map(audios, async (audio) => {
                const conditions: any = [{ name: audio && audio.name ? audio.name : audio }];
                if (typeof (audio) === "string" && (audio.length === 12 || audio.length === 24)) {
                    conditions.unshift({ _id: audio });
                } else if (audio && audio.id) {
                    conditions.unshift({ _id: audio.id });
                }
                const file = await File.findOne({
                    $or: conditions,
                });
                if (file) { return file._id; }
                return null;
            });
            _.remove(result, (x) => !x);
            return _.uniqBy(result, (x) => x.toString());
        } catch (error) {
            logger.error(M, "Error in getting audios: ", error);
            return [];
        }
    }

    private async getImages(questions) {
        const M = `${S}[getImages]`;
        try {
            let images = [];
            // questions = questions.filter((x) => x.filetype === "image");
            for (const question of questions) {
                let questionAnswer = [];
                if (question.filetype === "image") {
                    questionAnswer = question.answer || [];
                }
                const questionImages = question.images || question.image || [];
                images = [...images, ...questionAnswer, ...questionImages];
            }
            const result = await bluebird.map(images, async (image) => {
                if (!image) { return null; }
                const conditions: any = [{ name: image }, { key: image }];
                if (typeof (image) === "string" && (image.length === 12 || image.length === 24)) {
                    conditions.unshift({ _id: image });
                } else if (typeof (image) === "object") {
                    conditions.unshift({ _id: image });
                }
                const file = await File.findOne({
                    $or: conditions,
                });
                if (file) { return file._id; }
                return null;
            });
            _.remove(result, (x) => !x);
            return _.uniqBy(result, (x) => x.toString());
        } catch (error) {
            logger.error(M, "Error in getting images: ", error);
            return [];
        }
    }

    private async getAudiosFromQuestions(questions) {
        const M = `${S}[getAudiosFromQuestions]`;
        try {
            let audios = [];
            for (const question of questions) {
                audios = [...audios, ...(question.audios || []), ...(question.audio || [])];
            }
            const result = await bluebird.map(audios, async (audio) => {
                if (!audio) { return null; }
                const conditions: any = [{ name: audio }, { key: audio }];
                if (typeof (audio) === "string" && (audio.length === 12 || audio.length === 24)) {
                    conditions.unshift({ _id: audio });
                } else if (typeof (audio) === "object") {
                    conditions.unshift({ _id: audio });
                }
                const file = await File.findOne({
                    $or: conditions,
                });
                if (file) { return file._id; }
                return null;
            });
            _.remove(result, (x) => !x);
            return result;
        } catch (error) {
            logger.error(M, "Error in getting audio: ", error);
            return [];
        }
    }

    private async getFiles(questions) {
        const M = `${S}[getFiles]`;
        try {
            let files = [];
            questions = questions.filter((x) => x.filetype === "others");
            for (const question of questions) {
                files = [...files, ...question.answer];
            }
            const result = await bluebird.map(files, async (file) => {
                if (!file) { return null; }
                const conditions: any = [{ name: file }, { key: file }];
                if (typeof (file) === "string" && (file.length === 12 || file.length === 24)) {
                    conditions.unshift({ _id: file });
                }
                const fileResult = await File.findOne({
                    $or: conditions,
                });
                if (fileResult) { return fileResult._id; }
                return null;
            });
            _.remove(result, (x) => !x);
            return _.uniqBy(result, (x) => x.toString());
        } catch (error) {
            logger.error(M, "Error in getting files: ", error);
            return [];
        }
    }
}
