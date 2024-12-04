define(['microcore', 'app/modules/notify'],
    function (mc, notify){

        return async ($scope, $params) => {
            let stats = await mc.api.call("shop.stats.summary"),
                referral_link = await mc.api.call("users.referrals.link");

            referral_link = location.hostname + referral_link;

            if (stats){
                $($scope).find('.stat_deposit .value').html(stats.deposit);
                $($scope).find('.stat_orders .value').html(stats.orders);
                $($scope).find('.stat_spend .value').html(stats.spend);
                $($scope).find('.referral-url > a > span').html(referral_link);
                $($scope).find('.referral-url > a').attr('href', 'https://' + referral_link)
            }
        }
    });