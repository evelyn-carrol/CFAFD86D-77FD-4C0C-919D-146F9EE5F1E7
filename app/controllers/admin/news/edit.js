define(['microcore', 'ckeditor', 'mst!/admin/news/edit', 'app/modules/notify'],
    function (mc, ClassicEditor, view, notify) {

        let data = {}, html_editor;

        mc.events.on("admin.news.date.change", (input) => {
            data.news.date = input.value || undefined;
        });

        mc.events.on("admin.news.save", (btn) => {
            let action = btn.dataset.action;
            data.news.title = $('form input[name=title]').val().trim();
            data.news.description = $('form textarea[name=description]').val().trim();
            data.news.text = html_editor.getData();

            if (data.news.title.length && data.news.lang.length){
                mc.api.call("news."+action, data.news).then((res) => {
                    btn.disabled = false;
                    if (res && ((action === "create" && !isNaN(parseInt(res))) || (action === "update" && res))){
                        notify("success", mc.i18n('notify.success'), mc.i18n('notify.'+action+'_successfully'));
                        mc.router.go('/admin/news/');
                    } else {
                        notify("error", mc.i18n('notify.error'), mc.i18n('notify.'+action+'_error'));
                    }
                });
            } else {
                btn.disabled = false;
            }
        });

        mc.events.on('sys:page.init:admin/news/edit', () => {
            ClassicEditor.create( document.querySelector( '#html-editor-description' ) )
                .then( editorInst => {
                    html_editor = editorInst;
                })
                .catch( error => {
                    console.error( error );
                });
        });

        return async function (params) {
            document.title = `${mc.i18n('news.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('news.title'),
                    breadcrumbs: [
                        {name: mc.i18n('news.edit.caption'), url: '/'}
                    ],
                    actions: [],
                    notes: [],
                    counters: []
                },
                news: {
                    id: "new",
                    lang: "en",
                    role: "public"
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' },
                ],
                news_status_change: (selected) => {
                    data.news.status = selected.value;
                },
                news_status_suggest: (val) => {
                    return data.statuses;
                },
                roles: [
                    {option: 'public', value: 'public'},
                    {option: 'client', value: 'client'},
                    {option: 'seller', value: 'seller'}
                ],
                news_role_change: (selected) => {
                    data.news.role = selected.value;
                },
                news_role_suggest: (val) => {
                    return data.roles;
                },
                langs: [
                    {option: "en", value: "en"}
                ],
                news_lang_change: (selected) => {
                    data.news.lang = selected.value;
                },
                news_lang_suggest: (val) => {
                    return data.langs;
                },
                title: mc.i18n('news.edit.add'),
            };

            if (params.id !== "new"){
                data.news = await mc.api.call("news.get", {id: params.id});
                data.title = mc.i18n('news.edit.update')
            }

            return view(data);
        }
    });