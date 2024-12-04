define(['microcore', 'mst!/shop/cvv/list', 'app/modules/suggests'],
    function (mc, view) {
        let hash;

        mc.events.on('shop.cvv.filter.bin.change', async (input) => {
            hash.bins = input.value || undefined;
        });

        mc.events.on('shop.cvv.filter.expire.change', async (input) => {
            hash.date = input.value || undefined;
        });

        mc.events.on('shop.cvv.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('shop.cvv.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                brand_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                type_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                category_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                country_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                base_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                seller_set: async (id) => {
                    let item = await mc.api.call('users.get', { id: id });
                    return {
                        option: item.nickname,
                        value: item.id,
                    };
                },
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                header: {
                    title: mc.i18n('shop.title'),
                    breadcrumbs: [
                        {name: mc.i18n('shop.cvv.title'), url: "/"}
                    ],
                    actions: [
                        `<button type="button" class="button bordered" 
                            onclick="___mc.events.push('shop.cvv.selected.card_add', this)">
                            Add selected to cart
                        </button>`
                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    });