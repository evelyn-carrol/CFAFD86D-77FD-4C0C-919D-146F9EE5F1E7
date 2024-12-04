define(['microcore', 'mst!/shop/bulk/list', 'app/modules/suggests'],
    function (mc, view) {
        let hash;

        mc.events.on('shop.bulk.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('shop.bulk.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('shop.bulk.filter.q.change', async (input) => {
           hash.q = input.value;
        });

        mc.events.on('shop.bulk.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('shop.bulk.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                seller_set: async (id) => {
                    let item = await mc.api.call('users.get', { id: id });
                    return {
                        option: item.nickname,
                        value: item.id,
                    };
                },
                header: {
                    title: mc.i18n('shop.title'),
                    breadcrumbs: [
                        {name: mc.i18n('shop.bulk.title'), url: "/"}
                    ],
                    actions: [
                        `<button type="button" class="button bordered" 
                            onclick="___mc.events.push('shop.bulk.selected.card_add', this)">
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