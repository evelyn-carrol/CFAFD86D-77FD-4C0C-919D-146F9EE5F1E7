define(['microcore', 'mst!shop/client/handler/product', 'app/modules/notify'],
function (mc, row_view, notify){
    let filter = {limit: 1},
        page = 1,
        def_limit = 3;

    mc.events.on('shop.filter.apply', async ($scope) => {
        let data = await mc.api.call('shop.products.list', filter);

        if (data && data.items && data.items.length) {
            $($scope).find('table > tbody').html('');
            for (let i in data.items) {
                let item = data.items[i];

                $($scope).find('table > tbody').append(await row_view(item));
            }
        } else {
            $($scope).find('table > tbody .loader').html(mc.i18n('table.empty'));
        }
        mc.events.push('system:pagination.update', {
            total: data && data.total ? data.total : 0,
            limit: data && data.limit ? data.limit : def_limit,
            current: page,
        });
    });

    mc.events.on("shop.products.buy", (id) => {
        mc.api.call("shop.products.buy", {id: id}).then((res) => {
            if (res && !isNaN(parseInt(res))){
                notify("success", mc.i18n('notify.success'), mc.i18n('notify.buy_success'));
            } else {
                notify("error", mc.i18n('notify.error'), mc.i18n('notify.buy_error'));
            }
        });
    });

    return async ($scope, $params) => {
        filter = mc.router.hash();
        page = parseInt(filter.page) || 1;
        filter.limit = parseInt(filter.limit) || def_limit;
        filter.offset = (page - 1) * filter.limit;



        await mc.events.push('shop.filter.apply', $scope);
    }
});