define(['microcore', 'mst!/bases/list', '/app/modules/confirm', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('bases.archive', async (entity) => {
            confirm(`${mc.i18n('actions.archive')}?`, decodeURIComponent(entity.name), () => {
                mc.api.call('shop.bases.update', {
                    id: parseInt(entity.id),
                    status: "archived"
                }).then((res) => {
                    if (res) {
                        notify("success", mc.i18n('notify.archive_successfully'));
                        mc.router.go(location.pathname);
                    } else {
                        notify("error", mc.i18n('notify.archive_error'));
                    }
                });
            });
        });

        mc.events.on('bases.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('bases.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('bases.filter.filter', async ($scope) => {
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
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [],
                    actions: [
                        `<a href="/bases/edit/new">${mc.i18n('bases.edit.create_btn')}</a>`,
                        `<a href="/bases/cards/upload/">${mc.i18n('cards.upload.title')}</a>`
                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    });