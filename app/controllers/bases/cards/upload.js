define(['microcore', 'mst!/bases/cards/upload', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, notify) {

        let data = {};

        mc.events.on("cards.upload.file.select", (btn) => {
            $('#dump_file')[0].click();
        });

        mc.events.on("cards.upload.file.read", async (input) => {
            /*
            let fr = new FileReader();
            fr.onload = () =>{
                console.log(fr.result);
            }
            fr.readAsText(input.files[0]);
             */

            let fd = new FormData();
            fd.append('file', input.files[0]);
            let resp = await fetch(require.config.env.UPLOAD_URL, {
                method: 'POST',
                body: fd,
            }).then((res) => res.json());
            $('input[name=file]').val(resp[0].path);
            data.dump.file = resp[0].path;
        });

        mc.events.on("cards.upload.save", (btn) => {
            data.dump.price = parseFloat(parseFloat($('form input[name=price]').val()).toFixed(2));
            data.dump.data = $('form textarea[name=data]').val().trim();

            if (data.dump.base_id && !isNaN(data.dump.price)){
                mc.api.call("shop.cards.upload", data.dump).then((res) => {
                    btn.disabled = false;
                    if (res){
                        notify("success", mc.i18n('notify.success'), mc.i18n('notify.upload_successfully'));
                        mc.router.go('/bases/');
                    } else {
                        notify("error", mc.i18n('notify.error'), mc.i18n('notify.upload_error'));
                    }
                });
            } else {
                btn.disabled = false;
            }
        });

        return async function (params) {
            document.title = `${mc.i18n('cards.upload.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                dump: {},
                upload_base_set: async (id) => {
                    let item = await mc.api.call('shop.bases.get', { id: id });
                    return {
                        option: item.name + '['+ item.status +']',
                        value: item.id,
                    };
                },
                upload_base_change: (selected) => {
                    data.dump.base_id = selected.value;
                },
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [
                        {name: mc.i18n('cards.upload.title'), url: '/'}
                    ],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    });