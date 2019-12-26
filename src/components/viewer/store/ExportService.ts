const Json2csvParser = require('json2csv').Parser;
import * as _ from "lodash";

import OtherMailer from "../../../mailers/OtherMailer";
import ReportingService from "./ReportingService";

export default class ExportServices {
    private req;

    constructor(req: { body: any, companyConnection?: any }) {
        this.req = req;
    }

    public async fetchData() {
        this.req.body.per_page = 10000;
        const { data } = await ReportingService.getData(this.req);
        const params = this.req.body;
        const reportName = `Report_${params.region ||
            "noRegions"}_${params.sub_region || "noRegions"}_${params.time_range || params.date || "thisMonth"}.csv`;
        const finalReport = [];
        let reports;
        if (data && data.stores) {
            reports = data.stores;
        } else if (data && data.countries) {
            reports = data.countries;
        } else if (data && data.cities) {
            reports = data.cities;
        }
        if (!reports) {
            throw new Error("Export failed");
        }
        for (const report of reports) {
            const row: any = {};
            const kpis = report.data.sub_kpis;
            if (report.store) {
                row["Store Name"] = report.store.name;
                row.Country = report.store.region ? report.store.region.title : "";
                row.City = report.store.sub_region ? report.store.sub_region.title : "";
                row.Channel = report.store.channel ? report.store.channel.title : "";
                row["Sub channel"] = report.store.sub_channel ? report.store.sub_channel.title : "";
                row.address = report.store.address ? report.store.address.title : "";
            }
            if (report.addedBy) {
                const name = ((report.addedBy.first_name || "") + (report.addedBy.last_name || ""));
                row["Auditor Info"] = `${name} / ${report.addedBy.email}`;
            }

            for (const kpi of kpis) {
                row[`KPI - ${kpi.title} %`] = kpi.score[0];
            }
            row["Survey Added At"] = report.survey_added_at ? report.survey_added_at.toISOString() : "";
            finalReport.push(row);
        }
        if (_.isEmpty(finalReport)) {
            throw new Error("Report empty");
        }
        if (finalReport.length > 1000) {

            const json2csvParser = new Json2csvParser({});
            const mailer = new OtherMailer(this.req.user.email);
            await mailer.storeReport(
                {
                    filename: reportName,
                    content: json2csvParser.parse(finalReport),
                    contentType: 'text/csv'
                },
                this.req.user
            );
        } else {
            const json2csvParser = new Json2csvParser({});
            const reportCSV = json2csvParser.parse(finalReport);
            return reportCSV;
        }

    }
}
