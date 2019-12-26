export default class Utils {

    public static removeUndefined(body) {
        for (const x in body) {
            if (body[x] === undefined) {
                delete body[x];
            }
        }
    }
}
