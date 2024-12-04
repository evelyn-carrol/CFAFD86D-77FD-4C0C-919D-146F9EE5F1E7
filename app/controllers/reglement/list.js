define(['microcore', 'mst!/reglement/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('reglement.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('reglement.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    });