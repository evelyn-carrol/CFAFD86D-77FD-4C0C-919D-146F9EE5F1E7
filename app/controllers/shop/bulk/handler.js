define(['microcore', 'mst!shop/bulk/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('shop.bulk.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.bases.search', filter);

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

        mc.events.on("shop.bulk.cart.add", async (btn) => {
            mc.api.call("shop.cart.add", {id: btn.dataset.id, type: "bulk"}).then((res) => {
                if (res){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.cart_added'));
                } else {
                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.already_in_cart'));
                }
            });
        });

        mc.events.on("shop.bulk.selected.card_add", async (btn) => {
            document.querySelectorAll('table tr input[type=checkbox]:checked')
                .forEach((el, inx) => {
                    if (el.dataset.id) {
                        mc.api.call("shop.cart.add", {id: el.dataset.id, type: "bulk"}).then((res) => {
                            if (res) {
                                notify("success", mc.i18n('notify.success'), mc.i18n('notify.cart_added'));
                            }
                        });
                    }
                });
        });

        mc.events.on("shop.bulk.checkbox.all.toggle", (checkbox) => {
            document.querySelectorAll('table tr input[type=checkbox]')
                .forEach((el, inx) => {
                    el.checked = checkbox.checked
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

            await mc.events.push('shop.bulk.filter.apply', $scope);
        }
    });