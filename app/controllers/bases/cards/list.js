define(['microcore', 'mst!/bases/cards/list', 'app/modules/suggests', '/app/modules/confirm', 'app/modules/notify'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('bases.cards.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('cards.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                statuses: [
                    { option: mc.i18n('statuses.live'), value: 'live' },
                    { option: mc.i18n('statuses.pending'), value: 'pending' },
                    { option: mc.i18n('statuses.sold'), value: 'sold' },
                    { option: mc.i18n('statuses.declined'), value: 'declined' },
                    { option: mc.i18n('statuses.refunded'), value: 'refunded' },
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
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [
                        {name: mc.i18n('cards.title'), url: "/"}
                    ],
                    actions: [

                    ],
                    notes: [],
                    counters: []
                }
            };

            data.filter.base_id = params.base_id;
            hash = data.filter;

            return view(data);
        }
    });