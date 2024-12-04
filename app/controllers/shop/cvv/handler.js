define(['microcore', 'mst!shop/cvv/item', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, row_view, notify){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('shop.cvv.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.cards.search', filter);

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

        mc.events.on("shop.cvv.cart.add", async (btn) => {
            mc.api.call("shop.cart.add", {id: btn.dataset.id, type: "cvv"}).then((res) => {
                if (res){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.cart_added'));
                } else {
                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.already_in_cart'));
                }
            });
        });

        mc.events.on("shop.cvv.selected.card_add", async (btn) => {
            document.querySelectorAll('table tr input[type=checkbox]:checked')
                .forEach((el, inx) => {
                    if (el.dataset.id) {
                        mc.api.call("shop.cart.add", {id: el.dataset.id, type: "cvv"}).then((res) => {
                            if (res) {
                                notify("success", mc.i18n('notify.success'), mc.i18n('notify.cart_added'));
                            }
                        });
                    }
                });
        });

        mc.events.on("shop.cvv.checkbox.all.toggle", (checkbox) => {
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

            if (filter.date) {
                try {
                    let selected_date = filter.date.split('-');
                    filter.expire = {
                        month: ("0" + selected_date[1]).slice(-2),
                        year: selected_date[0].slice(-2)
                    }
                    filter.date = undefined;
                } catch (e) {
                    filter.expire = undefined;
                }
            }
            if (filter.bins){
                try{
                    filter.bin = [];
                    let selected_bins = filter.bins.split(',');
                    for (let bin of selected_bins){
                        if (!isNaN(bin)){
                            filter.bin.push(parseInt(bin));
                        }
                    }
                    if (!filter.bin.length){
                        filter.bin = undefined
                    }
                    filter.bins = undefined
                }catch (e) {
                    filter.bin = undefined
                }
            }

            await mc.events.push('shop.cvv.filter.apply', $scope);
        }
    });