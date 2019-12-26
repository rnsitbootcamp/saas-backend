import * as mongoose from "mongoose";

const company = new mongoose.Schema(
    {
        name: { type: String, unique: true },
        name_slug: { type: String, unique: true },
        type: { type: String },
        admins: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
        auditors: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
        viewers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
        questions: Array,
        question_groups: Array,
        mapped_to: Array,
        list: Array,
        kpis: Array,
        skus: Array,
        features: Array,
        packages: {
            packages: [{
                id: Number,
                title: String,
                desc: String
            }],
            sizes: [{
                id: Number,
                title: String,
                desc: String,
            }],
            package_sizes: [{
                id: Number,
                package_id: Number,
                package_title: String,
                size_id: Number,
                size_title: String,
            }]
        },
        brands: {
            brands: [{
                id: Number,
                title: String,
                desc: String
            }],
            variants: [{
                id: String,
                title: String,
                desc: String
            }],
            brand_variants: [{
                brand_variant_id: String,
                brand_id: String,
                brand_title: String,
                variant_id: String,
                variant_title: String
            }]
        },
        categories: Array,
        regions: Array,
        pocs: {
            owners: [{
                title: String,
                id: Number,
                desc: String,
            }],
            types: [{
                title: String,
                id: Number,
                desc: String,
            }],
            pocs: [{
                owner_id: Number,
                owner_title: String,
                type_id: Number,
                type_title: String,
                poc_id: Number,
                poc_title: String,
            }]
        },
        data_versions: Array,
        deleted: { type: Boolean, default: false },
        database: {
            path: { type: String, unique: true },
            options: Object,
        },
        logo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "File",
        },
        is_ra: {
            type: Boolean,
        },
        is_re: {
            type: Boolean,
        },
        is_ice: {
            type: Boolean,
        },
    }, {
        timestamps: true,
    }
);

function convertToSlug(str) {
    str = str.replace(/^\s+|\s+$/g, ""); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    const from = "åàáãäâèéëêìíïîòóöôùúüûñç·/_,:;";
    const to = "aaaaaaeeeeiiiioooouuuunc------";

    for (let i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
    }

    str = str
        .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
        .replace(/\s+/g, "-") // collapse whitespace and replace by -
        .replace(/-+/g, "-") // collapse dashes
        .replace(/^-+/, "") // trim - from start of text
        .replace(/-+$/, ""); // trim - from end of text

    return str;
}

/**
 * Create database for new company.
 */
company.pre("save", function (next) {
    // @ts-ignore
    if (this.name) {
        // @ts-ignore
        this.name_slug = convertToSlug(this.name);
    }
    if (!this.isNew) {
        return next();
    }
    // Split the name by space ' ', lowercase it and then join by underscore '_'.
    // @ts-ignore
    const nameOpts = this.name.split(" ").map((x) => x.toLowerCase()).join("_");
    // @ts-ignore
    this.database = {
        path: `${nameOpts}_${(new Date()).getTime()}`,
    };
    next();
});

export default mongoose.model("Company", company);
