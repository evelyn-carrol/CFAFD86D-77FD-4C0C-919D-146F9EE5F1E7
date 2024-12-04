define(['microcore', 'mst!/shop/client/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('shop.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('shop.title'),
                    breadcrumbs: [{url: "/", name: "Buy Individually"}],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    });