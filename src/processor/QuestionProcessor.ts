import * as _ from "lodash";

import logger from "../services/LoggerService";

const S = "[QuestionProcessor]";

export default class QuestionProcessor {
    public processKpi(kpi, surveyQuestions: any[]) {
        const M = `${S}[processKpi]`;
        const response = {
            weight: kpi.weight,
            title: kpi.title,
            id: kpi.id,
            sub_kpis: [],
            has_sub_kpis: false,
            points: {
                possible: kpi.weight,
                obtained: 0,
            },
            score: 0,
        };

        // Get the only questions from survey that are used in this kpi
        const kpiQuestionIds = kpi.questions.filter((x) => x.is_kpi).map((x) => x.id);
        logger.info(M, { kpi: kpi.title, kpiQuestionIds });
        surveyQuestions = surveyQuestions.filter((x) => _.indexOf(kpiQuestionIds, x.id) > -1);

        // First we will merge survey and kpi questions together
        const mappedQuestions = kpi.questions
            .map((kpiQuestion) => {
                const surveyQuestion = surveyQuestions.find((x) => x.id === kpiQuestion.id);
                if (!surveyQuestion || (surveyQuestion
                    && surveyQuestion.answer === undefined || surveyQuestion.answer === null)) {
                    return;
                }
                const answerScore = this.processSurveyAndKpiQuestion(surveyQuestion, kpiQuestion);
                return {
                    ...surveyQuestion,
                    is_kpi: kpiQuestion.is_kpi,
                    kpi_title: kpiQuestion.kpi_title,
                    points: {
                        possible: kpiQuestion.weight,
                        obtained: answerScore,
                    },
                };
            })
            .filter((x) => x);

        // Now the questions have been processed, process the kpi
        if (!kpi.has_sub_kpis) {
            mappedQuestions.forEach((x) => {
                response.points.obtained += x.points.obtained;
                const subKpi = {
                    question_title: x.title,
                    question_answer: x.answer,
                    type: x.type,
                    gps: x.gps,
                    weight: x.points.possible,
                    title: x.title,
                    id: x.id,
                    sub_kpis: [],
                    points: {
                        possible: x.points.possible,
                        obtained: x.points.obtained,
                    },
                    score: _.divide(x.points.obtained, x.points.possible),
                };
                response.sub_kpis.push(subKpi);
            });
        } else {
            response.sub_kpis = kpi.sub_kpis.map((k) => {
                let q: any = _.find(mappedQuestions, { id: k.question.id });
                if (!q) {
                    q = {
                        points: {
                            obtained: 0,
                        },
                    };
                }
                return {
                    question_title: q.title,
                    question_answer: q.answer,
                    type: q.type,
                    gps: q.gps,
                    weight: k.weight,
                    title: k.title,
                    id: k.id,
                    sub_kpis: [],
                    points: {
                        possible: k.weight,
                        obtained: q.points.obtained,
                    },
                    score: _.divide(q.points.obtained, k.weight),
                };
            });
            response.sub_kpis.forEach((x) => {
                response.points.obtained += x.points.obtained;
            });
            response.has_sub_kpis = true;
        }

        response.score = _.divide(response.points.obtained, response.points.possible);

        return response;
    }

    private processSurveyAndKpiQuestion(surveyQuestion, kpiQuestion) {
        const M = `${S}[processSurveyAndKpiQuestion]`;
        const { type, answer } = surveyQuestion;
        try {
            // Will contain the final answer.
            // In case of Boolean -> 0, 1;
            // In case of String/Numeric -> corresponding value
            // In case of SingleSelect -> The ID of the option
            // In case of MultiSelect -> The [ID] of the options
            let mappedAnswer;
            logger.debug(M, "Answer: ", answer, "type: ", type);
            switch (type) {
                case "boolean":
                    if (answer && (_.isNumber(answer.value) || _.isBoolean(answer.value))) {
                        mappedAnswer = answer.value ? 1 : 0;
                    } else if (answer && typeof (answer.title) === "string") {
                        mappedAnswer = answer.title.toLowerCase() === "no" ? 0 : 1;
                    } else if (typeof (answer) === 'boolean' && typeof (answer) === 'number') {
                        mappedAnswer = answer ? 1 : 0;
                    } else if (typeof (answer) === 'string') {
                        mappedAnswer = answer.toLowerCase() === "no" ? 0 : 1;
                    }
                    break;
                case "number":
                    mappedAnswer = Number(answer);
                case "numeric":
                    mappedAnswer = Number(answer);
                    break;
                default:
                    mappedAnswer = answer;
                    break;
            }

            logger.error(M, `MappedAnswer: ${mappedAnswer}; Type: ${type}`);

            // Now we have to find the first condition
            // that this answer meets to get the weight.
            logger.info(kpiQuestion);
            const score = this.getScoreBasedOnConditions(mappedAnswer, kpiQuestion.conditions);
            return score;
        } catch (error) {
            logger.error(M, error, surveyQuestion);
            return 0;
        }
    }

    private getScoreBasedOnConditions(answer, conditions) {
        let weight = 0;
        let found = false;
        const conditionMap = {
            "==": "===",
            "=": "===",
            ">": ">",
            "<": "<",
            ">=": ">=",
            "<=": "<=",
        };

        conditions = conditions || [];
        conditions.forEach((condition) => {
            if (found) {
                return;
            }
            if (_.isObject(answer) && _.isObject(condition.value)) {
                answer = `"${answer.title}"`;
                condition.value = `"${condition.value.title}"`;
            } else if (_.isObject(answer) && _.isObject(condition)) {
                answer = `"${answer.title}"`;
                condition.value = `"${condition.title}"`;
            } else if (_.isString(answer) && _.isObject(condition.value)) {
                condition.value = `"${condition.value.title}"`;
            } else if (_.isString(answer) && _.isObject(condition)) {
                condition.value = `"${condition.title}"`;
            } else if (_.isNumber(answer) && _.isObject(condition.value)) {
                condition.value = `"${condition.value.title}"`;
            } else if (_.isNumber(answer) && _.isObject(condition)) {
                condition.value = `"${condition.value}"` || `"${condition.title}"`;
            }
            const op = conditionMap[condition.key];
            const expression = `${answer} ${op} ${condition.value}`;
            logger.info(expression);
            // tslint:disable-next-line:no-eval
            if (eval(expression)) {
                found = true;
                weight = condition.weight;
            }
        });
        return weight;
    }
}
