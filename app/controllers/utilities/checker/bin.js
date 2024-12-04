define(['microcore', 'mst!/utilities/checker/bin', "/app/modules/notify"],
    function (mc, view, notify) {

        mc.events.on("utils.bin_checker.submit", (btn) => {
            let bin = $('form input[name=bin]')[0].value

            mc.api.call("utils.bins.check", {bin: bin}).then((res)=>{
                btn.disabled = false;
                $('form input[name=bin]').val('');

                if (res){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.bin_exist'));
                    //mc.router.go('/utilities/checker-bin/');
                    document.querySelector('#bins-list table > tbody .loader').innerHTML = mc.i18n('table.empty');
                    document.querySelector('#bins-list').removeAttribute('inited');
                } else {
                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.bin_not_exist'));
                }
            });
        });

        return async function (params) {
            document.title = `${mc.i18n('utilities.checker.bin.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('utilities.checker.bin.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    });