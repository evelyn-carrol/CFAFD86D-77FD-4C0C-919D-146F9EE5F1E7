define(['microcore', 'mst!support/row', 'mst!support/item', 'app/modules/notify', '/app/modules/confirm'],
    function (mc, row_view, item_view, notify, confirm){
    let filter = {limit: 1},
        page = 1,
        def_limit = 5;

    mc.events.on('support.filter.apply', async ($scope) => {
        filter.status = [filter.status];

        let data = await mc.api.call('support.list', filter);
        let profile = mc.auth.get();

        if (data && data.items && data.items.length) {
            $($scope).find('table > tbody').html('');
            for (let i in data.items) {
                let item = data.items[i];
                item.profile = profile;
                item.filter = filter;

                $($scope).find('table > tbody').append(await row_view(item));
            }
        } else {
            $($scope).find('table > tbody .loader').html(mc.i18n('table.empty'));
        }
        mc.events.push('system:pagination.update', {
            total: data && data.total ? data.total : 0,
            limit: data && data.limit ? data.limit : def_limit,
            current: page,
        });
    });

    mc.events.on('support.ticket.get', async (id) => {
        let chat_container = $('.support-chat-container .bl-middle'),
            chat_title = $('#chat-title'),
            answer_text = $('.support-chat-container .text-answer'),
            answer_btn = $('.support-chat-container .btn-answer');

        chat_container.html("");
        chat_title.html("");
        answer_text.html("");
        answer_btn[0].dataset.id = "";

        let ticket = await mc.api.call("support.get", {id: id});
        if (ticket && ticket.id){
            chat_title.html(ticket.title);
            answer_btn[0].dataset.id = ticket.id;
            if (ticket.messages && ticket.messages.length){
                for (let i in ticket.messages) {
                    chat_container.append(await item_view(ticket.messages[i]));
                }
            }
        }
        chat_container[0].scroll({
            top: chat_container[0].scrollHeight,
            left: 0,
            behavior: "smooth",
        });
    });

    mc.events.on('support.ticket.close', async (id) => {
        confirm(`${mc.i18n('actions.support.close')}?`, 'ID: '+id, () => {
            mc.api.call('support.close', {
                id: parseInt(id)
            }).then((res) => {
                if (res) {
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.operation_successfully'));
                    mc.router.go(location.pathname);
                } else {
                    notify("error", mc.i18n('notify.operation_error'));
                }
            });
        });
    });

    mc.events.on('support.ticket.reopen', async (id) => {
        confirm(`${mc.i18n('actions.support.reopen')}?`, 'ID: '+id, () => {
            mc.api.call('support.reopen', {
                id: parseInt(id)
            }).then((res) => {
                if (res) {
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.operation_successfully'));
                    mc.router.go(location.pathname);
                } else {
                    notify("error", mc.i18n('notify.operation_error'));
                }
            });
        });
    });

    mc.events.on('support.ticket.archive', async (id) => {
        confirm(`${mc.i18n('actions.support.archive')}?`, 'ID: '+id, () => {
            mc.api.call('support.archive', {
                id: parseInt(id)
            }).then((res) => {
                if (res) {
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.operation_successfully'));
                    mc.router.go(location.pathname);
                } else {
                    notify("error", mc.i18n('notify.operation_error'));
                }
            });
        });
    });

    mc.events.on('support.answer', (btn) => {
        if (btn.dataset && !isNaN(parseInt(btn.dataset.id))){
            let chat_container = $('.support-chat-container .bl-middle'),
                answer = $('.support-chat-container .text-answer'),
                text = answer.val().trim();
            if (text.length){
                mc.api.call("support.answer", {id: btn.dataset.id, text: text}).then(async (res) => {
                    btn.disabled = false;
                    if (res && !isNaN(parseInt(res))){
                        chat_container.append(await item_view({
                            user: { is_me: true},
                            text: text,
                            created: parseInt((new Date().getTime()/1000).toFixed(0))
                        }));
                        answer.val("");
                        chat_container[0].scroll({
                            top: chat_container[0].scrollHeight,
                            left: 0,
                            behavior: "smooth",
                        });
                    } else {
                        notify("error", mc.i18n('notify.error'), mc.i18n('notify.add_error'));
                    }
                });
            } else {
                btn.disabled = false;
            }
            answer.html("");
        } else {
            btn.disabled = false;
        }
    });

    return async ($scope, $params) => {
        filter = mc.router.hash();
        page = parseInt(filter.page) || 1;
        filter.limit = parseInt(filter.limit) || def_limit;
        filter.offset = (page - 1) * filter.limit;

        if ($params.status === "active"){
            filter.status = "active"
        }else if ($params.status === "closed"){
            filter.status = "closed"
        }else if ($params.status === "archived"){
            filter.status = "archived"
        }

        await mc.events.push('support.filter.apply', $scope);
    }
});