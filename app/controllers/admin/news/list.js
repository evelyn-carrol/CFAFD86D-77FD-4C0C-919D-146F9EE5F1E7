define(['microcore', 'mst!/admin/news/list', '/app/modules/confirm', 'app/modules/notify'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('admin.news.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        mc.events.on('admin.news.archive', async (entity) => {
            confirm(`${mc.i18n('actions.archive')}?`, decodeURIComponent(entity.title), () => {
                mc.api.call('news.update', {
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

        return async function (params) {
            document.title = `${mc.i18n('news.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' }
                ],
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                header: {
                    title: mc.i18n('news.title'),
                    breadcrumbs: [],
                    actions: [
                        '<a href="/admin/news/edit/new">Create a news</a>'
                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    });