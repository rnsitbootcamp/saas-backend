
const S = "[ImportAndExportController]";

import * as queue from 'async/queue';
import * as Busboy from 'busboy';

import Company from "../../../models/Company";

import Export from "../../../services/ImportAndExport/Export";
import Import from "../../../services/ImportAndExport/Import";
import logger from '../../../services/LoggerService';
import ResponseService from '../../../services/ResponseService';

import ImportAndExportUtils from "./ImportAndExportUtils";

export default class ImportAndExportController {
    public static async Import(req, res) {
        try {
            const companyId = req.company._id;
            const userId = req.user._id;

            const dataImport = new Import();
            const q = queue(async (task) => {
                await dataImport.init(task.file);
            }, 1);
            q.drain = async () => {
                await ImportAndExportUtils.mapImportedValues(dataImport, companyId);
                logger.debug('all items have been processed');
                return res.status(200).json({});
            };

            const busboy = new Busboy({ headers: req.headers });
            busboy.on('file', async (fieldname, file, filename, encoding, mimetype) => {
                file.on('error', (error) => {
                    logger.error("Error in parsing file: ", error);
                });
                q.push({ file }, (err) => {
                    logger.info('File added to q');
                });
                logger.info("Filename is: ", filename);
            });
            busboy.on('finish', () => {
                logger.info("All file parsed.");
            });
            busboy.on('error', (error) => {
                logger.info("Error in parsing: ", error);
            });
            return req.pipe(busboy);
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }

    public static async Export(req, res) {
        try {
            const companyId = req.company._id;
            const userId = req.user._id;

            const dataImport = new Export();
            const company: any = await Company.findById(companyId);
            const data = await dataImport.init(company);
            res.setHeader('Content-disposition', 'attachment; filename=report.xlsx');
            res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.write(data);
            res.end();
        } catch (error) {
            return ResponseService.serverError(req, res, error);
        }
    }
}
