define(['microcore', 'mst!admin/faq/item', 'app/modules/notify'],
    function (mc, row_view, notify){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('admin.faq.filter.apply', async ($scope) => {
            let data = await mc.api.call('faq.list', filter);

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



            await mc.events.push('admin.faq.filter.apply', $scope);
        }
    });