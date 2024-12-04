define(['microcore', 'mst!/profile/orders/list', '/app/modules/confirm', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('orders.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('orders.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('orders.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('orders.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                types: [
                    { option: 'cc', value: 'cc' },
                    { option: 'bin', value: 'bin' },
                    { option: 'leads', value: 'leads'}
                ],
                type_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                type_suggest: async (selected) => {
                    return data.types;
                },
                statuses: [
                    { option: mc.i18n('statuses.new'), value: 'new' },
                    { option: mc.i18n('statuses.canceled'), value: 'canceled' },
                    { option: mc.i18n('statuses.payed'), value: 'payed' }
                ],
                status_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                status_suggest: async (selected) => {
                    return data.statuses;
                },
                header: {
                    title: mc.i18n('profile.title'),
                    breadcrumbs: [
                        {name: mc.i18n('orders.title'), url: "/"}
                    ],
                    actions: [

                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    });