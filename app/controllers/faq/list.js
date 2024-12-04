define(['microcore', 'mst!/faq/list'],
    function (mc, view) {
    return async function (params) {
        document.title = `${mc.i18n('faq.title')} | ${require.config.env.PANEL_TITLE}`;

        let data = {
            profile: await mc.api.call("users.me"),
            faq: await mc.api.call("faq.list", {language: localStorage.getItem('lang')}),
            header: {
                title: mc.i18n('faq.title'),
                breadcrumbs: [],
                actions: [],
                notes: [],
                counters: []
            }
        };

        return view(data);
    }
});