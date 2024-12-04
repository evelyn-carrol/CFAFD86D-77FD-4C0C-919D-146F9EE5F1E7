define(['microcore', 'mst!/profile/referral/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('profile.menu.referral')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('profile.title'),
                    breadcrumbs: [
                        {name: mc.i18n('profile.menu.referral'), url: "/"}
                    ],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    });