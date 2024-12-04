define(['microcore', 'mst!/dashboard/blocks/activity', 'app/modules/notify'],
    function (mc, view, notify){
        return async ($scope, $params) => {
            let cart = await mc.api.call("shop.cart.get"),
                orders = await mc.api.call("shop.orders.list", {limit: 2}),
                news = await mc.api.call("news.list", {limit: 4});

            $($scope).html(await view({
                products: cart?.length || 0,
                orders: orders,
                news: news
            }))
        }
    });