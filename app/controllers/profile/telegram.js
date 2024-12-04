define(['microcore', 'mst!/profile/telegram'],
    function (mc, view){
        mc.events.on("profile.link_tg", (btn) => {
            mc.api.call("users.tg.link", {}).then((res)=>{
                btn.disabled = false;
                window.open(res, "_blank");
            });
        });

        return async function (params){
            document.title = `${mc.i18n('profile.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
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