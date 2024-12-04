define(['microcore', 'mst!/admin/faq/list', '/app/modules/confirm', 'app/modules/notify'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('admin.faq.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        mc.events.on('admin.faq.archive', async (entity) => {
            confirm(`${mc.i18n('actions.archive')}?`, decodeURIComponent(entity.question), () => {
                mc.api.call('faq.update', {
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
            document.title = `${mc.i18n('faq.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' }
                ],
                languages: [
                    {option: "en", value: "en"}
                ],
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                header: {
                    title: mc.i18n('faq.title'),
                    breadcrumbs: [],
                    actions: [
                        `<a href="/admin/faq/edit/new">${mc.i18n('faq.create')}</a>`
                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    });