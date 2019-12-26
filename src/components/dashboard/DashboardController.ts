import { Request, Response } from "express";
import logger from "../../services/LoggerService";
import ResponseService from "../../services/ResponseService";
import DashboardService from "./DashboardService";

const S = "[DashboardController]";

export default class DashboardController {

    public static async getMetrics(req: Request, res: Response) {
        const M = `${S}[getMetrics][${req.request_id || ""}]`;
        try {
            logger.debug(M, 'Getting aggregate data');
            const data = await DashboardService.getData(req);
            return res.status(200).json({
                status: "success",
                ...data,
            });
        } catch (error) {
            if (error && error.name === "CastError") {
                logger.error(M, error.message);
            } else {
                logger.error(M, error);
            }
            return ResponseService.serverError(req, res, new Error('Metrics error'), "Server error");
        }
    }

}
