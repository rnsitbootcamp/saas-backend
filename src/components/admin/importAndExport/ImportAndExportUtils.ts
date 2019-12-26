import * as _ from "lodash";
import Company from "../../../models/Company";
import Import from "../../../services/ImportAndExport/Import";
import MapperService from "../../../services/ImportAndExport/MapImports";

export default class ImportExportUtils {
    public static async mapImportedValues(importedData: Import, companyId) {
        const company: any = await Company.findById(companyId);
        let lists = importedData.parsedLists;
        if (_.isEmpty(lists)) {
            lists = company.list;
        }

        let groups = importedData.parsedGroups;
        if (_.isEmpty(groups)) {
            groups = company.question_groups;
        }

        const mapper = new MapperService(null, lists, groups);

        let questions = importedData.parsedQuestions;
        if (_.isEmpty(questions)) {
            questions = company.questions;
            mapper.questions = questions;
        } else {
            mapper.mapParsedQuestions(questions);
        }

        let brands = importedData.parsedBrands;
        if (_.isEmpty(brands)) {
            brands = company.brands.brands;
            mapper.brands = brands;
        } else {
            mapper.mapParsedBrands(brands);
        }

        let variants = importedData.parsedVariants;
        if (_.isEmpty(variants)) {
            variants = company.brands.variants;
            mapper.variants = variants;
        } else {
            mapper.mapParsedVariants(variants);
        }

        let brandVariants = importedData.parsedBrandVariants;
        if (_.isEmpty(brandVariants)) {
            brandVariants = company.brands.brand_variants;
            mapper.brandVariants = brandVariants;
        } else {
            mapper.mapParsedBrandVariants(brandVariants);
        }

        let packages = importedData.parsedPackages;
        if (_.isEmpty(packages)) {
            packages = company.packages.packages;
            mapper.packages = packages;
        } else {
            mapper.mapParsedPackages(packages);
        }

        let sizes = importedData.parsedSizes;
        if (_.isEmpty(sizes)) {
            sizes = company.packages.sizes;
            mapper.sizes = sizes;
        } else {
            mapper.mapParsedSizes(sizes);
        }

        let packageSizes = importedData.parsedPackageSize;
        if (_.isEmpty(packageSizes)) {
            packageSizes = company.packages.package_sizes;
            mapper.packageSizes = packageSizes;
        } else {
            mapper.mapParsedPackageSizes(packageSizes);
        }

        let skus = importedData.parsedSKUs;
        if (_.isEmpty(skus)) {
            skus = company.skus;
            mapper.skus = skus;
        } else {
            mapper.mapParsedSKUs(skus);
        }

        let pocTypes = importedData.parsedPocTypes;
        if (_.isEmpty(pocTypes)) {
            pocTypes = company.pocs.types;
            mapper.pocTypes = pocTypes;
        } else {
            mapper.mapParsedPocTypes(pocTypes);
        }

        let pocOwners = importedData.parsedPocOwners;
        if (_.isEmpty(pocOwners)) {
            pocOwners = company.pocs.owners;
            mapper.pocOwners = pocOwners;
        } else {
            mapper.mapParsedPocOwners(pocOwners);
        }

        let pocs = importedData.parsedPocs;
        if (_.isEmpty(pocs)) {
            pocs = company.pocs.pocs;
            mapper.pocs = pocs;
        } else {
            mapper.mapParsedPocs(pocs);
        }

        let kpis = importedData.parsedKPIs;
        if (_.isEmpty(kpis)) {
            kpis = company.kpis;
            mapper.kpis = kpis;
        } else {
            mapper.mapParsedKPIs(kpis);
        }
        await Company.findByIdAndUpdate(
            companyId,
            {
                $set: {
                    list: mapper.lists,
                    question_groups: mapper.groups,
                    questions: mapper.questions,
                    kpis: mapper.kpis,
                    brands: {
                        brands: mapper.brands,
                        variants: mapper.variants,
                        brand_variants: mapper.brandVariants
                    },
                    packages: {
                        packages: mapper.packages,
                        sizes: mapper.sizes,
                        package_sizes: mapper.packageSizes
                    },
                    pocs: {
                        pocs: mapper.pocs,
                        owners: mapper.pocOwners,
                        types: mapper.pocTypes
                    },
                    skus: mapper.skus
                }
            }
        );
    }
}
