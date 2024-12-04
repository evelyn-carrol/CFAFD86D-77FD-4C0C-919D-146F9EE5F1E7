define(['microcore', 'mst!/admin/users/edit', 'app/modules/notify'],
    function (mc, view, notify) {

        let data = {};

        mc.events.on("admin.user.save", (btn) => {
            let action = btn.dataset.action;
            data.user.nickname = $('form input[name=nickname]').val().trim();
            data.user.name = $('form input[name=name]').val().trim();
            data.user.settings.time_zone = parseInt($('form input[name=timezone]').val().trim());

            mc.api.call("users."+action, data.user).then((res) => {
                btn.disabled = false;
                if (res && ((action === "add" && !isNaN(parseInt(res))) || (action === "update" && res))){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.'+action+'_successfully'));
                    if (action === "add") {
                        mc.router.go('/admin/users/');
                    } else {
                        mc.router.go('/admin/users/edit/'+data.user.id);
                    }
                } else {
                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.'+action+'_error'));
                }
            });
        });

        mc.events.on('sys:page.init:admin/users/edit', () => {

        });

        return async function (params) {
            document.title = `${mc.i18n('users.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('users.title'),
                    breadcrumbs: [
                        {name: mc.i18n('users.edit.caption'), url: "/"}
                    ],
                    actions: [],
                    notes: [],
                    counters: []
                },
                user: {
                    id: "new",
                    status: "active",
                    role: "client",
                    settings: {
                        two_factor: false,
                        time_zone: 0
                    }
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.blocked'), value: 'blocked' },
                ],
                user_status_change: (selected) => {
                    data.user.status = selected.value;
                },
                user_status_suggest: (val) => {
                    return data.statuses;
                },
                roles: [
                    {option: 'admin', value: 'admin'},
                    {option: 'support', value: 'support'},
                    {option: 'client', value: 'client'},
                    {option: 'seller', value: 'seller'}
                ],
                user_role_change: (selected) => {
                    data.user.role = selected.value;
                },
                user_role_suggest: (val) => {
                    return data.roles;
                },
                title: mc.i18n('users.edit.add'),
            };

            if (params.id !== "new"){
                data.user = await mc.api.call("users.get", {id: params.id});
                delete data.user.password;
                delete data.user.password_last_change;
                delete data.user.created;
                delete data.user.updated;
                delete data.user.api_key;
                delete data.user.two_factor_key;
                delete data.user.balance;
                data.title = mc.i18n('users.edit.update')
            }

            return view(data);
        }
    });