define(['microcore', 'mst!/bases/edit', 'app/modules/notify'],
    function (mc, view, notify) {

        let data = {};

        mc.events.on("base.save", (btn) => {
            let action = btn.dataset.action;
            data.base.name = $('form input[name=name]').val().trim();
            data.base.price = parseFloat(parseFloat($('form input[name=price]').val()).toFixed(2));

            if (data.base.name.length && !isNaN(data.base.price)){
                mc.api.call("shop.bases."+action, data.base).then((res) => {
                    btn.disabled = false;
                    if (res && ((action === "add" && !isNaN(parseInt(res))) || (action === "update" && res))){
                        notify("success", mc.i18n('notify.success'), mc.i18n('notify.'+action+'_successfully'));
                        mc.router.go('/bases/');
                    } else {
                        notify("error", mc.i18n('notify.error'), mc.i18n('notify.'+action+'_error'));
                    }
                });
            } else {
                btn.disabled = false;
            }
        });

        mc.events.on('sys:page.init:bases/edit', () => {

        });

        return async function (params) {
            document.title = `${mc.i18n('bases.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [
                        {name: mc.i18n('bases.edit.caption'), url: '/'}
                    ],
                    actions: [],
                    notes: [],
                    counters: []
                },
                base: {
                    id: "new",
                    type: "cvv",
                    status: "active"
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' },
                ],
                base_status_change: (selected) => {
                    data.base.status = selected.value;
                },
                base_status_suggest: (val) => {
                    return data.statuses;
                },
                types: [
                    {option: 'cvv', value: 'cvv'},
                    {option: 'bulk', value: 'bulk'}
                ],
                base_type_change: (selected) => {
                    data.base.type = selected.value;
                },
                base_type_suggest: (val) => {
                    return data.types;
                },
                title: mc.i18n('bases.edit.add'),
            };

            if (params.id !== "new"){
                data.base = await mc.api.call("shop.bases.get", {id: params.id});
                data.title = mc.i18n('bases.edit.update')
            }

            return view(data);
        }
    });