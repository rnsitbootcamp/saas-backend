declare namespace Express {
    export interface Request {
        user?: any;
        company?: any;
        companyConnection?: any;
        request_id?: string;
        logout();
    }
}
