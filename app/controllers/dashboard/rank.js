define(['microcore', 'mst!/dashboard/blocks/rank', 'app/modules/notify'],
    function (mc, view, notify){
        return async ($scope, $params) => {
            let profile = await mc.api.call("users.me");

            $($scope).html(await view({
                profile: profile
            }))
        }
    });