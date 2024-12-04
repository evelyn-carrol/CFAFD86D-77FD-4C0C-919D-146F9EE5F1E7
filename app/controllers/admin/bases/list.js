define(['microcore', 'mst!/admin/bases/list', '/app/modules/confirm', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('admin.bases.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('admin.bases.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('admin.bases.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('bases.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                types: [
                    { option: 'cvv', value: 'cvv' },
                    { option: 'bulk', value: 'bulk' }
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
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' }
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
                seller_set: async (id) => {
                    let item = await mc.api.call('users.get', { id: id });
                    return {
                        option: item.nickname,
                        value: item.id,
                    };
                },
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [],
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