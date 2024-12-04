define(['microcore', 'mst!/admin/users/list', '/app/modules/confirm', 'app/modules/notify'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on("admin.users.seller.set", async (entity) => {
            confirm(`${mc.i18n('actions.make_seller')}?`, decodeURIComponent(entity.name), () => {
                mc.api.call('users.update', {
                    id: parseInt(entity.id),
                    role: "seller"
                }).then((res) => {
                    if (res) {
                        notify("success", mc.i18n('notify.seller_successfully'));
                        mc.router.go(location.pathname);
                    } else {
                        notify("error", mc.i18n('notify.seller_error'));
                    }
                });
            });
        });

        mc.events.on('admin.users.archive', async (entity) => {
            confirm(`${mc.i18n('actions.archive')}?`, entity.name, () => {
                mc.api.call('users.update', {
                    id: parseInt(entity.id),
                    status: "blocked"
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

        mc.events.on('admin.users.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('admin.users.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('admin.users.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {
            document.title = `${mc.i18n('users.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                roles: [
                    { option: 'admin', value: 'admin' },
                    { option: 'support', value: 'support' },
                    { option: 'client', value: 'client' },
                    { option: 'seller', value: 'seller' }
                ],
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.blocked'), value: 'blocked' }
                ],
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                header: {
                    title: mc.i18n('users.title'),
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