import * as _ from "lodash";

export default class CompanyService {
    public errors = [];
    public normalizeDataOldData(data) {
        if (!data) { return {}; }
        const kpis: any = _.find(data, { key: "kpis" });
        const skus: any = _.find(data, { key: "skus" });
        const features: any = _.find(data, { key: "features" });
        const packages: any = _.find(data, { key: "packages" });
        const brands: any = _.find(data, { key: "brands" });
        const categories: any = _.find(data, { key: "categories" });
        const regions: any = _.find(data, { key: "regions" });
        const pocs: any = _.find(data, { key: "pocs" });
        const normalizedData = {
            kpis: (kpis || {}).data,
            skus: (skus || {}).data,
            features: (features || {}).data,
            packages: (packages || {}).data,
            brands: (brands || {}).data,
            categories: (categories || {}).data,
            regions: (regions || {}).data,
            pocs: (pocs || {}).data,
        };
        for (const key in normalizedData) {
            if (!normalizedData[key]) { delete normalizedData[key]; }
        }
        return normalizedData;
    }
    // tslint:disable-next-line:variable-name
    public validateData(data: { skus?: [], features?: [], kpis?: [] }, is_ra: boolean, is_re: boolean): boolean {
        // Validate following in data: skus, questions and kpis
        const skus: any = data.skus;
        const features: any = data.features;
        const kpis: any = data.kpis;

        // User can update data partially so that we dont lose anything.
        // this.validateItems([
        //   { path: 'KPIs', message: 'KPIs are required.', value: kpis },
        //   { path: 'SKUs', message: 'SKUs are required.', value: skus }
        // ]);

        // If validation fails here
        if (this.errors.length > 0) { return false; }

        if (!(is_re || is_ra)) {
            return this.errors.length === 0 ? true : false;
        }

        // We need company and competitor items for MPA+SOVI. So if we have to calculate
        // sovi or mpa kpi then they both should be present

        let companyItems = 0;
        let competitorItems = 0;
        const kpiQuestions = 0;

        // SKUS: We should have at least 1 mpa product to calculate kpis (mpa, sovi) based on skus
        // SKUS: We should have at least price of 1 kpi to calculate price kpi
        // SKUS
        const skuCounts = _.countBy(skus, "is_mpa");
        companyItems = skuCounts.true ? skuCounts.true : 0;
        competitorItems = skuCounts.false ? skuCounts.false : 0;

        const skuTitles = _.uniq(_.map(skus, (s: any) => s.title));
        if ((skuTitles && skus) && (skuTitles.length !== skus.length)) {
            this.errors.push({ path: "skus", message: "SKU titles must be unique" });
        }

        // QUESTIONS
        // const questionTypeCounts = _.countBy(questions.data, 'for_kpi');
        // kpiQuestions = questionTypeCounts['true'] ? questionTypeCounts['true'] : 0;
        // nonKpiQuestions = questionTypeCounts['false'] ? questionTypeCounts['false'] : 0;

        // const questionTitles = _.uniq(_.map(questions.data, (s: any) => s.title));
        // const id = _.uniq(_.map(questions.data, (s: any) => s.id));
        // if (questionTitles.length !== questions.data.length || id.length !== questions.data.length) {
        //   this.errors.push(`Question titles must be unique`);
        // }

        // FEATURES SHOULD HAVE OPTIONS if not required
        if (features && features.length > 0) {
            features.forEach((feature: any) => {
                if (!feature.required) { return; }
                if (feature.options.length === 0) {
                    this.errors.push({
                        path: "features",
                        message: `Feature ${feature.title} is required and does not have any option`,
                    });
                }
            });
        }

        // KPI Weights Validation
        if (kpis) {
            kpis.forEach((group: any) => {
                if (group.length === 0) {
                    this.errors.push({
                        path: "kpis",
                        message: `KPIs for channel ${group.title} are required.`,
                    });
                } else {
                    let groupWeight = 0;
                    group.kpis.forEach((kpi: any) => {
                        groupWeight += kpi.weight;
                        const subKpisWeight = _.sumBy(kpi.sub_kpis, (k: any) => k.weight);
                        if (kpi.weight - subKpisWeight < 0) {
                            this.errors.push({
                                path: "kpis",
                                message: `Weight of sub kpis of ${kpi.title} exceeds the assigned weight.`,
                            });
                        }
                    });
                    if (groupWeight > 100) {
                        this.errors.push(`The KPI weight for channel ${group.title} exceeds 100%.`);
                    }
                }
            });
        }

        return this.errors.length === 0 ? true : false;
    }

    public validateForUniqueTitleAndId(data: any, path: string): boolean {
        if (this.errors.length > 0) { return false; }
        const titles = _.uniq(_.map(data, (s: any) => s.title));
        const id = _.uniq(_.map(data, (s: any) => s.id));

        if (titles.length !== data.length || id.length !== data.length) {
            this.errors.push({ path, message: "Titles must be unique" });
        }
        return this.errors.length === 0 ? true : false;
    }

    private validateItems(items: any) {
        items.forEach((item: any) => {
            if (!item.value || !item.value.data || item.value.data.length === 0) {
                this.errors.push({ path: item.path, message: item.message });
            }
        });
    }

    private validateGroup(
        group: any,
        groupTitle: string,
        subGroupKey: string,
        subGroupTitle: string,
    ) {
        // Length validation
        if (group.data.length === 0) {
            this.errors.push(`${groupTitle}s are required.`);
        }
        // Uniqueness of titles validation
        const uniqueGroupTitles = _.uniq(_.map(group.data, (c: any) => c.title));
        if (uniqueGroupTitles.length !== group.data.length) {
            this.errors.push(`${groupTitle} titles must be unique`);
        }
        // Sub data validation
        _.forEach(group.data, (item: any) => {
            // Sub data length validation
            if (item[subGroupKey].length === 0) {
                this.errors.push(`${subGroupTitle}s are required for ${groupTitle} ${item.title}.`);
            }
            // Sub data title uniqueness validation
            const uniqueSubGroupTitles = _.uniq(_.map(item[subGroupKey], (c: any) => c.title));
            if (uniqueSubGroupTitles.length !== item[subGroupKey].length) {
                this.errors.push(`${subGroupTitle}s titles of ${groupTitle} ${item.title} must be unique`);
            }
        });
    }
}
