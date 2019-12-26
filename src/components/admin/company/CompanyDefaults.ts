export default class CompanyDefaults {
    private defaults = {
        list: [{
            items: [],
            isDefault: true,
            key: "channels",
            title: "Channels",
            description: "Channels for stores",
            id: 1
        }, {
            items: [],
            isDefault: true,
            key: "sub_channels",
            title: "Sub Channels",
            description: "Sub Channels for stores",
            id: 2
        },
        {
            items: [],
            isDefault: true,
            key: "regions",
            title: "Store regions",
            description: "Region of store",
            id: 3
        },
        {
            items: [],
            isDefault: true,
            key: "sub_regions",
            title: "Store sub regions",
            description: "Sub Region of store",
            id: 4
        }],
        pocs: []
    };

    public get(key) {
        return this.defaults[key];
    }
}
