define(['microcore', 'mst!/profile/index', 'app/modules/notify'],
    function (mc, view, notify){

        let data = {};

        mc.events.on("profile.update", (btn) => {
            let nickname = $('form input[name=nickname]').val().trim(),
                name = $('form input[name=name]').val().trim();

            let pattern = /^[A-Za-z0-9_]+$/;
            if (!pattern.test(nickname)){
                $('form input[name=nickname]').val('');
                notify("error", mc.i18n('notify.error'), mc.i18n('notify.nickname_error'));
                btn.disabled = false;
                return;
            }

            mc.api.call("users.update", {id: data.profile.id, nickname: nickname, name: name}).then((res)=>{
               btn.disabled = false;
               if (res && res.id){
                   notify("success", mc.i18n('notify.success'), mc.i18n('notify.update_successfully'));
                   mc.router.go('/profile/');
               } else {
                   notify("error", mc.i18n('notify.error'), mc.i18n('notify.update_error'));
               }
            });
        });

        mc.events.on('sys:page.init:profile/index', () => {

        });

        return async function (params){
            document.title = `${mc.i18n('profile.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('profile.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    });