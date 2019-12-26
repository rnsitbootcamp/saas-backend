import * as _ from "lodash";
import * as XlsxStreamReader from "xlsx-stream-reader";

import ImportUtils from "./ImportAndExportUtils";

import logger from "../LoggerService";

export default class Import {
    public workBookReader;
    public groupsKeyIndex: any = {};
    public questionsKeyIndex: any = {};
    public questionsKeys = [
        "id", "title", "used_for", "group",
        "type", "description", "mapped_to", "source",
        "default_value", "is_image_required", "is_audio_required",
        "is_required"
    ];
    public skusKeyIndex = {};
    public skusKeys = [
        "id", "title", "price", "is_competitor", "is_mpa",
        "is_active", "package_size_id", "brand_variant_id"
    ];

    public kpisKeyIndex: any = {};
    public kpisKeys = [
        "id", "title", "question", "condition", "weight", "sub_kpi",
        "channel", "from", "kpi_type", "sub_kpis_from", "poc_values"
    ];

    public packageKeyIndex: any = {};
    public packageKeys = ["id", "title", "description"];

    public sizeKeyIndex: any = {};
    public sizeKeys = ["id", "title", "description"];

    public packageSizeKeyIndex: any = {};
    public packageSizeKeys = ["id", "package_id", "size_id"];

    public brandsKeyIndex: any = {};
    public brandsKeys = ["id", "title", "description"];

    public variantsKeyIndex: any = {};
    public variantsKeys = ["id", "title", "description"];

    public brandVariantsKeyIndex: any = {};
    public brandVariantsKeys = ["id", "brand_id", "variant_id"];

    public pocOwnersKeyIndex: any = {};
    public pocOwnerKeys = ["id", "title", "description"];

    public pocTypesKeyIndex: any = {};
    public pocTypeKeys = ["id", "title", "description"];

    public pocsKeyIndex: any = {};
    public pocsKeys = ["id", "title", "poc_type_id", "poc_owner_id"];

    public parsedLists = [];
    public parsedGroups = [];

    public parsedQuestions = [];

    public parsedKPIs = [];
    public parsedSKUs = [];
    public parsedPackages = [];
    public parsedSizes = [];
    public parsedPackageSize = [];
    public parsedBrands = [];
    public parsedVariants = [];
    public parsedBrandVariants = [];

    public parsedPocOwners = [];
    public parsedPocTypes = [];
    public parsedPocs = [];

    public init(inputStream: NodeJS.ReadableStream) {
        this.workBookReader = new XlsxStreamReader();
        this.workBookReader.on('error', (error) => {
            readError = error;
        });
        let readError;
        return new Promise((resolve, reject) => {

            this.workBookReader.on('sharedStrings', () => {
                // do not need to do anything with these,
                // cached and used when processing worksheets
                // logger.debug(this.workBookReader.workBookSharedStrings);
            });

            this.workBookReader.on('styles', () => {
                // do not need to do anything with these
                // but not currently handled in any other way
                // logger.debug(this.workBookReader.workBookStyles);
            });

            this.workBookReader.on('worksheet', (workSheetReader) => {
                const sheetName = workSheetReader.name.toLowerCase().replace(/\s/, "_");
                // print worksheet name
                workSheetReader.on('row', (row) => {
                    try {
                        const rowIndex = Number(row.attributes.r);
                        const rowValue = this.trimList(row.values.slice(1));
                        if (sheetName === "lists") {
                            this.parseList(rowValue);
                        } else if (sheetName === "groups") {
                            this.parseGroups(rowValue);
                        } else if (sheetName === "questions") {
                            this.parseQuestions(rowValue);
                        } else if (sheetName === "kpis") {
                            this.parseKPIs(rowValue);
                        } else if (sheetName === "skus") {
                            this.parseSKU(rowValue);
                        } else if (sheetName === "packages") {
                            this.parsePackage(rowValue);
                        } else if (sheetName === "sizes") {
                            this.parseSize(rowValue);
                        } else if (sheetName === "package_sizes") {
                            this.parsePackageSize(rowValue);
                        } else if (sheetName === "brands") {
                            this.parseBrand(rowValue);
                        } else if (sheetName === "variants") {
                            this.parseVariant(rowValue);
                        } else if (sheetName === "brand_variants") {
                            this.parseBrandVariant(rowValue);
                        } else if (sheetName === "poc_types") {
                            this.parsePocTypes(rowValue);
                        } else if (sheetName === "poc_owners") {
                            this.parsePocOwners(rowValue);
                        } else if (sheetName === "pocs") {
                            this.parsePocs(rowValue);
                        }

                    } catch (exception) {
                        logger.error(exception, row.values);
                    }
                });

                workSheetReader.on('end', () => {
                    logger.info(workSheetReader.rowCount);
                });
                workSheetReader.on('error', () => {
                    logger.info(workSheetReader.rowCount);
                });

                // call process after registering handlers
                workSheetReader.process();
            });
            this.workBookReader.on('end', async () => {
                // end of workbook reached
                if (readError) {
                    return reject(readError);
                }
                return resolve();
            });
            inputStream.pipe(this.workBookReader);
        });

    }

    public trimList(list, left = false) {
        const newList = [];
        const emptyArray = [];
        let notEmptyFound = !left;
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < list.length; i++) {
            let empty;
            if (list[i] === undefined || list[i] === null) {
                empty = true;
            }

            if (typeof (list[i]) === 'string' && list[i].trim() === "") {
                empty = true;
            }

            if (typeof (list[i]) === 'number' && !isFinite(list[i])) {
                empty = true;
            }

            if (empty && notEmptyFound) {
                emptyArray.push(list[i]);
            }
            if (empty) {
                continue;
            }

            notEmptyFound = true;
            while (emptyArray.length > 0) {
                newList.push(emptyArray.shift());
            }
            newList.push(list[i]);
        }
        return newList;
    }

    public parseList(rowValue) {
        if (ImportUtils.isSame(rowValue[0], "title")) {
            for (let i = 1; i < rowValue.length; i++) {
                this.addList(rowValue[i], i);
            }
        } else if (ImportUtils.isSame(rowValue[0], "description")) {
            for (let i = 1; i < rowValue.length; i++) {
                this.updateList({
                    description: rowValue[i]
                }, i);
            }
        } else if (ImportUtils.isSame(rowValue[0], "is fixed")) {
            for (let i = 1; i < rowValue.length; i++) {
                this.updateList({
                    isFixed: ImportUtils.toBoolean(rowValue[i])
                }, i);
            }
        } else if (ImportUtils.isSame(rowValue[0], "is default")) {
            for (let i = 1; i < rowValue.length; i++) {
                this.updateList({
                    isDefault: ImportUtils.toBoolean(rowValue[i])
                }, i);
            }
        } else if (ImportUtils.isSame(rowValue[0], "id")) {
            for (let i = 1; i < rowValue.length; i++) {
                this.updateList({
                    id: Number(rowValue[i])
                }, i);
            }
        } else if (rowValue[0] && (/\d+/i).test(String(rowValue[0]))) {
            for (let i = 1; i < rowValue.length; i++) {
                this.updateListItem({
                    id: Number(rowValue[0]),
                    title: rowValue[i],
                    customFields: [],
                    isFixed: false
                }, i);
            }
        }
    }

    public addList(title, index: number) {
        if (!title) {
            return;
        }
        this.parsedLists.push({
            index,
            title,
            items: [],
            description: "",
            isFixed: false,
            isDefault: false
        });
    }

    public updateList(params, index) {
        const list = _.find(this.parsedLists, (x) => x.index === index);
        if (!list) {
            return;
        }
        for (const key in params) {
            if (key && !(params[key] === undefined || params[key] === "")) {
                list[key] = params[key];
            }
        }
    }
    public updateListItem(
        item: {
            title: string, id: number,
            customFields: any[], isFixed: boolean
        },
        index: number) {

        if (!item.title) {
            return;
        }
        const list = _.find(this.parsedLists, (x) => x.index === index);
        list.items.push(item);
    }

    public parseGroups(rowValue) {
        const group: any = {};
        for (let i = 0; i < rowValue.length; i++) {
            if (ImportUtils.isSame(rowValue[i], "id")) {
                this.groupsKeyIndex[i] = "id";
            } else if (ImportUtils.isSame(rowValue[i], "title")) {
                this.groupsKeyIndex[i] = "title";
            } else if (ImportUtils.isSame(rowValue[i], "description")) {
                this.groupsKeyIndex[i] = "description";
            } else if (rowValue[i]) {
                group[this.groupsKeyIndex[`${i}`]] = rowValue[i];
            }
        }
        if (!_.isEmpty(group)) {
            group.id = Number(group.id);
            this.parsedGroups.push(group);
        }
    }

    public parseQuestions(rowValue) {
        const question: any = {};
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.questionsKeys.includes(slugValue)) {
                this.questionsKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                question[this.questionsKeyIndex[`${i}`]] = rowValue[i];
            }
        }
        if (!_.isEmpty(question)) {
            question.id = Number(question.id);
            this.parsedQuestions.push(question);
        }
    }

    public parseKPIs(rowValue) {
        const kpi: any = {};
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.kpisKeys.includes(slugValue)) {
                this.kpisKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                kpi[this.kpisKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (_.isEmpty(kpi)) {
            return;
        }
        if (kpi.id && kpi.title) {
            kpi.id = Number(kpi.id);
            if (ImportUtils.isMatching(kpi.from, "question")) {
                kpi.questions = [{
                    question: kpi.question,
                    scores: [],
                    sub_kpi: kpi.sub_kpi
                }];
                if (kpi.condition) {
                    kpi.questions[0].scores.push({
                        condition: kpi.condition,
                        weight: kpi.weight
                    });
                }
            } else if (ImportUtils.isMatching(kpi.from, "sku")) {
                kpi.sub_kpis = [{
                    sub_kpi: kpi.sub_kpi,
                    weight: kpi.weight,
                    poc_values: kpi.poc_values
                }];
            }
            this.parsedKPIs.push(kpi);
        } else if (kpi.question && !_.isEmpty(this.parsedKPIs)) {
            const pendingKPI = this.parsedKPIs[this.parsedKPIs.length - 1];
            const question = {
                question: kpi.question,
                scores: [],
                sub_kpi: kpi.sub_kpi
            };
            if (kpi.condition) {
                question.scores.push({
                    condition: kpi.condition,
                    weight: kpi.weight
                });
            }
            pendingKPI.questions.push(question);
        } else if (kpi.condition && !_.isEmpty(this.parsedKPIs)) {
            const pendingKPI = this.parsedKPIs[this.parsedKPIs.length - 1];
            const pendingKPIQuestion = pendingKPI.questions[pendingKPI.questions.length - 1];
            if (kpi.condition) {
                pendingKPIQuestion.scores.push({
                    condition: kpi.condition,
                    weight: kpi.weight
                });
            }
        } else if (kpi.sub_kpi && !_.isEmpty(this.parsedKPIs)) {
            const pendingKPI = this.parsedKPIs[this.parsedKPIs.length - 1];
            if (pendingKPI) {
                pendingKPI.sub_kpis.push({
                    sub_kpi: kpi.sub_kpi,
                    poc_values: kpi.poc_values
                });
            }

        }
        delete kpi.question;
        delete kpi.weight;
        delete kpi.condition;
    }

    public parseSKU(rowValue) {
        const sku: any = {};
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.skusKeys.includes(slugValue)) {
                this.skusKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                sku[this.skusKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(sku)) {
            sku.id = Number(sku.id);
            this.parsedSKUs.push(sku);
        }
    }

    public parsePackage(rowValue) {
        const skuPackage: any = {};
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.packageKeys.includes(slugValue)) {
                this.packageKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                skuPackage[this.packageKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(skuPackage)) {
            skuPackage.id = Number(skuPackage.id);
            this.parsedPackages.push(skuPackage);
        }
    }

    public parseSize(rowValue) {
        const size: any = {};
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.sizeKeys.includes(slugValue)) {
                this.sizeKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                size[this.sizeKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(size)) {
            size.id = Number(size.id);
            this.parsedSizes.push(size);
        }
    }

    public parsePackageSize(rowValue) {
        const pkgSize: any = {};
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.packageSizeKeys.includes(slugValue)) {
                this.packageSizeKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                pkgSize[this.packageSizeKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(pkgSize)) {
            pkgSize.id = Number(pkgSize.id);
            this.parsedPackageSize.push(pkgSize);
        }
    }

    public parseBrand(rowValue) {
        const brand: any = {};
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.brandsKeys.includes(slugValue)) {
                this.brandsKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                brand[this.brandsKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(brand)) {
            brand.id = Number(brand.id);
            this.parsedBrands.push(brand);
        }
    }

    public parseVariant(rowValue) {
        const variant: any = {};
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.variantsKeys.includes(slugValue)) {
                this.variantsKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                variant[this.variantsKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(variant)) {
            variant.id = Number(variant.id);
            this.parsedVariants.push(variant);
        }
    }

    public parseBrandVariant(rowValue) {
        const brandVariant: any = {};
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.brandVariantsKeys.includes(slugValue)) {
                this.brandVariantsKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                brandVariant[this.brandVariantsKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(brandVariant)) {
            brandVariant.id = Number(brandVariant.id);
            this.parsedBrandVariants.push(brandVariant);
        }
    }

    public parsePocOwners(rowValue) {
        const pocOwner: any = {};
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.pocOwnerKeys.includes(slugValue)) {
                this.pocOwnersKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                pocOwner[this.pocOwnersKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(pocOwner)) {
            pocOwner.id = Number(pocOwner.id);
            this.parsedPocOwners.push(pocOwner);
        }
    }

    public parsePocTypes(rowValue) {
        const pocType: any = {};
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.pocTypeKeys.includes(slugValue)) {
                this.pocTypesKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                pocType[this.pocTypesKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(pocType)) {
            pocType.id = Number(pocType.id);
            this.parsedPocTypes.push(pocType);
        }
    }

    public parsePocs(rowValue) {
        const poc: any = {};
        for (let i = 0; i < rowValue.length; i++) {
            const slugValue = ImportUtils.toSlug(rowValue[i]);
            if (this.pocsKeys.includes(slugValue)) {
                this.pocsKeyIndex[i] = slugValue;
            } else if (rowValue[i]) {
                poc[this.pocsKeyIndex[`${i}`]] = rowValue[i];
            }
        }

        if (!_.isEmpty(poc)) {
            poc.id = Number(poc.id);
            this.parsedPocs.push(poc);
        }
    }
}
