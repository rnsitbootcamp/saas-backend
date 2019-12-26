import Event from "../models/Event";

class Tracking {

    public static log(event, req = null) {
        if (process.env.DB_TRACKING) {

            if (req) {
                if (req.user) {
                    event.user = req.user._id;
                }

                if (req.company) {
                    event.company = req.company._id;
                }
            }
            return Event.create(event);
        }
    }
}

export default Tracking;
