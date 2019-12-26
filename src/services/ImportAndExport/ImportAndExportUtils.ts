export default class ImportUtils {
    public static toSlug(str: string) {
        if (str && typeof str === "string") {
            str = str.toLowerCase();
            str = str.trim();
            str = str.replace(/\s+/gim, "_");
        }
        return str;
    }

    public static toBoolean(value) {
        if (value &&
            (value === 1 || value === "1" || (/(yes|true)/i).test(value))) {
            return true;
        } else {
            return false;
        }
    }
    public static isSame(lhs: string, rhs: string) {
        lhs = ImportUtils.toSlug(lhs);
        rhs = ImportUtils.toSlug(rhs);
        return lhs === rhs;
    }

    public static isMatching(source: string, match: string) {
        const exp = new RegExp(match, "gi");
        return exp.test(source);
    }

}
