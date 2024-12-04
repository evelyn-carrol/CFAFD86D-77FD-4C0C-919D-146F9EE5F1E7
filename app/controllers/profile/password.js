define(['microcore', 'mst!/profile/password', 'app/modules/notify'],
    function (mc, view, notify){
        let data = {};

        mc.events.on("profile.password.update", (btn) => {
            let password = $('form input[name=password]').val(),
                password_new = $('form input[name=password_new]').val(),
                password_confirm = $('form input[name=password_confirm]').val(),
                captcha = $('form input[name=captcha]').val();

            if (password_new.trim() === "" || password_new !== password_confirm){
                $('form input[name=password_new]').val('');
                $('form input[name=password_confirm]').val('');
                notify("error", mc.i18n('notify.error'), mc.i18n('notify.passwords_mismatched'));
                btn.disabled = false;
                return;
            }

            mc.api.call("auth.login", {nickname: data.profile.nickname, password: password, captcha: captcha})
                .then((res) => {
                    if (res && res.id){
                        mc.api.call("users.update", {id: data.profile.id, password: password_new})
                            .then((res)=>{
                                btn.disabled = false;
                                if (res && res.id){
                                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.update_successfully'));
                                    mc.router.go('/profile/');
                                } else {
                                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.update_error'));
                                }
                            });
                    } else {
                        $('input[name=captcha]').val('');
                        $("#captcha")[0].click();
                        btn.disabled = false;
                        notify("error", mc.i18n('notify.error'), mc.i18n("notify.auth_error"));
                    }
                });
        });

        mc.events.on("profile.password.captcha", async (btn) => {
            let captcha = await mc.api.call("auth.captcha", {});
            if (captcha){
                btn.innerHTML = `<img style="height: 52px" src="${captcha}">`;
                btn.style.padding = '4px';
            }
        });

        mc.events.on('sys:page.init:profile/password', () => {
            document.getElementById("captcha").click();
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