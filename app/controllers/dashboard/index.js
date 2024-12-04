define(['microcore', 'mst!/dashboard/index', 'mst!/dashboard/client', 'mst!/dashboard/seller',
        'mst!/dashboard/support', 'mst!/dashboard/admin'],
    function (mc, view, client_view, seller_view, support_view, admin_view){
    return async function (params){
        document.title = `${mc.i18n('dashboard.title')} | ${require.config.env.PANEL_TITLE}`;

        let data = {
            profile: await mc.api.call("users.me"),
            header: {
                title: mc.i18n('dashboard.title'),
                breadcrumbs: [],
                actions: [],
                notes: [],
                counters: []
            }
        };

        switch (data.profile.role) {
            case 'client':
                return view(data);
            case 'seller':
                return view(data);
            case 'support':
                return support_view(data);
            case 'admin':
                return admin_view(data);
        }
    }
});