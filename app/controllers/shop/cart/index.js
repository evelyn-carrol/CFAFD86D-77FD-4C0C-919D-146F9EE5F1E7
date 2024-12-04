define(['microcore', 'mst!/shop/cart/index', 'mst!shop/cart/cvv/item', 'mst!shop/cart/bulk/item',
        'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, cvv_view, bulk_view, notify) {
        let cart;

        mc.events.on('shop.cart.checkout', async (btn) => {
            mc.api.call("shop.orders.buy").then((res) => {
                btn.disabled = false;
                if (res){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.checkout_successfully'));
                    mc.router.go('/shop/orders/');
                }
            });
        });

        mc.events.on('shop.cart.remove', async (btn) => {
            mc.api.call("shop.cart.remove", {id: [parseInt(btn.dataset.pos)]}).then((res) => {
                if (res){
                    mc.router.go('/shop/cart/');
                }
            });
        });

        mc.events.on('shop.cart.checkbox.toggle.all', async (checkbox) => {
            checkbox.closest('table').querySelectorAll('tr input[type=checkbox]')
                .forEach((el, inx) => {
                    el.checked = checkbox.checked
                });
        });

        mc.events.on('shop.cart.selected.remove', async (btn) => {
            let ids = [];
            document.querySelectorAll('table tr input[type=checkbox]:checked')
                .forEach((el, inx) => {
                    if (!isNaN(el.dataset.pos)) {
                        ids.push(parseInt(el.dataset.pos));
                    }
                });
            if (ids.length){
                mc.api.call("shop.cart.remove", {id: ids}).then((res) => {
                    if (res){
                        mc.router.go('/shop/cart/');
                    }
                });
            }
        });

        mc.events.on('shop.cart.clear', async (btn) => {
            mc.api.call("shop.cart.clear").then((res) => {
                if (res){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.clear_successfully'));
                    mc.router.go('/shop/cart/');
                } else {
                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.clear_error'));
                }
            });
        });

        mc.events.on('shop.cart.items.show', async (data) => {
            if (data && data.length) {
                $('#cvv table > tbody').html('');
                $('#bulk table > tbody').html('');
                let total_price = 0;
                for (let i in data) {
                    let item = data[i];
                    total_price += parseFloat(item.info.price || item.price || 0);
                    if (item.type === 'cvv') {
                        $('#' + item.type + ' table > tbody').append(await cvv_view(item));
                    } else {
                        $('#' + item.type + ' table > tbody').append(await bulk_view(item));
                    }
                }
                $('#total-price').find('span').text(`${total_price}$`);
            } else {
                $('#cvv table > tbody .loader').html(mc.i18n('table.empty'));
                $('#bulk table > tbody .loader').html(mc.i18n('table.empty'));
                document.querySelector('#btn-checkout').classList.add('hide');
            }
        });

        mc.events.on('sys:page.init:shop/cart/index', async () => {
            cart = await mc.api.call("shop.cart.get");
            mc.events.push('shop.cart.items.show', cart);
        });

        return async function (params) {

            document.title = `${mc.i18n('cart.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                header: {
                    title: mc.i18n('shop.title'),
                    breadcrumbs: [
                        {name: mc.i18n('cart.title'), url: "/"}
                    ],
                    actions: [
                        `<button type="button" class="button" onclick="___mc.events.push('shop.cart.selected.remove', this)">${mc.i18n('buttons.remove_selected')}</button>`,
                        `<button type="button" class="button" onclick="___mc.events.push('shop.cart.clear', this)">${mc.i18n('buttons.clear_cart')}</button>`
                    ],
                    notes: [],
                    counters: [
                        `<p id="total-price">${mc.i18n('info.total_amount')}: <span class="el-count">0 $</span></p>`,
                        `<button id="btn-checkout" type="button" class="button bordered green" onclick="this.disabled=true;___mc.events.push('shop.cart.checkout', this)">${mc.i18n('orders.make')}</button>`
                    ]
                }
            };

            return view(data);
        }
    });