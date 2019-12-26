import * as _ from "lodash";

import logger from "../services/LoggerService";

const S = "[PocProcessor]";

export default class PocProcessor {
    private surveySkus: any[];
    private companySkus: any[];
    private kpi: any;
    private response: any;
    private survey: any;

    constructor(kpi: any, companySkus: any[], survey: any) {
        this.kpi = kpi;
        this.survey = survey;
        this.companySkus = companySkus;

        const surveySkus = [];
        survey.pocs.forEach((poc) => {
            poc.skus.forEach((sku) => {
                const companySku = _.find(companySkus, { id: sku.id });
                // order is important
                surveySkus.push({
                    ...companySku,
                    ...poc,
                    ...sku,
                    poc_id: poc.id,
                });
            });
        });

        this.surveySkus = surveySkus;

        this.response = {
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
    }

    public processKpi() {
        try {
            const M = `${S}[processKpi]`;
            let score = 0;
            const { sku_kpi, sub_kpis, category_sub_kpis, has_sub_kpis } = this.kpi;
            logger.info(M, `THE TYPE OF SKU: ${sku_kpi}`);

            // Kpis
            if (sku_kpi === "mpa") {
                score = this.getMpaScore();
            } else if (sku_kpi === "sovi") {
                score = this.getSoviScore();
            } else if (sku_kpi === "fresh") {
                score = this.getFreshScore();
            }

            this.addScoreToResponse(score);
            // Sub Kpis
            if (has_sub_kpis) {
                this.response.has_sub_kpis = has_sub_kpis;
                this.response.sub_kpis = this.processSubKpis(sub_kpis);
            }

            // Category sub kpis
            if (category_sub_kpis) {
                logger.info(M, `The ${sku_kpi} has category sub kpis`);
            }
        } catch (error) {
            logger.error(S, "process kpi", error);
        }
        return this.response;
    }

    // SHARED FUNCTIONS BETWEEN KPI FUNCTIONS
    private addScoreToResponse(score): void {
        const pointsObtained = _.multiply(this.response.points.possible, score);

        this.response.points.obtained = pointsObtained;
        this.response.score = score;
    }

    private processSubKpis(subKpis: any[]) {
        const { sku_kpi, sub_kpi_from } = this.kpi;
        return subKpis.map((subKpi) => {
            const mappedSubKpi = {
                weight: subKpi.weight,
                title: subKpi.title,
                id: subKpi.id,
                sub_kpis: [],
                points: {
                    possible: subKpi.weight,
                    obtained: 0,
                },
                score: 0,
            };

            let filteredSkus;

            // Sub kpis based on the poc
            if (sub_kpi_from.key.toLowerCase() === "poc") {
                // Get the poc ids (we need to filter survey skus by poc id)
                const pocIds = subKpi.values.map((x) => Number(x.poc_id));
                // And filter the survey skus by the mpaIds for the current poc ids
                filteredSkus = _.uniqBy(_.filter(this.surveySkus, (x) => pocIds.indexOf(x.poc_id) > -1), "id");
            }

            if (sku_kpi === "mpa") {
                mappedSubKpi.score = this.getMpaScore(filteredSkus);
            } else if (sku_kpi === "sovi") {
                mappedSubKpi.score = this.getSoviScore(filteredSkus);
            } else if (sku_kpi === "fresh") {
                mappedSubKpi.score = this.getFreshScore(filteredSkus);
            }

            mappedSubKpi.points.obtained = _.multiply(
                mappedSubKpi.points.possible,
                mappedSubKpi.score,
            );

            return mappedSubKpi;
        });
    }

    // SHARED FUNCTIONS BETWEEN KPI FUNCTIONS

    // MPA | STARTS
    private getMpaScore(surveySkus = null) {
        // Get the company mpa items
        const mpaSkus = this.companySkus.filter((x) => x.is_mpa);
        // Get their ids
        const mpaSkuIds = _.map(mpaSkus, (x) => x.id);
        // And filter the survey skus by the mpaIds
        surveySkus = _.uniqBy(_.filter(surveySkus || this.surveySkus, (x) => mpaSkuIds.indexOf(x.id) > -1), "id");

        if (surveySkus.length === 0 || mpaSkus.length === 0) {
            return 0;
        }

        return _.divide(surveySkus.length, mpaSkus.length);
    }
    // MPA | ENDS

    // Freshness | STARTS
    private getFreshScore(surveySkus = null) {
        const surveyDate = Number(this.survey.survey_added_at);
        surveySkus = surveySkus || this.surveySkus
            .map((x) => {
                x.expiry = Number(x.expiry);
                return x;
            })
            .filter((x) => !isNaN(x.expiry))
            .map((x) => {
                if (x.expiry >= surveyDate) {
                    x.expired = false;
                } else {
                    x.expired = true;
                }
                return x;
            });

        const expired = _.filter(surveySkus, (x) => x.expired).length || 0;
        const unExpired = _.filter(surveySkus, (x) => !x.expired).length || 0;

        if (unExpired === 0 || (unExpired + expired === 0)) {
            return 0;
        }

        return _.divide(unExpired, _.add(expired, unExpired));
    }
    // Freshness | ENDS

    // SOVI | STARTS
    private getSoviScore(skus = null) {
        const surveySkus = skus || this.surveySkus;

        const companySkus = surveySkus.filter((x) => !x.is_competitor);
        const competitorSkus = surveySkus.filter((x) => x.is_competitor);

        const companyFronts = _.sum(_.map(companySkus, (x: any) => Number(x.fronts) || 0));
        const competitorFronts = _.sum(_.map(competitorSkus, (x: any) => Number(x.fronts) || 0));

        if (companyFronts === 0 || (companyFronts + competitorFronts === 0)) {
            return 0;
        }

        return _.divide(companyFronts, _.add(companyFronts, competitorFronts));
    }
    // SOVI | ENDS
}
