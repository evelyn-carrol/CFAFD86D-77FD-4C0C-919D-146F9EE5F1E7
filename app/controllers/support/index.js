define(['microcore', 'mst!/support/index', 'app/modules/notify'],
    function (mc, view, notify) {

        let data = {};

        mc.events.on("support.ticket.add", (btn) => {
            let title = $('form input[name=title]').val().trim(),
                text = $('form textarea[name=text]').val().trim();

            if (title.length > 0 && text.length > 20){
                mc.api.call("support.add", {title: title, text: text})
                    .then((res) => {
                        btn.disabled = false;
                        if (res && !isNaN(parseInt(res))){
                            notify("success", mc.i18n('notify.success'), mc.i18n('notify.add_successfully'));
                            mc.router.go("/support/active");
                        } else {
                            notify("error", mc.i18n('notify.error'), mc.i18n('notify.add_error'));
                        }
                    });
            } else {
                notify("error", mc.i18n('notify.error'), mc.i18n('notify.message_short'));
                btn.disabled = false;
            }
        });

        return async function (params) {
            document.title = `${mc.i18n('support.title')} | ${require.config.env.PANEL_TITLE}`;

            if (!params.status){
                params.status = "active";
            }

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('support.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                },
                status: params.status
            };

            return view(data);
        }
    });