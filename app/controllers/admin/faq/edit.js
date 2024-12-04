define(['microcore', 'mst!/admin/faq/edit', 'app/modules/notify'],
    function (mc, view, notify) {

        let data = {};

        mc.events.on("admin.faq.save", (btn) => {
            let action = btn.dataset.action;
            data.faq.question = $('form input[name=question]').val().trim();
            data.faq.answer = $('form textarea[name=answer]').val().trim();

            if (data.faq.question.length && data.faq.answer.length){
                mc.api.call("faq."+action, data.faq).then((res) => {
                    btn.disabled = false;
                    if (res && ((action === "create" && !isNaN(parseInt(res))) || (action === "update" && res))){
                        notify("success", mc.i18n('notify.success'), mc.i18n('notify.'+action+'_successfully'));
                        mc.router.go('/admin/faq/');
                    } else {
                        notify("error", mc.i18n('notify.error'), mc.i18n('notify.'+action+'_error'));
                    }
                });
            } else {
                btn.disabled = false;
            }
        });

        mc.events.on('sys:page.init:admin/faq/edit', () => {
        });

        return async function (params) {
            document.title = `${mc.i18n('faq.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('faq.title'),
                    breadcrumbs: [
                        {name: mc.i18n('faq.edit.caption'), url: '/'}
                    ],
                    actions: [],
                    notes: [],
                    counters: []
                },
                faq: {
                    id: "new",
                    language: "en"
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' },
                ],
                faq_status_change: (selected) => {
                    data.faq.status = selected.value;
                },
                languages: [
                    {option: "en", value: "en"}
                ],
                faq_lang_change: (selected) => {
                    data.faq.language = selected.value;
                },
                title: mc.i18n('faq.edit.add'),
            };

            if (params.id !== "new"){
                data.faq = await mc.api.call("faq.get", {id: params.id});
                data.title = mc.i18n('faq.edit.update')
            }

            return view(data);
        }
    });