define(['microcore', 'mst!admin/orders/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('admin.orders.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.orders.list', filter);

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            if (filter.period_s || filter.period_e) {
                try {
                    filter.created = {}
                    if (filter.period_s){
                        filter.created.start = utilities.datetimeToUnixTimestamp(filter.period_s);
                    }
                    if (filter.period_e){
                        filter.created.end = utilities.datetimeToUnixTimestamp(filter.period_e);
                    }
                    filter.period_s = undefined;
                    filter.period_e = undefined;
                } catch (e) {
                    filter.created = undefined;
                }
            }

            await mc.events.push('admin.orders.filter.apply', $scope);
        }
    });