define(['microcore', 'mst!/shop/client/edit', 'app/modules/notify'],
    function (mc, view, notify) {

        let data = {};

        mc.events.on("shop.product.save", (btn) => {
            let name = $('form input[name=name]').val().trim(),
                price = $('form input[name=price]').val().trim(),
                type = $('form select[name=type]')[0].value,
                status = $('form select[name=status]')[0].value,
                action = btn.dataset.action;

            if (name.length && price.length){
                mc.api.call("shop.products."+action, {
                    id: data.product.id,
                    name: name,
                    price: parseFloat(price).toFixed(2),
                    type: type,
                    status: status,
                    data: ""
                }).then((res) => {
                    btn.disabled = false;
                    if (res && ((action === "add" && !isNaN(parseInt(res))) || (action === "update" && res.id))){
                        notify("success", mc.i18n('notify.success'), mc.i18n('notify.'+action+'_successfully'));
                        mc.router.go('/shop/');
                    } else {
                        notify("error", mc.i18n('notify.error'), mc.i18n('notify.'+action+'_error'));
                    }
                });
            } else {
                btn.disabled = false;
            }
        });

        return async function (params) {
            document.title = `${mc.i18n('shop.product.edit.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('shop.product.edit.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                },
                product: {
                    id: "new"
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.inactive'), value: 'inactive' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' },
                ],
                status_change: (selected) => {
                    data.product.status = selected.value;
                },
                types: [
                    {option: 'cc', value: 'cc'},
                    {option: 'bin', value: 'bin'},
                    {option: 'leads', value: 'leads'}
                ],
                type_change: (selected) => {
                    data.product.type = selected.value;
                },
                title: mc.i18n('shop.product.edit.add')
            };

            if (params.id !== "new"){
                data.product = await mc.api.call("shop.products.get", {id: params.id});
                data.title = mc.i18n('shop.product.edit.update')
            }

            return view(data);
        }
    });