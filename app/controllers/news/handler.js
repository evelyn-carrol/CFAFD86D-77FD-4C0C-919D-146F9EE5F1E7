define(['microcore', 'mst!news/item', 'app/modules/notify'],
    function (mc, row_view, notify){
        let filter = {limit: 1},
            page = 1,
            def_limit = 3;

        mc.events.on('news.filter.apply', async ($scope) => {
            let data = await mc.api.call('news.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('.news-list').html('');
                for (let i in data.items) {
                    let item = data.items[i];

                    $($scope).find('.news-list').append(await row_view(item));
                }
            } else {
                $($scope).find('.news-list').html(mc.i18n('table.empty'));
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



            await mc.events.push('news.filter.apply', $scope);
        }
    });