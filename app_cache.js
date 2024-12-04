(function() {
  let modules = window.bundled || {}
  let config = {
    baseUrl: '/',
    paths: {}
  }

  let loaders = {
    js: async (src, name) => {
      if (typeof app_cache !== 'undefined' && app_cache[src]) {
        return new Promise(async (resolve) => {
          await app_cache[src](name)
          return await resolve(modules[name])
        })
      } else {
        let script = document.createElement('script')
        script.async = true
        script.src = src + (require.config.version ? ('?v=' + require.config.version) : '?v=' + (new Date()).getTime())
        script.dataset.name = name
        document.head.append(script)

        return new Promise((resolve) => {
          script.onload = () => {
            let timer = setInterval(function () {
              if (!(modules[name] instanceof Promise)) {
                clearInterval(timer)
                return resolve(modules[name])
              }
            }, 0)
          }
        })
      }
    },
    json: async (src, name) => {
      return fetch(src).then((resp) => resp.json())
    },

    text: async (src, name) => {
      return fetch(src).then(resp => resp.text())
    },

    css: (src, name) => {
      let css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = src + (require.config.version ? ('?v=' + require.config.version) : '?v=' + (new Date()).getTime())
      document.head.append(css)
      return new Promise((resolve) => {
        css.onload = () => {
          resolve(true)
        }
      })
    },

    mst: async (src, name) => {
      return require(['assets/js/render'], async (render) => {
        let template = ""
        if (typeof views_cache !== 'undefined' && views_cache[src]) {
          template = views_cache[src]
        } else {
          let path = (require.config.render && require.config.render.path) ? require.config.render.path : '/'
          src = path + src + (require.config.version ? ('?v=' + require.config.version) : '?v=' + (new Date()).getTime())
          template = render.compile(await fetch(src).then(resp => resp.text()))
        }
        return (data) => {
          return render.render(template, data)
        }
      })
    }
  }

  function load(depend) {
    if (!require.config.baseUrl) {
      require.config.baseUrl = '/'
    }
    depend = depend.split('!')
    let plugin = depend.length > 1 && depend[0] || 'js'
    let name = depend[1] || depend[0]

    let src = ((name.match(/^\//) || name.match(/^https?:\/\//)) && name + '.' + plugin
      || require.config.baseUrl + (require.config.paths[name] || name) + '.' + plugin)
      .replace(/[\/]{2,}/g, '/').replace(/(https?:\/)([^\/])/g, '$1/$2')

    src = src.match(/\/https?/) && src.substring(1) || src
    return loaders[plugin](src, name)
  }

  this.require = async function(depends, cb) {
    let resolved_depends = []
    for (let depend of depends) {
      let name = depend.split('!').pop()
      modules[name] = modules[name] || load(depend)
    }

    let i = 0
    for (let depend of depends) {
      let name = depend.split('!').pop()
      modules[name] = await modules[name]

      resolved_depends[i++] = modules[name]
    }

    return typeof cb == 'function' && cb(...resolved_depends) || resolved_depends
  }

  this.require.config = (conf) => {
    for (let param in conf) {
      this.require.config[param] = conf[param]
    }
  }

  this.require.addLoader = function(ext, cb) {
    !loaders[ext] && (loaders[ext] = cb)
  }

  this.define = async function(n, d, f, cn) {
    let cache_name = cn || f || d
    if (typeof cache_name == 'function') {
      cache_name = undefined
    }
    let module = typeof f == 'function' && f || typeof d == 'function' && d || typeof n == 'function' && n;
    let depends = typeof d == 'object' && d || typeof n == 'object' && n || []
    let alias = typeof n == 'string' && n || null
    let name = cache_name || document.currentScript.dataset.name
    modules[name] = await this.require(depends, module)
    alias && (modules[alias] = modules[name])
  }

  this.define.amd = true
  document.currentScript.dataset.version && (this.require.config.version = document.currentScript.dataset.version)
  document.currentScript.dataset.main && require([document.currentScript.dataset.main])
})()

app_cache = [];
app_cache["/app/controllers/bases/edit.js"] = async (name) => { await define(['microcore', 'mst!/bases/edit', 'app/modules/notify'],
    function (mc, view, notify) {

        let data = {};

        mc.events.on("base.save", (btn) => {
            let action = btn.dataset.action;
            data.base.name = $('form input[name=name]').val().trim();
            data.base.price = parseFloat(parseFloat($('form input[name=price]').val()).toFixed(2));

            if (data.base.name.length && !isNaN(data.base.price)){
                mc.api.call("shop.bases."+action, data.base).then((res) => {
                    btn.disabled = false;
                    if (res && ((action === "add" && !isNaN(parseInt(res))) || (action === "update" && res))){
                        notify("success", mc.i18n('notify.success'), mc.i18n('notify.'+action+'_successfully'));
                        mc.router.go('/bases/');
                    } else {
                        notify("error", mc.i18n('notify.error'), mc.i18n('notify.'+action+'_error'));
                    }
                });
            } else {
                btn.disabled = false;
            }
        });

        mc.events.on('sys:page.init:bases/edit', () => {

        });

        return async function (params) {
            document.title = `${mc.i18n('bases.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [
                        {name: mc.i18n('bases.edit.caption'), url: '/'}
                    ],
                    actions: [],
                    notes: [],
                    counters: []
                },
                base: {
                    id: "new",
                    type: "cvv",
                    status: "active"
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' },
                ],
                base_status_change: (selected) => {
                    data.base.status = selected.value;
                },
                base_status_suggest: (val) => {
                    return data.statuses;
                },
                types: [
                    {option: 'cvv', value: 'cvv'},
                    {option: 'bulk', value: 'bulk'}
                ],
                base_type_change: (selected) => {
                    data.base.type = selected.value;
                },
                base_type_suggest: (val) => {
                    return data.types;
                },
                title: mc.i18n('bases.edit.add'),
            };

            if (params.id !== "new"){
                data.base = await mc.api.call("shop.bases.get", {id: params.id});
                data.title = mc.i18n('bases.edit.update')
            }

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/bases/handler.js"] = async (name) => { await define(['microcore', 'mst!bases/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1, type: "bulk"},
            page = 1,
            def_limit = 10;

        mc.events.on('bases.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.bases.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            if (filter.period_s || filter.period_e) {
                try {
                    filter.created = {}
                    if (filter.period_s){
                        filter.created.start = utilities.datetimeToUnixTimestamp(filter.period_s);
                    }
                    if (filter.period_e){
                        filter.created.end = utilities.datetimeToUnixTimestamp(filter.period_e);
                    }
                    filter.period_s = undefined;
                    filter.period_e = undefined;
                } catch (e) {
                    filter.created = undefined;
                }
            }

            await mc.events.push('bases.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/bases/list.js"] = async (name) => { await define(['microcore', 'mst!/bases/list', '/app/modules/confirm', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('bases.archive', async (entity) => {
            confirm(`${mc.i18n('actions.archive')}?`, decodeURIComponent(entity.name), () => {
                mc.api.call('shop.bases.update', {
                    id: parseInt(entity.id),
                    status: "archived"
                }).then((res) => {
                    if (res) {
                        notify("success", mc.i18n('notify.archive_successfully'));
                        mc.router.go(location.pathname);
                    } else {
                        notify("error", mc.i18n('notify.archive_error'));
                    }
                });
            });
        });

        mc.events.on('bases.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('bases.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('bases.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('bases.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                types: [
                    { option: 'cvv', value: 'cvv' },
                    { option: 'bulk', value: 'bulk' }
                ],
                type_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                type_suggest: async (selected) => {
                  return data.types;
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' }
                ],
                status_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                status_suggest: async (selected) => {
                  return data.statuses;
                },
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [],
                    actions: [
                        `<a href="/bases/edit/new">${mc.i18n('bases.edit.create_btn')}</a>`,
                        `<a href="/bases/cards/upload/">${mc.i18n('cards.upload.title')}</a>`
                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/bases/cards/handler.js"] = async (name) => { await define(['microcore', 'mst!bases/cards/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1, base_id: 0},
            page = 1,
            def_limit = 10;

        mc.events.on('bases.cards.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.cards.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;
            filter.base_id = $params.baseId;

            await mc.events.push('bases.cards.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/bases/cards/upload.js"] = async (name) => { await define(['microcore', 'mst!/bases/cards/upload', 'app/modules/notify', 'app/modules/suggests'],
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
    }, name);};
app_cache["/app/controllers/bases/cards/list.js"] = async (name) => { await define(['microcore', 'mst!/bases/cards/list', 'app/modules/suggests', '/app/modules/confirm', 'app/modules/notify'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('bases.cards.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('cards.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                statuses: [
                    { option: mc.i18n('statuses.live'), value: 'live' },
                    { option: mc.i18n('statuses.pending'), value: 'pending' },
                    { option: mc.i18n('statuses.sold'), value: 'sold' },
                    { option: mc.i18n('statuses.declined'), value: 'declined' },
                    { option: mc.i18n('statuses.refunded'), value: 'refunded' },
                ],
                status_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                status_suggest: async (selected) => {
                    return data.statuses;
                },
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [
                        {name: mc.i18n('cards.title'), url: "/"}
                    ],
                    actions: [

                    ],
                    notes: [],
                    counters: []
                }
            };

            data.filter.base_id = params.base_id;
            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/maintenance.js"] = async (name) => { await define(['microcore', 'mst!/maintenance', 'utilities'],
    function (mc, view, utils){
        return function (params){
            document.title = `Maintenance | ${require.config.env.PANEL_TITLE}`;
            return view({

            });
        }
    }, name);};
app_cache["/app/controllers/dashboard/rank.js"] = async (name) => { await define(['microcore', 'mst!/dashboard/blocks/rank', 'app/modules/notify'],
    function (mc, view, notify){
        return async ($scope, $params) => {
            let profile = await mc.api.call("users.me");

            $($scope).html(await view({
                profile: profile
            }))
        }
    }, name);};
app_cache["/app/controllers/dashboard/index.js"] = async (name) => { await define(['microcore', 'mst!/dashboard/index', 'mst!/dashboard/client', 'mst!/dashboard/seller',
        'mst!/dashboard/support', 'mst!/dashboard/admin'],
    function (mc, view, client_view, seller_view, support_view, admin_view){
    return async function (params){
        document.title = `${mc.i18n('dashboard.title')} | ${require.config.env.PANEL_TITLE}`;

        let data = {
            profile: await mc.api.call("users.me"),
            header: {
                title: mc.i18n('dashboard.title'),
                breadcrumbs: [],
                actions: [],
                notes: [],
                counters: []
            }
        };

        switch (data.profile.role) {
            case 'client':
                return view(data);
            case 'seller':
                return view(data);
            case 'support':
                return support_view(data);
            case 'admin':
                return admin_view(data);
        }
    }
}, name);};
app_cache["/app/controllers/dashboard/tiles.js"] = async (name) => { await define(['microcore', 'app/modules/notify'],
    function (mc, notify){

        return async ($scope, $params) => {
            let stats = await mc.api.call("shop.stats.summary"),
                referral_link = await mc.api.call("users.referrals.link");

            referral_link = location.hostname + referral_link;

            if (stats){
                $($scope).find('.stat_deposit .value').html(stats.deposit);
                $($scope).find('.stat_orders .value').html(stats.orders);
                $($scope).find('.stat_spend .value').html(stats.spend);
                $($scope).find('.referral-url > a > span').html(referral_link);
                $($scope).find('.referral-url > a').attr('href', 'https://' + referral_link)
            }
        }
    }, name);};
app_cache["/app/controllers/dashboard/cards.js"] = async (name) => { await define(['microcore', 'mst!/dashboard/blocks/cards', 'app/modules/notify'],
    function (mc, view, notify){
        return async ($scope, $params) => {
            let data  = await mc.api.call("shop.stats.cards");

            data.chart = {
                items: [],
                style: `background: conic-gradient(rgba(11, 241, 255, 0.25) 0% 100%);`
            }
            let idx = []

            if (data.current && data.current.items && data.current.items.length){
                for (let i in data.current.items) {
                    let item = data.current.items[i];
                    if (item.brand === "VISA"){
                        item.class = "blue"
                    } else if (item.brand === "MASTERCARD"){
                        item.class = "red"
                    } else if (item.brand === "DISCOVER"){
                        item.class = "yellow"
                    } else if (item.brand === "AMERICAN EXPRESS" || item.brand === "AMEX"){
                        item.class = "green"
                    }
                    idx[i] = {
                        color: "var(--color__"+item.class+"_100)",
                        from: 0,
                        to: Math.round(item.count*100/data.current.total)
                    }
                }

                for (let i in idx) {
                    if (i > 0){
                        idx[i].from = idx[i-1].to;
                        idx[i].to = idx[i].to +  idx[i].from;
                    }
                    data.chart.items.push(`${idx[i].color} ${idx[i].from}% ${idx[i].to}%`);
                }

                data.chart.style = `background: conic-gradient(${data.chart.items.toString()});`;
            }

            $($scope).html(await view(data))
        }
    }, name);};
app_cache["/app/controllers/dashboard/activity.js"] = async (name) => { await define(['microcore', 'mst!/dashboard/blocks/activity', 'app/modules/notify'],
    function (mc, view, notify){
        return async ($scope, $params) => {
            let cart = await mc.api.call("shop.cart.get"),
                orders = await mc.api.call("shop.orders.list", {limit: 2}),
                news = await mc.api.call("news.list", {limit: 4});

            $($scope).html(await view({
                products: cart?.length || 0,
                orders: orders,
                news: news
            }))
        }
    }, name);};
app_cache["/app/controllers/shop/cart/index.js"] = async (name) => { await define(['microcore', 'mst!/shop/cart/index', 'mst!shop/cart/cvv/item', 'mst!shop/cart/bulk/item',
        'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, cvv_view, bulk_view, notify) {
        let cart;

        mc.events.on('shop.cart.checkout', async (btn) => {
            mc.api.call("shop.orders.buy").then((res) => {
                btn.disabled = false;
                if (res){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.checkout_successfully'));
                    mc.router.go('/shop/orders/');
                }
            });
        });

        mc.events.on('shop.cart.remove', async (btn) => {
            mc.api.call("shop.cart.remove", {id: [parseInt(btn.dataset.pos)]}).then((res) => {
                if (res){
                    mc.router.go('/shop/cart/');
                }
            });
        });

        mc.events.on('shop.cart.checkbox.toggle.all', async (checkbox) => {
            checkbox.closest('table').querySelectorAll('tr input[type=checkbox]')
                .forEach((el, inx) => {
                    el.checked = checkbox.checked
                });
        });

        mc.events.on('shop.cart.selected.remove', async (btn) => {
            let ids = [];
            document.querySelectorAll('table tr input[type=checkbox]:checked')
                .forEach((el, inx) => {
                    if (!isNaN(el.dataset.pos)) {
                        ids.push(parseInt(el.dataset.pos));
                    }
                });
            if (ids.length){
                mc.api.call("shop.cart.remove", {id: ids}).then((res) => {
                    if (res){
                        mc.router.go('/shop/cart/');
                    }
                });
            }
        });

        mc.events.on('shop.cart.clear', async (btn) => {
            mc.api.call("shop.cart.clear").then((res) => {
                if (res){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.clear_successfully'));
                    mc.router.go('/shop/cart/');
                } else {
                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.clear_error'));
                }
            });
        });

        mc.events.on('shop.cart.items.show', async (data) => {
            if (data && data.length) {
                $('#cvv table > tbody').html('');
                $('#bulk table > tbody').html('');
                let total_price = 0;
                for (let i in data) {
                    let item = data[i];
                    total_price += parseFloat(item.info.price || item.price || 0);
                    if (item.type === 'cvv') {
                        $('#' + item.type + ' table > tbody').append(await cvv_view(item));
                    } else {
                        $('#' + item.type + ' table > tbody').append(await bulk_view(item));
                    }
                }
                $('#total-price').find('span').text(`${total_price}$`);
            } else {
                $('#cvv table > tbody .loader').html(mc.i18n('table.empty'));
                $('#bulk table > tbody .loader').html(mc.i18n('table.empty'));
                document.querySelector('#btn-checkout').classList.add('hide');
            }
        });

        mc.events.on('sys:page.init:shop/cart/index', async () => {
            cart = await mc.api.call("shop.cart.get");
            mc.events.push('shop.cart.items.show', cart);
        });

        return async function (params) {

            document.title = `${mc.i18n('cart.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                header: {
                    title: mc.i18n('shop.title'),
                    breadcrumbs: [
                        {name: mc.i18n('cart.title'), url: "/"}
                    ],
                    actions: [
                        `<button type="button" class="button" onclick="___mc.events.push('shop.cart.selected.remove', this)">${mc.i18n('buttons.remove_selected')}</button>`,
                        `<button type="button" class="button" onclick="___mc.events.push('shop.cart.clear', this)">${mc.i18n('buttons.clear_cart')}</button>`
                    ],
                    notes: [],
                    counters: [
                        `<p id="total-price">${mc.i18n('info.total_amount')}: <span class="el-count">0 $</span></p>`,
                        `<button id="btn-checkout" type="button" class="button bordered green" onclick="this.disabled=true;___mc.events.push('shop.cart.checkout', this)">${mc.i18n('orders.make')}</button>`
                    ]
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/shop/client/edit.js"] = async (name) => { await define(['microcore', 'mst!/shop/client/edit', 'app/modules/notify'],
    function (mc, view, notify) {

        let data = {};

        mc.events.on("shop.product.save", (btn) => {
            let name = $('form input[name=name]').val().trim(),
                price = $('form input[name=price]').val().trim(),
                type = $('form select[name=type]')[0].value,
                status = $('form select[name=status]')[0].value,
                action = btn.dataset.action;

            if (name.length && price.length){
                mc.api.call("shop.products."+action, {
                    id: data.product.id,
                    name: name,
                    price: parseFloat(price).toFixed(2),
                    type: type,
                    status: status,
                    data: ""
                }).then((res) => {
                    btn.disabled = false;
                    if (res && ((action === "add" && !isNaN(parseInt(res))) || (action === "update" && res.id))){
                        notify("success", mc.i18n('notify.success'), mc.i18n('notify.'+action+'_successfully'));
                        mc.router.go('/shop/');
                    } else {
                        notify("error", mc.i18n('notify.error'), mc.i18n('notify.'+action+'_error'));
                    }
                });
            } else {
                btn.disabled = false;
            }
        });

        return async function (params) {
            document.title = `${mc.i18n('shop.product.edit.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('shop.product.edit.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                },
                product: {
                    id: "new"
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.inactive'), value: 'inactive' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' },
                ],
                status_change: (selected) => {
                    data.product.status = selected.value;
                },
                types: [
                    {option: 'cc', value: 'cc'},
                    {option: 'bin', value: 'bin'},
                    {option: 'leads', value: 'leads'}
                ],
                type_change: (selected) => {
                    data.product.type = selected.value;
                },
                title: mc.i18n('shop.product.edit.add')
            };

            if (params.id !== "new"){
                data.product = await mc.api.call("shop.products.get", {id: params.id});
                data.title = mc.i18n('shop.product.edit.update')
            }

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/shop/client/list.js"] = async (name) => { await define(['microcore', 'mst!/shop/client/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('shop.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('shop.title'),
                    breadcrumbs: [{url: "/", name: "Buy Individually"}],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/shop/client/handler/products.js"] = async (name) => { await define(['microcore', 'mst!shop/client/handler/product', 'app/modules/notify'],
function (mc, row_view, notify){
    let filter = {limit: 1},
        page = 1,
        def_limit = 3;

    mc.events.on('shop.filter.apply', async ($scope) => {
        let data = await mc.api.call('shop.products.list', filter);

        if (data && data.items && data.items.length) {
            $($scope).find('table > tbody').html('');
            for (let i in data.items) {
                let item = data.items[i];

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

    mc.events.on("shop.products.buy", (id) => {
        mc.api.call("shop.products.buy", {id: id}).then((res) => {
            if (res && !isNaN(parseInt(res))){
                notify("success", mc.i18n('notify.success'), mc.i18n('notify.buy_success'));
            } else {
                notify("error", mc.i18n('notify.error'), mc.i18n('notify.buy_error'));
            }
        });
    });

    return async ($scope, $params) => {
        filter = mc.router.hash();
        page = parseInt(filter.page) || 1;
        filter.limit = parseInt(filter.limit) || def_limit;
        filter.offset = (page - 1) * filter.limit;



        await mc.events.push('shop.filter.apply', $scope);
    }
}, name);};
app_cache["/app/controllers/shop/bulk/handler.js"] = async (name) => { await define(['microcore', 'mst!shop/bulk/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('shop.bulk.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.bases.search', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        mc.events.on("shop.bulk.cart.add", async (btn) => {
            mc.api.call("shop.cart.add", {id: btn.dataset.id, type: "bulk"}).then((res) => {
                if (res){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.cart_added'));
                } else {
                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.already_in_cart'));
                }
            });
        });

        mc.events.on("shop.bulk.selected.card_add", async (btn) => {
            document.querySelectorAll('table tr input[type=checkbox]:checked')
                .forEach((el, inx) => {
                    if (el.dataset.id) {
                        mc.api.call("shop.cart.add", {id: el.dataset.id, type: "bulk"}).then((res) => {
                            if (res) {
                                notify("success", mc.i18n('notify.success'), mc.i18n('notify.cart_added'));
                            }
                        });
                    }
                });
        });

        mc.events.on("shop.bulk.checkbox.all.toggle", (checkbox) => {
            document.querySelectorAll('table tr input[type=checkbox]')
                .forEach((el, inx) => {
                    el.checked = checkbox.checked
                });
        });

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            if (filter.period_s || filter.period_e) {
                try {
                    filter.created = {}
                    if (filter.period_s){
                        filter.created.start = utilities.datetimeToUnixTimestamp(filter.period_s);
                    }
                    if (filter.period_e){
                        filter.created.end = utilities.datetimeToUnixTimestamp(filter.period_e);
                    }
                    filter.period_s = undefined;
                    filter.period_e = undefined;
                } catch (e) {
                    filter.created = undefined;
                }
            }

            await mc.events.push('shop.bulk.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/shop/bulk/list.js"] = async (name) => { await define(['microcore', 'mst!/shop/bulk/list', 'app/modules/suggests'],
    function (mc, view) {
        let hash;

        mc.events.on('shop.bulk.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('shop.bulk.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('shop.bulk.filter.q.change', async (input) => {
           hash.q = input.value;
        });

        mc.events.on('shop.bulk.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('shop.bulk.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                seller_set: async (id) => {
                    let item = await mc.api.call('users.get', { id: id });
                    return {
                        option: item.nickname,
                        value: item.id,
                    };
                },
                header: {
                    title: mc.i18n('shop.title'),
                    breadcrumbs: [
                        {name: mc.i18n('shop.bulk.title'), url: "/"}
                    ],
                    actions: [
                        `<button type="button" class="button bordered" 
                            onclick="___mc.events.push('shop.bulk.selected.card_add', this)">
                            Add selected to cart
                        </button>`
                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/shop/cvv/handler.js"] = async (name) => { await define(['microcore', 'mst!shop/cvv/item', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, row_view, notify){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('shop.cvv.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.cards.search', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        mc.events.on("shop.cvv.cart.add", async (btn) => {
            mc.api.call("shop.cart.add", {id: btn.dataset.id, type: "cvv"}).then((res) => {
                if (res){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.cart_added'));
                } else {
                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.already_in_cart'));
                }
            });
        });

        mc.events.on("shop.cvv.selected.card_add", async (btn) => {
            document.querySelectorAll('table tr input[type=checkbox]:checked')
                .forEach((el, inx) => {
                    if (el.dataset.id) {
                        mc.api.call("shop.cart.add", {id: el.dataset.id, type: "cvv"}).then((res) => {
                            if (res) {
                                notify("success", mc.i18n('notify.success'), mc.i18n('notify.cart_added'));
                            }
                        });
                    }
                });
        });

        mc.events.on("shop.cvv.checkbox.all.toggle", (checkbox) => {
            document.querySelectorAll('table tr input[type=checkbox]')
                .forEach((el, inx) => {
               el.checked = checkbox.checked
            });
        });

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            if (filter.date) {
                try {
                    let selected_date = filter.date.split('-');
                    filter.expire = {
                        month: ("0" + selected_date[1]).slice(-2),
                        year: selected_date[0].slice(-2)
                    }
                    filter.date = undefined;
                } catch (e) {
                    filter.expire = undefined;
                }
            }
            if (filter.bins){
                try{
                    filter.bin = [];
                    let selected_bins = filter.bins.split(',');
                    for (let bin of selected_bins){
                        if (!isNaN(bin)){
                            filter.bin.push(parseInt(bin));
                        }
                    }
                    if (!filter.bin.length){
                        filter.bin = undefined
                    }
                    filter.bins = undefined
                }catch (e) {
                    filter.bin = undefined
                }
            }

            await mc.events.push('shop.cvv.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/shop/cvv/list.js"] = async (name) => { await define(['microcore', 'mst!/shop/cvv/list', 'app/modules/suggests'],
    function (mc, view) {
        let hash;

        mc.events.on('shop.cvv.filter.bin.change', async (input) => {
            hash.bins = input.value || undefined;
        });

        mc.events.on('shop.cvv.filter.expire.change', async (input) => {
            hash.date = input.value || undefined;
        });

        mc.events.on('shop.cvv.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('shop.cvv.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                brand_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                type_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                category_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                country_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                base_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                seller_set: async (id) => {
                    let item = await mc.api.call('users.get', { id: id });
                    return {
                        option: item.nickname,
                        value: item.id,
                    };
                },
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                header: {
                    title: mc.i18n('shop.title'),
                    breadcrumbs: [
                        {name: mc.i18n('shop.cvv.title'), url: "/"}
                    ],
                    actions: [
                        `<button type="button" class="button bordered" 
                            onclick="___mc.events.push('shop.cvv.selected.card_add', this)">
                            Add selected to cart
                        </button>`
                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/restricted.js"] = async (name) => { await define(['microcore', 'mst!/404', 'utilities'],
    function (mc, view, utils){
      return function (params){
        document.title = `Restricted | ${require.config.env.PANEL_TITLE}`;
        return view({

        });
      }
    }, name);};
app_cache["/app/controllers/profile/index.js"] = async (name) => { await define(['microcore', 'mst!/profile/index', 'app/modules/notify'],
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
    }, name);};
app_cache["/app/controllers/profile/orders/handler.js"] = async (name) => { await define(['microcore', 'mst!profile/orders/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('orders.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.orders.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            if (filter.period_s || filter.period_e) {
                try {
                    filter.created = {}
                    if (filter.period_s){
                        filter.created.start = utilities.datetimeToUnixTimestamp(filter.period_s);
                    }
                    if (filter.period_e){
                        filter.created.end = utilities.datetimeToUnixTimestamp(filter.period_e);
                    }
                    filter.period_s = undefined;
                    filter.period_e = undefined;
                } catch (e) {
                    filter.created = undefined;
                }
            }

            await mc.events.push('orders.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/profile/orders/list.js"] = async (name) => { await define(['microcore', 'mst!/profile/orders/list', '/app/modules/confirm', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('orders.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('orders.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('orders.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('orders.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                types: [
                    { option: 'cc', value: 'cc' },
                    { option: 'bin', value: 'bin' },
                    { option: 'leads', value: 'leads'}
                ],
                type_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                type_suggest: async (selected) => {
                    return data.types;
                },
                statuses: [
                    { option: mc.i18n('statuses.new'), value: 'new' },
                    { option: mc.i18n('statuses.canceled'), value: 'canceled' },
                    { option: mc.i18n('statuses.payed'), value: 'payed' }
                ],
                status_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                status_suggest: async (selected) => {
                    return data.statuses;
                },
                header: {
                    title: mc.i18n('profile.title'),
                    breadcrumbs: [
                        {name: mc.i18n('orders.title'), url: "/"}
                    ],
                    actions: [

                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/profile/password.js"] = async (name) => { await define(['microcore', 'mst!/profile/password', 'app/modules/notify'],
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
    }, name);};
app_cache["/app/controllers/profile/deposit/handler.js"] = async (name) => { await define(['microcore', 'mst!profile/deposit/item', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, row_view, notify){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('deposit.filter.apply', async ($scope) => {
            let data = await mc.api.call('transactions.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            await mc.events.push('deposit.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/profile/deposit/index.js"] = async (name) => { await define(['microcore', 'mst!/profile/deposit/index', 'qrcode', 'app/modules/notify'],
    function (mc, view, QRCode, notify) {
        function generateQrCode(qrContent) {
            return new QRCode("qr-code", {
                text: qrContent,
                width: 128,
                height: 128,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H,
            });
        }

        mc.events.on('deposit.address.show', async (btn) => {
            btn.classList.add('hide');
            document.querySelector("#address-container").classList.remove('hide');

            let address = await mc.api.call("users.deposit");
            if (address) {
                generateQrCode(address);
                document.querySelector("#btc-address").innerHTML = address;
            } else {
                document.querySelector("#btc-address").innerHTML = "";
                notify("error", mc.i18n('notify.error'), mc.i18n('notify.operation_error'));
            }
        });

        mc.events.on('deposit.address.copy', async () => {
            navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
                if (result.state === "granted" || result.state === "prompt") {
                    navigator.clipboard.writeText(document.querySelector("#btc-address").innerHTML)
                    .then(
                        () => {
                            notify("success", mc.i18n('notify.success'), mc.i18n('notify.clipboard_success'));
                        },
                        () => {
                            notify("error", mc.i18n('notify.error'), mc.i18n('notify.clipboard_error'));
                        }
                    );
                }
            });
        });

        return async function (params) {
            document.title = `${mc.i18n('deposit.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('profile.title'),
                    breadcrumbs: [{url: "/", name: mc.i18n('deposit.title')}],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/profile/referral/handler.js"] = async (name) => { await define(['microcore', 'mst!profile/referral/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('referrals.filter.apply', async ($scope) => {
            let data = await mc.api.call('users.referrals.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            if (filter.period_s || filter.period_e) {
                try {
                    filter.created = {}
                    if (filter.period_s){
                        filter.created.start = utilities.datetimeToUnixTimestamp(filter.period_s);
                    }
                    if (filter.period_e){
                        filter.created.end = utilities.datetimeToUnixTimestamp(filter.period_e);
                    }
                    filter.period_s = undefined;
                    filter.period_e = undefined;
                } catch (e) {
                    filter.created = undefined;
                }
            }

            await mc.events.push('referrals.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/profile/referral/list.js"] = async (name) => { await define(['microcore', 'mst!/profile/referral/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('profile.menu.referral')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('profile.title'),
                    breadcrumbs: [
                        {name: mc.i18n('profile.menu.referral'), url: "/"}
                    ],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/profile/telegram.js"] = async (name) => { await define(['microcore', 'mst!/profile/telegram'],
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
    }, name);};
app_cache["/app/controllers/faq/list.js"] = async (name) => { await define(['microcore', 'mst!/faq/list'],
    function (mc, view) {
    return async function (params) {
        document.title = `${mc.i18n('faq.title')} | ${require.config.env.PANEL_TITLE}`;

        let data = {
            profile: await mc.api.call("users.me"),
            faq: await mc.api.call("faq.list", {language: localStorage.getItem('lang')}),
            header: {
                title: mc.i18n('faq.title'),
                breadcrumbs: [],
                actions: [],
                notes: [],
                counters: []
            }
        };

        return view(data);
    }
}, name);};
app_cache["/app/controllers/support/handler.js"] = async (name) => { await define(['microcore', 'mst!support/row', 'mst!support/item', 'app/modules/notify', '/app/modules/confirm'],
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
}, name);};
app_cache["/app/controllers/support/index.js"] = async (name) => { await define(['microcore', 'mst!/support/index', 'app/modules/notify'],
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
    }, name);};
app_cache["/app/controllers/login/register.js"] = async (name) => { await define(['microcore', 'mst!/login/register'],
    function (mc, view) {

  let v = 1;
  mc.events.on("auth.register.captcha", async (btn) => {
    let captcha = await mc.api.call("auth.captcha", {});
    if (captcha){
      btn.innerHTML = `<img src="${captcha}">`;
      btn.style.padding = '4px';
    }
  });

  mc.events.on('auth.register', () => {
    let nickname = $('input[name=nickname]').val(),
        name = $('input[name=name]').val(),
        password = $('input[name=password]').val(),
        password_confirm = $('input[name=password_confirm]').val(),
        captcha = $('input[name=captcha]').val();

    if (password !== password_confirm){
      $('input[name=password_confirm]').val('');
      return;
    }

    let pattern = /^[A-Za-z0-9_]+$/;
    if (!pattern.test(nickname)){
      $('input[name=nickname]').val('');
      return;
    }

    let tz = Math.ceil((new Date().getTimezoneOffset())/-60);

    mc.api.call('auth.register', {
        nickname: nickname,
        password: password,
        captcha: captcha,
        name: name,
        time_zone: tz
      }).then((res) => {
        if (res) {
          mc.router.go('/');
        } else {
          $('input[name=captcha]').val('');
          $("#captcha")[0].click();
        }
      });
  });

      mc.events.on('sys:page.init:login/register', () => {
        document.getElementById("captcha").click();
      });

  return function (params) {
    document.title = `${mc.i18n('login.registration.title')} | ${require.config.env.PANEL_TITLE}`;

    return view();
  };
}, name);};
app_cache["/app/controllers/login/auth.js"] = async (name) => { await define(['microcore', 'mst!/login/auth'],
    function (mc, view) {

  let is_2fa, token2fa = false, v = 1;
  mc.events.on("auth.login.captcha", async (btn) => {
    let captcha = await mc.api.call("auth.captcha", {});
    if (captcha){
      btn.innerHTML = `<img src="${captcha}">`;
      btn.style.padding = '4px';
    }
  });

  mc.events.on('auth.login', () => {
    let nickname = $('input[name=nickname]').val(),
        password = $('input[name=password]').val(),
        captcha = $('input[name=captcha]').val();
    if (is_2fa){
      let code = $('input[name=code]').val();
      mc.api.call("auth.verify2fa", {code: code, token2fa: token2fa}).then((res) => {
        if (res && res.token2fa){
          mc.api.call("auth.login2fa", {token2fa: res.token2fa}).then((res) => {
            if (res){
              mc.router.go('/');
            } else {
              mc.router.go('/login');
            }
          });
        } else {
          $('input[name=code]').val('');
        }
      });
    } else {
      mc.api.call('auth.login', {
        nickname: nickname,
        password: password,
        captcha: captcha
      }).then((res) => {
        if (res) {
          if (res.method && res.token2fa){
            $('#twofa').closest('.row')[0].style.display = "initial";
            is_2fa = true;
            token2fa = res.token2fa;
          } else {
            mc.router.go('/');
          }
        } else {
          $('input[name=captcha]').val('');
          $("#captcha")[0].click();
        }
      });
    }
  });

      mc.events.on('sys:page.init:login/auth', () => {
        document.getElementById("captcha").click();
      });

  return function (params) {
    document.title = `${mc.i18n('login.auth.title')} | ${require.config.env.PANEL_TITLE}`;

    return view({

    });
  };
}, name);};
app_cache["/app/controllers/login/forgot.js"] = async (name) => { await define(['microcore', 'mst!/login/forgot'], function (mc, view) {
  mc.events.on('login.restore', () => {
    let email = $('#login input[name="email"]').val();
    if (email.length && email.indexOf('@') > 0) {
      mc.api
        .call('auth.restore', {
          email: email,
        })
        .then((res) => {
          if (res) {
            $('#restore-container')
              .html(`<p>${mc.i18n('forgot.text')}</p>
                    <br><a href="/login">${mc.i18n('forgot.auth')}</a><br>`);
          } else {
            $('header .error').removeClass('invisible');
            setTimeout(() => {
              $('header .error').addClass('invisible');
            }, 3000);
          }
        });
    }
  });

  return function (params) {
    document.title = `${mc.i18n('forgot.title')} | ${
      require.config.panelTitle
    }`;
    return view({
      year: new Date().getFullYear(),
      supportEmail: require.config.supportEmail,
      panelTitle: require.config.panelTitle,
    });
  };
}, name);};
app_cache["/app/controllers/404.js"] = async (name) => { await define(['microcore', 'mst!/404', 'utilities'],
    function (mc, view, utils){
      return function (params){
        document.title = `404 | ${require.config.env.PANEL_TITLE}`;
        return view({

        });
      }
    }, name);};
app_cache["/app/controllers/admin/withdrawalcvv/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/withdrawalcvv/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('withdrawalcvv.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('withdrawalcvv.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/sales/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/sales/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('sales.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('sales.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/users_/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/users_/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('users.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('users.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/bases/handler.js"] = async (name) => { await define(['microcore', 'mst!admin/bases/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1, type: "bulk"},
            page = 1,
            def_limit = 10;

        mc.events.on('admin.bases.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.bases.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            if (filter.period_s || filter.period_e) {
                try {
                    filter.created = {}
                    if (filter.period_s){
                        filter.created.start = utilities.datetimeToUnixTimestamp(filter.period_s);
                    }
                    if (filter.period_e){
                        filter.created.end = utilities.datetimeToUnixTimestamp(filter.period_e);
                    }
                    filter.period_s = undefined;
                    filter.period_e = undefined;
                } catch (e) {
                    filter.created = undefined;
                }
            }

            await mc.events.push('admin.bases.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/admin/bases/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/bases/list', '/app/modules/confirm', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('admin.bases.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('admin.bases.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('admin.bases.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('bases.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                types: [
                    { option: 'cvv', value: 'cvv' },
                    { option: 'bulk', value: 'bulk' }
                ],
                type_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                type_suggest: async (selected) => {
                    return data.types;
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' }
                ],
                status_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                status_suggest: async (selected) => {
                    return data.statuses;
                },
                seller_set: async (id) => {
                    let item = await mc.api.call('users.get', { id: id });
                    return {
                        option: item.nickname,
                        value: item.id,
                    };
                },
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [],
                    actions: [

                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/bases/cards/handler.js"] = async (name) => { await define(['microcore', 'mst!admin/bases/cards/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1, base_id: 0},
            page = 1,
            def_limit = 10;

        mc.events.on('admin.bases.cards.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.cards.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;
            filter.base_id = $params.baseId;

            await mc.events.push('admin.bases.cards.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/admin/bases/cards/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/bases/cards/list', 'app/modules/suggests', '/app/modules/confirm', 'app/modules/notify'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('admin.bases.cards.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('cards.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                statuses: [
                    { option: mc.i18n('statuses.live'), value: 'live' },
                    { option: mc.i18n('statuses.pending'), value: 'pending' },
                    { option: mc.i18n('statuses.sold'), value: 'sold' },
                    { option: mc.i18n('statuses.declined'), value: 'declined' },
                    { option: mc.i18n('statuses.refunded'), value: 'refunded' },
                ],
                status_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                status_suggest: async (selected) => {
                    return data.statuses;
                },
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [
                        {name: mc.i18n('cards.title'), url: "/"}
                    ],
                    actions: [

                    ],
                    notes: [],
                    counters: []
                }
            };

            data.filter.base_id = params.base_id;
            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/users/edit.js"] = async (name) => { await define(['microcore', 'mst!/admin/users/edit', 'app/modules/notify'],
    function (mc, view, notify) {

        let data = {};

        mc.events.on("admin.user.save", (btn) => {
            let action = btn.dataset.action;
            data.user.nickname = $('form input[name=nickname]').val().trim();
            data.user.name = $('form input[name=name]').val().trim();
            data.user.settings.time_zone = parseInt($('form input[name=timezone]').val().trim());

            mc.api.call("users."+action, data.user).then((res) => {
                btn.disabled = false;
                if (res && ((action === "add" && !isNaN(parseInt(res))) || (action === "update" && res))){
                    notify("success", mc.i18n('notify.success'), mc.i18n('notify.'+action+'_successfully'));
                    if (action === "add") {
                        mc.router.go('/admin/users/');
                    } else {
                        mc.router.go('/admin/users/edit/'+data.user.id);
                    }
                } else {
                    notify("error", mc.i18n('notify.error'), mc.i18n('notify.'+action+'_error'));
                }
            });
        });

        mc.events.on('sys:page.init:admin/users/edit', () => {

        });

        return async function (params) {
            document.title = `${mc.i18n('users.title')} | ${require.config.env.PANEL_TITLE}`;

            data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('users.title'),
                    breadcrumbs: [
                        {name: mc.i18n('users.edit.caption'), url: "/"}
                    ],
                    actions: [],
                    notes: [],
                    counters: []
                },
                user: {
                    id: "new",
                    status: "active",
                    role: "client",
                    settings: {
                        two_factor: false,
                        time_zone: 0
                    }
                },
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.blocked'), value: 'blocked' },
                ],
                user_status_change: (selected) => {
                    data.user.status = selected.value;
                },
                user_status_suggest: (val) => {
                    return data.statuses;
                },
                roles: [
                    {option: 'admin', value: 'admin'},
                    {option: 'support', value: 'support'},
                    {option: 'client', value: 'client'},
                    {option: 'seller', value: 'seller'}
                ],
                user_role_change: (selected) => {
                    data.user.role = selected.value;
                },
                user_role_suggest: (val) => {
                    return data.roles;
                },
                title: mc.i18n('users.edit.add'),
            };

            if (params.id !== "new"){
                data.user = await mc.api.call("users.get", {id: params.id});
                delete data.user.password;
                delete data.user.password_last_change;
                delete data.user.created;
                delete data.user.updated;
                delete data.user.api_key;
                delete data.user.two_factor_key;
                delete data.user.balance;
                data.title = mc.i18n('users.edit.update')
            }

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/users/handler.js"] = async (name) => { await define(['microcore', 'mst!admin/users/item', 'app/modules/notify', 'utilities'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('admin.users.filter.apply', async ($scope) => {
            let data = await mc.api.call('users.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            if (filter.period_s || filter.period_e) {
                try {
                    filter.created = {}
                    if (filter.period_s){
                        filter.created.start = utilities.datetimeToUnixTimestamp(filter.period_s);
                    }
                    if (filter.period_e){
                        filter.created.end = utilities.datetimeToUnixTimestamp(filter.period_e);
                    }
                    filter.period_s = undefined;
                    filter.period_e = undefined;
                } catch (e) {
                    filter.created = undefined;
                }
            }

            await mc.events.push('admin.users.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/admin/users/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/users/list', '/app/modules/confirm', 'app/modules/notify'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on("admin.users.seller.set", async (entity) => {
            confirm(`${mc.i18n('actions.make_seller')}?`, decodeURIComponent(entity.name), () => {
                mc.api.call('users.update', {
                    id: parseInt(entity.id),
                    role: "seller"
                }).then((res) => {
                    if (res) {
                        notify("success", mc.i18n('notify.seller_successfully'));
                        mc.router.go(location.pathname);
                    } else {
                        notify("error", mc.i18n('notify.seller_error'));
                    }
                });
            });
        });

        mc.events.on('admin.users.archive', async (entity) => {
            confirm(`${mc.i18n('actions.archive')}?`, entity.name, () => {
                mc.api.call('users.update', {
                    id: parseInt(entity.id),
                    status: "blocked"
                }).then((res) => {
                    if (res) {
                        notify("success", mc.i18n('notify.archive_successfully'));
                        mc.router.go(location.pathname);
                    } else {
                        notify("error", mc.i18n('notify.archive_error'));
                    }
                });
            });
        });

        mc.events.on('admin.users.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('admin.users.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('admin.users.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {
            document.title = `${mc.i18n('users.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                roles: [
                    { option: 'admin', value: 'admin' },
                    { option: 'support', value: 'support' },
                    { option: 'client', value: 'client' },
                    { option: 'seller', value: 'seller' }
                ],
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.blocked'), value: 'blocked' }
                ],
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                header: {
                    title: mc.i18n('users.title'),
                    breadcrumbs: [],
                    actions: [

                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/deposits/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/deposits/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('deposits.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('deposits.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/orders/handler.js"] = async (name) => { await define(['microcore', 'mst!admin/orders/item', 'app/modules/notify', 'utilities', 'app/modules/suggests'],
    function (mc, row_view, notify, utilities){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('admin.orders.filter.apply', async ($scope) => {
            let data = await mc.api.call('shop.orders.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;

            if (filter.period_s || filter.period_e) {
                try {
                    filter.created = {}
                    if (filter.period_s){
                        filter.created.start = utilities.datetimeToUnixTimestamp(filter.period_s);
                    }
                    if (filter.period_e){
                        filter.created.end = utilities.datetimeToUnixTimestamp(filter.period_e);
                    }
                    filter.period_s = undefined;
                    filter.period_e = undefined;
                } catch (e) {
                    filter.created = undefined;
                }
            }

            await mc.events.push('admin.orders.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/admin/orders/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/orders/list', '/app/modules/confirm', 'app/modules/notify', 'app/modules/suggests'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('admin.orders.filter.created.start.change', async (input) => {
            hash.period_s = input.value || undefined;
        });
        mc.events.on('admin.orders.filter.created.end.change', async (input) => {
            hash.period_e = input.value || undefined;
        });

        mc.events.on('admin.orders.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        return async function (params) {

            document.title = `${mc.i18n('orders.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                types: [
                    { option: 'cc', value: 'cc' },
                    { option: 'bin', value: 'bin' },
                    { option: 'leads', value: 'leads'}
                ],
                type_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                type_suggest: async (selected) => {
                    return data.types;
                },
                statuses: [
                    { option: mc.i18n('statuses.new'), value: 'new' },
                    { option: mc.i18n('statuses.canceled'), value: 'canceled' },
                    { option: mc.i18n('statuses.payed'), value: 'payed' }
                ],
                status_set: async (id) => {
                    return {
                        option: id,
                        value: id,
                    };
                },
                status_suggest: async (selected) => {
                    return data.statuses;
                },
                user_set: async (id) => {
                    let item = await mc.api.call('users.get', { id: id });
                    return {
                        option: item.nickname,
                        value: item.id,
                    };
                },
                header: {
                    title: mc.i18n('orders.title'),
                    breadcrumbs: [],
                    actions: [

                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/bases_/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/bases/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('bases.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('bases.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/overview/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/overview/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('overview.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('overview.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/faq/edit.js"] = async (name) => { await define(['microcore', 'mst!/admin/faq/edit', 'app/modules/notify'],
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
    }, name);};
app_cache["/app/controllers/admin/faq/handler.js"] = async (name) => { await define(['microcore', 'mst!admin/faq/item', 'app/modules/notify'],
    function (mc, row_view, notify){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('admin.faq.filter.apply', async ($scope) => {
            let data = await mc.api.call('faq.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;



            await mc.events.push('admin.faq.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/admin/faq/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/faq/list', '/app/modules/confirm', 'app/modules/notify'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('admin.faq.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        mc.events.on('admin.faq.archive', async (entity) => {
            confirm(`${mc.i18n('actions.archive')}?`, decodeURIComponent(entity.question), () => {
                mc.api.call('faq.update', {
                    id: parseInt(entity.id),
                    status: "archived"
                }).then((res) => {
                    if (res) {
                        notify("success", mc.i18n('notify.archive_successfully'));
                        mc.router.go(location.pathname);
                    } else {
                        notify("error", mc.i18n('notify.archive_error'));
                    }
                });
            });
        });

        return async function (params) {
            document.title = `${mc.i18n('faq.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' }
                ],
                languages: [
                    {option: "en", value: "en"}
                ],
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                header: {
                    title: mc.i18n('faq.title'),
                    breadcrumbs: [],
                    actions: [
                        `<a href="/admin/faq/edit/new">${mc.i18n('faq.create')}</a>`
                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/sellers/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/sellers/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('sellers.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('sellers.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/news/edit.js"] = async (name) => { await define(['microcore', 'ckeditor', 'mst!/admin/news/edit', 'app/modules/notify'],
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
    }, name);};
app_cache["/app/controllers/admin/news/handler.js"] = async (name) => { await define(['microcore', 'mst!admin/news/item', 'app/modules/notify'],
    function (mc, row_view, notify){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('admin.news.filter.apply', async ($scope) => {
            let data = await mc.api.call('news.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;



            await mc.events.push('admin.news.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/admin/news/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/news/list', '/app/modules/confirm', 'app/modules/notify'],
    function (mc, view, confirm, notify) {
        let hash;

        mc.events.on('admin.news.filter.filter', async ($scope) => {
            hash.page = 1;

            for (let k in hash) {
                if (hash[k] === undefined) {
                    delete hash[k];
                }
            }
            mc.router.go(mc.router.hash(hash));
        });

        mc.events.on('admin.news.archive', async (entity) => {
            confirm(`${mc.i18n('actions.archive')}?`, decodeURIComponent(entity.title), () => {
                mc.api.call('news.update', {
                    id: parseInt(entity.id),
                    status: "archived"
                }).then((res) => {
                    if (res) {
                        notify("success", mc.i18n('notify.archive_successfully'));
                        mc.router.go(location.pathname);
                    } else {
                        notify("error", mc.i18n('notify.archive_error'));
                    }
                });
            });
        });

        return async function (params) {
            document.title = `${mc.i18n('news.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                filter: mc.router.hash(),
                statuses: [
                    { option: mc.i18n('statuses.active'), value: 'active' },
                    { option: mc.i18n('statuses.archived'), value: 'archived' }
                ],
                filter_change: async (selected) => {
                    if (selected && selected.name) {
                        hash[selected.name] = selected.value || undefined;
                    }
                },
                header: {
                    title: mc.i18n('news.title'),
                    breadcrumbs: [],
                    actions: [
                        '<a href="/admin/news/edit/new">Create a news</a>'
                    ],
                    notes: [],
                    counters: []
                }
            };

            hash = data.filter;

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/user/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/user/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('user.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('user.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/withdrawal/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/withdrawal/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('withdrawal.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('withdrawal.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/admin/base/list.js"] = async (name) => { await define(['microcore', 'mst!/admin/base/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('base.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('base.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/reglement/list.js"] = async (name) => { await define(['microcore', 'mst!/reglement/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('reglement.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('reglement.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/news/handler.js"] = async (name) => { await define(['microcore', 'mst!news/item', 'app/modules/notify'],
    function (mc, row_view, notify){
        let filter = {limit: 1},
            page = 1,
            def_limit = 3;

        mc.events.on('news.filter.apply', async ($scope) => {
            let data = await mc.api.call('news.list', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('.news-list').html('');
                for (let i in data.items) {
                    let item = data.items[i];

                    $($scope).find('.news-list').append(await row_view(item));
                }
            } else {
                $($scope).find('.news-list').html(mc.i18n('table.empty'));
            }
            mc.events.push('system:pagination.update', {
                total: data && data.total ? data.total : 0,
                limit: data && data.limit ? data.limit : def_limit,
                current: page,
            });
        });

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;



            await mc.events.push('news.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/controllers/news/list.js"] = async (name) => { await define(['microcore', 'mst!/news/list'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('news.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('news.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/utilities/index.js"] = async (name) => { await define(['microcore', 'mst!/utilities/index'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('cvv.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('utilities.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/utilities/checker/bin.js"] = async (name) => { await define(['microcore', 'mst!/utilities/checker/bin', "/app/modules/notify"],
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
    }, name);};
app_cache["/app/controllers/utilities/checker/cc.js"] = async (name) => { await define(['microcore', 'mst!/utilities/checker/cc'],
    function (mc, view) {
        return async function (params) {
            document.title = `${mc.i18n('utilities.checker.cc.title')} | ${require.config.env.PANEL_TITLE}`;

            let data = {
                profile: await mc.api.call("users.me"),
                header: {
                    title: mc.i18n('utilities.checker.cc.title'),
                    breadcrumbs: [],
                    actions: [],
                    notes: [],
                    counters: []
                }
            };

            return view(data);
        }
    }, name);};
app_cache["/app/controllers/utilities/checker/bin/handler.js"] = async (name) => { await define(['microcore', 'mst!/utilities/checker/bin/item', 'app/modules/notify'],
    function (mc, item_view, notify){
        let filter = {limit: 1},
            page = 1,
            def_limit = 10;

        mc.events.on('utilities.checker.bin.filter.apply', async ($scope) => {
            let data = await mc.api.call('utils.bins.log', filter);

            if (data && data.items && data.items.length) {
                $($scope).find('table > tbody').html('');
                for (let i in data.items) {
                    let item = data.items[i];

                    $($scope).find('table > tbody').append(await item_view(item));
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

        return async ($scope, $params) => {
            filter = mc.router.hash();
            page = parseInt(filter.page) || 1;
            filter.limit = parseInt(filter.limit) || def_limit;
            filter.offset = (page - 1) * filter.limit;


            await mc.events.push('utilities.checker.bin.filter.apply', $scope);
        }
    }, name);};
app_cache["/app/filters/escape_html.js"] = async (name) => { await define(['microcore'], (mc) => {
    return (value) => {
        /*
        return value.replace(/[\u00A0-\u9999<>\&]/g, function(i) {
            return '&#'+i.charCodeAt(0)+';';
        });
         */
        return encodeURIComponent(value).replace(/'/g, "%27");
    };
}, name);};
app_cache["/app/filters/short.js"] = async (name) => { await define(['microcore'], (mc) => {
  return (value) => {
    const lookup = [
      { value: 1, symbol: '', divider: 1, prefix: '', digits: 0 },
      { value: 1e4, symbol: 'K', divider: 1e3, prefix: '~', digits: 1 },
      { value: 1e6, symbol: 'M', divider: 1e6, prefix: '~', digits: 2 },
      { value: 1e9, symbol: 'B', divider: 1e9, prefix: '~', digits: 2 },
    ];
    let item = lookup
      .slice()
      .reverse()
      .find(function (item) {
        return +value >= item.value;
      });

    return item
      ? `${item.prefix}${
          (+value / item.divider)
            .toFixed(item.digits)
            .replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + item.symbol
        }`
      : value;
  };
}, name);};
app_cache["/app/filters/count.js"] = async (name) => { await define(['microcore'], (mc) => {
    return (value) => {
        return value.length || 0;
    };
}, name);};
app_cache["/app/filters/date_period.js"] = async (name) => { await define(['utilities'], (scripts) => (value) => scripts.formatPeriod(value));
};
app_cache["/app/filters/datetime_string.js"] = async (name) => { await define(['utilities'], (scripts) => (value) => {
  //scripts.formatDateTime(value)
  let data = new Date(scripts.datetimeToUnixTimestamp(value) * 1000);
  return data.toLocaleDateString() + ' ' + data.toLocaleTimeString();
}, name);};
app_cache["/app/filters/reason.js"] = async (name) => { await define(['microcore'], (mc) => {
  return (value) => mc.i18n(`reason.${value}`) || value;
}, name);};
app_cache["/app/filters/nl2br.js"] = async (name) => { await define(['microcore'], (mc) => {
  return (value) => {
    return (value ? value : '' + '').replace(
      /([^>\r\n]?)(\r\n|\n\r|\r|\n)/g,
      '$1<br />$2'
    );
  };
}, name);};
app_cache["/app/filters/lowercase.js"] = async (name) => { await define(['microcore'], (mc) => {
  return (value) => {
    return (value ? value : '' + '').toLowerCase();
  };
}, name);};
app_cache["/app/filters/money.js"] = async (name) => { await define(['microcore'], (mc) => {
  return (value) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      //currency: 'USD',

      // These options are needed to round to whole numbers if that's what you want.
      minimumFractionDigits: 2, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
      maximumFractionDigits: 2, // (causes 2500.99 to be printed as $2,501)
    });

    //
    return formatter.format(value);
  };
}, name);};
app_cache["/app/filters/date.js"] = async (name) => { await define(['microcore'], (mc) => {
    return (value) => {
        let data = new Date(value * 1000);
        return data.toLocaleDateString();
    };
}, name);};
app_cache["/app/filters/global.js"] = async (name) => { await define(['microcore'], (mc) => {
  return (value) => {
    return mc.storage.get(value) || require.config[value] || window[value];
  };
}, name);};
app_cache["/app/filters/time.js"] = async (name) => { await define(['microcore'], (mc) => {
  return (value) => {
    return (
      Math.floor(+value / 60)
        .toString()
        .padStart(2, '0') +
      ':' +
      Math.ceil(+value % 60)
        .toString()
        .padStart(2, '0')
    );
  };
}, name);};
app_cache["/app/filters/date_string.js"] = async (name) => { await define(['utilities'], (scripts) => (value) =>
  scripts.formatDateFromDateTime(value));
};
app_cache["/app/filters/datetime.js"] = async (name) => { await define(['microcore'], (mc) => {
  return (value) => {
    let data = new Date(value * 1000);
    return data.toLocaleDateString() + ' ' + data.toLocaleTimeString();
  };
}, name);};
app_cache["/app/filters/json.js"] = async (name) => { await define(['microcore'], (mc) => {
  return (value) => {
    return JSON.stringify(value);
  };
}, name);};
app_cache["/app/modules/if.js"] = async (name) => { await define(() => {
  return (cond, value, prev_ctx) => {
    switch (true) {
      case cond.length === 1:
        if (cond[0]) {
          return value(prev_ctx);
        }
        break;

      case cond.length === 2:
        if (cond[0] == cond[1]) {
          return value(prev_ctx);
        }
        break;

      case cond.length === 3:
        try {
          if (cond[1].toUpperCase() === 'IN') {
            let arr = Array.from(cond).slice(2);
            if (arr.includes(cond[0])) {
              return value(prev_ctx);
            }
          } else if (cond[1].toUpperCase() === 'NE' || cond[1].toUpperCase() === 'EQ'){
            if (typeof cond[0] == 'string') {
              cond[0] = '"' + cond[0] + '"';
            }
            if (typeof cond[2] == 'string') {
              cond[2] = '"' + cond[2] + '"';
            }
            let operand = "!==";
            if (cond[1].toUpperCase() === 'EQ'){
              operand = "===";
            }
            if (eval(cond[0] + operand + cond[2])) {
              return value(prev_ctx);
            }
          } else {
            if (typeof cond[0] == 'string') {
              cond[0] = '"' + cond[0] + '"';
            }

            if (typeof cond[2] == 'string') {
              cond[2] = '"' + cond[2] + '"';
            }
            if (eval(cond[0] + cond[1] + cond[2])) {
              return value(prev_ctx);
            }
          }
        } catch (e) {
          console.error(e);
        }
        break;
      case cond.length > 3:
        if (cond[1].toUpperCase() === 'IN') {
          let arr = Array.from(cond).slice(2);
          if (arr.includes(cond[0])) {
            return value(prev_ctx);
          }
        }
        break;
    }
  };
}, name);};
app_cache["/app/modules/suggests.js"] = async (name) => { await define(['microcore'], function (mc) {
  async function suggest(method, params, cb) {
    let data = await mc.api.call(method, params);

    let items = [];

    if (data && data.items && data.items.length) {
      for (let i in data.items) {
        let item = data.items[i];
        if (typeof cb == 'function') {
          items.push(cb(item));
        } else {
          items.push({
            option: `${item.name} ${item.surname ? item.surname : ''} ${
              item.id ? ` [${item.id}]` : ''
            }`,
            value: item.id,
          });
        }
      }
    }

    return items;
  }

  async function suggest_array(method, params, cb) {
    let data = await mc.api.call(method, params);

    let items = [];

    if (data && data.length) {
      for (let i in data) {
        let item = data[i];
        if (typeof cb == 'function') {
          items.push(cb(item));
        } else {
          items.push({
            option: item,
            value: item,
          });
        }
      }
    }

    return items;
  }

  async function shop_cards_suggest(value, field){
    return await suggest_array('shop.cards.suggests', { q: value, field: field }, function(item) {
      return {
        option: item,
        value: item,
      };
    });
  }

  mc.events.on('admins.suggest', async (value) => {
    return await suggest(
      'users.suggest',
      { q: value, role: 'admin' },
      function (item) {
        return {
          option: item.name + ' ' + item.surname + ' [' + item.id + '] - ' + item.status,
          value: item.id,
        };
      }
    );
  });

  mc.events.on('shop.brands.suggest', async (value) => {
    return await shop_cards_suggest(value, "brand")
  });

  mc.events.on('shop.types.suggest', async (value) => {
    return await shop_cards_suggest(value, "type")
  });

  mc.events.on('shop.categories.suggest', async (value) => {
    return await shop_cards_suggest(value, "category")
  });

  mc.events.on('shop.countries.suggest', async (value) => {
    return await shop_cards_suggest(value, "country")
  });

  mc.events.on('shop.bases.suggest', async (value) => {
    return await suggest_array('shop.cards.suggests', { q: value, field: "base" }, function(item) {
      return {
        option: item.name,
        value: item.id,
      };
    });
  });

  mc.events.on('upload.bases.suggest', async (value) => {
    return await suggest('shop.bases.search', { q: value }, function (item) {
      return {
        option: item.name,
        value: item.id,
      };
    });
  });

  mc.events.on('sellers.suggest', async (value) => {
    return await suggest('shop.sellers.suggests', { q: value}, function (item) {
      return {
        option: item.nickname,
        value: item.id,
      };
    });
  });

  mc.events.on('clients_sellers.suggest', async (value) => {
    return await suggest('users.suggests', { q: value, role: ['client', 'seller'] }, function (item) {
      return {
        option: item.nickname + ' [' + item.id + '] ',
        value: item.id,
      };
    });
  });
}, name);};
app_cache["/app/modules/filter_autocomplete.js"] = async (name) => { await define([
  'microcore',
  'mst!layouts/components/filter_autocomplete',
  'app/modules/chip',
  'utilities',
  'app/modules/suggests',
], function (mc, filter_view, chipComponent, scripts) {
  return async (params) => {
    let data = params;

    data.id = 'filter_autocomplete_' + Math.round(Math.random() * 1000000);

    data.disabled = scripts.isTrue(data.disabled);
    data.multiple = scripts.isFalse(data.multiple);
    data.int = scripts.isTrue(data.int);
    data.filter = scripts.isFalse(data.filter);
    data.chip = scripts.isFalse(data.chip);
    data.full_data = scripts.isTrue(data.full_data);
    data.item_object =
      typeof data.item_object == 'function'
        ? data.item_object
        : (item) => ({ value: item.id, option: item.name });

    data.autocomplete = scripts.isFalse(data.autocomplete);

    data.filterSelector = data.filterSelector || '.filter-chips-line';

    if (data.value && typeof data.value != 'object') {
      data.value = [data.value];
    } else {
      data.value = data.value || [];
    }

    data.option = [];
    data.selected_object = [];
    let options = [];

    if (data.placeholder) {
      data.placeholder = mc.i18n(data.placeholder) || data.placeholder;
    } else {
      data.placeholder = '';
    }

    let wait_load = setInterval(async () => {
      const $filter_autocomplete = $('#' + data.id);
      if ($filter_autocomplete.length) {
        clearInterval(wait_load);

        $filter_autocomplete[0].actions = {
          select,
        };

        const $filter_input = $filter_autocomplete.find('input')[0];
        const $chips_wrapper = $filter_autocomplete.find(
          `.filter_autocomplete_tags`
        );

        $filter_input.dataset.value = data.value;

        let debounce_timer = null;

        const renderValue = () => {
          if (data.value.length) {
            data.value.forEach(async (value) => {
              let selected = '';

              if (typeof data.onset == 'function') {
                selected = await data.onset(value);
              } else if (typeof data.onset == 'string') {
                selected = mc.events.push(data.onset, value);
              } else if (data.items?.length) {
                selected = data.items.find((item) => item.value == value);
              }

              if (selected) {
                renderChips(selected);
              }
            });
          }
        };

        if (data.autocomplete) {
          renderValue();
          search('');
        } else {
          data.value.forEach((item) => {
            renderChips({
              value: item,
              option: item,
            });
          });
        }

        $filter_autocomplete.find('label').on('click', () => {
          $filter_input.focus();
        });

        $filter_autocomplete
          .find('.filter_autocomplete_input')
          .on('click', (event) => {
            if (event.target.nodeName !== 'SPAN') {
              $filter_input.focus();
            } else {
              const { value, option } = event.target.parentElement.dataset;
              select({ value, option, renderChip: false });
            }
          });

        $filter_autocomplete
          .find('input')
          .on('focus', () => {
            if (data.autocomplete) {
              $filter_autocomplete.addClass('open');
            }
          })
          .on('blur', () => {
            setTimeout(() => {
              if (data.autocomplete) {
                $filter_autocomplete.removeClass('open');
                $filter_input.value = '';
              }
            }, 300);
          })
          .on('keyup', function (event) {
            const value = $filter_input.value.trim();
            if (data.autocomplete) {
              search(value);
            } else {
              if (event.key === 'Enter') {
                if (value && !data.value.includes(value)) {
                  select({ value, option: value });
                }
              }
            }
          });

        function search(value) {
          let min_length = data.min != null ? data.min : 0;

          if (value.length >= min_length) {
            clearTimeout(debounce_timer);
            debounce_timer = setTimeout(async () => {
              options = data.items || [];

              if (data.onsuggest) {
                if (typeof data.onsuggest == 'function') {
                  options = await data.onsuggest(value);
                } else if (typeof data.onsuggest == 'string') {
                  options = await mc.events.push(data.onsuggest, value);
                }
              }

              if (data.full_data) {
                options = options.map((item) => ({
                  ...data.item_object(item),
                  item,
                }));
              }

              if (data.searchfunction) {
                options = data.searchfunction(options, value);
              }

              const $filter_autocomplete_options =
                $filter_autocomplete.find('.options');

              $filter_autocomplete_options.html('');

              if (options.length) {
                options.forEach((item) => {
                  item.option =
                    typeof item.option == 'string'
                      ? item.option.replaceAll('"', "'")
                      : item.option;
                  item.value =
                    typeof item.value == 'string'
                      ? item.value.replaceAll('"', "'")
                      : item.value;
                  const isSelected = !!data.value.find(
                    (val) => val == item.value
                  );
                  $filter_autocomplete_options.append(
                    `
                                        <li 
                                          data-value="${item.value}"
                                          data-option="${item.option}"
                                          ${
                                            isSelected
                                              ? ' class="selected"'
                                              : ''
                                          }
                                        >
                                          <div class='filter_autocomplete_checkbox'></div>
                                          <div>${item.option}</div>
                                        </li>
                                        `
                  );
                });

                $filter_autocomplete_options
                  .find('li')
                  .on('click', function () {
                    const element = $(this)[0];
                    if (
                      element.nodeName === 'LI' &&
                      !$(element).hasClass('empty')
                    ) {
                      const { value, option } = element.dataset;
                      select({ value, option });
                    }
                  });
              } else {
                $filter_autocomplete_options.append(
                  `<li class="empty">${mc.i18n('table.empty')}</li>`
                );
              }
            }, data.debounce || 300);
          }
        }

        function select({ value, option = '', renderChip = true }) {
          const listElement = $filter_autocomplete.find(
            `li[data-value="${value}"]`
          );
          const isSelected = data.value.find((item) => item == value);

          if (data.multiple) {
            if (isSelected) {
              if (listElement) {
                listElement.removeClass('selected');
              }
              data.value = data.value.filter((item) => item != value);
              data.option = data.option.filter((item) => item != option);
              data.selected_object = data.selected_object.filter(
                (item) => item.value != value
              );
            } else {
              data.value.push(value);
              data.option.push(option);
              data.selected_object.push(
                options.find((item) => item.value == value)
              );
              if (listElement) {
                listElement.addClass('selected');
              }
            }
          } else {
            $filter_autocomplete.find('li').removeClass('selected');
            if (isSelected) {
              data.value = [];
              data.option = [];
              data.selected_object = [];
            } else {
              data.value = [value];
              data.option = [option];
              data.selected_object = [
                options.find((item) => item.value == value),
              ];
              if (listElement) {
                listElement.addClass('selected');
              }
            }
          }

          if (renderChip) {
            renderChips({ value, option });
          }

          if ($filter_input.value) {
            $filter_input.value = '';
            search('');
          }

          $filter_input.dataset.value = data.value;

          const onchangeData = { ...data };
          if (!data.multiple) {
            onchangeData.value =
              data.int && data.value[0]
                ? parseInt(data.value[0])
                : data.value[0];
            onchangeData.option = data.option[0];
          } else {
            onchangeData.value = onchangeData.value.map((v) =>
              data.int ? parseInt(v) : v
            );
          }

          if (typeof data.onchange == 'function') {
            data.onchange(onchangeData);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, onchangeData);
          }
        }

        async function renderChips({ value, option }) {
          const {
            id: filterId,
            multiple,
            filter,
            filterSelector,
            disabled,
          } = data;
          const notActive = !$chips_wrapper.find(`[data-value="${value}"]`)
            .length;
          if (notActive) {
            if (!multiple) {
              if (filter) {
                $(filterSelector)
                  .find(`[data-filter-id="${filterId}"]`)
                  .remove();
              }
              $chips_wrapper.html('');
            }
            if (data.chip) {
              const chip = await chipComponent({
                value,
                option,
                filterId,
                isCloseble: !disabled,
              });
              $chips_wrapper.append(chip);
              if (filter) {
                if ($(filterSelector).length) {
                  $(filterSelector).append(chip);
                }
              }
            }
          } else {
            $(`[data-filter-id="${filterId}"][data-value="${value}"]`).remove();
          }
        }

        mc.events.on(
          'filter_autocomplite.chip.close',
          function ({ value, filterId }) {
            if (filterId == data.id && data.value.includes(value)) {
              select({ value, renderChip: false });
            }
          }
        );
      }
    }, 300);

    return await filter_view(data);
  };
}, name);};
app_cache["/app/modules/loader.js"] = async (name) => { await define(['mst!layouts/components/loader'], (loaderView) => () => loaderView());
};
app_cache["/app/modules/autocomplete.js"] = async (name) => { await define([
  'microcore',
  'mst!layouts/components/autocomplete',
  'app/modules/suggests',
], function (mc, autocomplete_view) {
  return async (params) => {
    let data = params;
    data.id = 'autocomplete_' + Math.round(Math.random() * 1000000);

    let wait_load = setInterval(async () => {
      let $autocomplete = $('#' + data.id);
      if ($autocomplete.length) {
        clearInterval(wait_load);
        let debounce_timer = null;

        function update(value) {
          let min_length = data.min != null ? data.min : 3;

          if (value.length >= min_length) {
            clearTimeout(debounce_timer);
            debounce_timer = setTimeout(async () => {
              if (value != data.option) {
                delete data.value;
              }

              let options = [];
              if (typeof data.onsuggest == 'function') {
                options = await data.onsuggest(value);
              } else if (typeof data.onsuggest == 'string') {
                options = await mc.events.push(data.onsuggest, value);
              } else if (data.items?.length) {
                  for (let i in data.items) {
                      let item = data.items[i];
                      if (item.option && item.value){
                          options.push(item);
                      }
                  }
              }

              $autocomplete.find('.options').html('');

              if (options.length) {
                for (let i in options) {
                  let item = options[i];
                  $autocomplete
                    .find('.options')
                    .append(
                      '<li data-value="' +
                        item.value +
                        '"' +
                        (data.value === item.value ? ' class="selected"' : '') +
                        '>' +
                        item.option +
                        '</li>'
                    );
                }
              } else {
                $autocomplete
                  .find('.options')
                  .append(`<li class="empty">${mc.i18n('table.empty')}</li>`);
              }
            }, data.debounce || 300);
          }
        }

        $autocomplete
          .find('input')
          .on('focus', () => {
            update('');
            $autocomplete.addClass('open');
          })
          .on('blur', () => {
            setTimeout(() => {
              $autocomplete.removeClass('open');
              if ($autocomplete.find('input').val() === '') {
                delete data.value;
                data.option = '';
                select();
              }
            }, 300);
          })
          .on('keyup', function () {
            update(this.value);
          });

        if (data.value) {
          if (typeof data.onset == 'function') {
            let selected = await data.onset(data.value);
            if (selected) {
              $autocomplete.find('input').val(selected.option);
              $autocomplete.find('input')[0].dataset.value = selected.value;
              $autocomplete.find('.options').html('');
              $autocomplete
                .find('.options')
                .append(
                  '<li data-value="' +
                    selected.value +
                    '" class="selected">' +
                    selected.option +
                    '</li>'
                );
            }
          } else if (typeof data.onset == 'string') {
            mc.events.push(data.onset, data.value);
          }
        } else {
          update('');
        }

        function select(selected) {
          $autocomplete.find('input').val(data.option);
          if (data.value) {
            $autocomplete.find('input')[0].dataset.value = data.value;
          } else {
            delete $autocomplete.find('input')[0].dataset.value;
          }

          $autocomplete.find('.options li').removeClass('selected');
          if (selected) {
            $(selected).addClass('selected');
          }

          if (typeof data.onchange == 'function') {
            data.onchange(data);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, data);
          }
        }

        $autocomplete.find('.options').on('click', (e) => {
          if (e.target.nodeName === 'LI' && !$(e.target).hasClass('empty')) {
            data.option = e.target.innerText;
            data.value = e.target.dataset.value;
            select(e.target);
          }
        });

        $autocomplete.find('.mdi-close.clear').on('click', (e) => {
          delete data.value;
          data.option = '';
          select();
          update('');
        });
      }
    }, 300);

    return await autocomplete_view(data);
  };
}, name);};
app_cache["/app/modules/dateplugin.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/dateplugin', 'utilities'], function (
  mc,
  date_view,
  scripts
) {
  let dayjs, $calendar, _type;

  const getRange = (first, second) =>
    `${first.format('YYYY-MM-DD')} - ${second.format('YYYY-MM-DD')}`;

  let months = [
      { name: mc.i18n('calendar.months.january'), days: 31 },
      { name: mc.i18n('calendar.months.february'), days: 28 },
      { name: mc.i18n('calendar.months.march'), days: 31 },
      { name: mc.i18n('calendar.months.april'), days: 30 },
      { name: mc.i18n('calendar.months.may'), days: 31 },
      { name: mc.i18n('calendar.months.june'), days: 30 },
      { name: mc.i18n('calendar.months.july'), days: 31 },
      { name: mc.i18n('calendar.months.august'), days: 31 },
      { name: mc.i18n('calendar.months.september'), days: 30 },
      { name: mc.i18n('calendar.months.october'), days: 31 },
      { name: mc.i18n('calendar.months.november'), days: 30 },
      { name: mc.i18n('calendar.months.december'), days: 31 },
    ],
    global_data = { d1: false, d2: false };

  function leapYear(year) {
    return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
  }

  function getDateData(id) {
    let data = {
      current: global_data.d2,
      start: global_data.d1,
      end: global_data.d2,
    };

    if (global_data.d1.getTime() > global_data.d2.getTime()) {
      data = {
        ...data,
        start: global_data.d2,
        end: global_data.d1,
      };
    }
    data.start.setHours(0, 0, 0);
    data.end.setHours(23, 59, 59);

    $(`#${id}`)[0].period = data;

    return data;
  }

  async function update(date, id) {
    let data = {
      id: id,
      years: [],
      months: [],
      days: [],
      period: {
        start: false,
        end: false,
      },
      type: _type
    };

    if (date instanceof Date) {
      let year = date.getFullYear();
      let month = date.getMonth();
      let day = date.getDate();

      for (let i = year - 1; i <= year + 1; i++) {
        data.years.push({ year: i, selected: i === year });
      }
      for (let i = month - 1; i <= month + 1; i++) {
        if (i < 0) {
          data.months.push({
            ordinal: 12 + i,
            month: months[12 + i].name,
            selected: i === month,
          });
        } else if (i > 11) {
          data.months.push({
            ordinal: i - 12,
            month: months[i - 12].name,
            selected: i === month,
          });
        } else {
          data.months.push({
            ordinal: i,
            month: months[i].name,
            selected: i === month,
          });
        }
      }

      let start_date = new Date();
      start_date.setFullYear(year);
      start_date.setMonth(month);
      start_date.setDate(1);
      let shift = start_date.getDay() - 1;

      if (shift < 0) {
        shift = 6;
      }

      if (month === 1 && leapYear(year)) {
        months[month].days = 29;
      } else if (month === 1) {
        months[month].days = 28;
      }

      for (let i = 1; i <= months[month].days + shift; i++) {
        if (i > shift) {
          data.days.push({ day: i - shift, selected: i - shift === day });
        } else {
          data.days.push({});
        }
      }

      $('#' + data.id).html($(await date_view(data))[0].firstChild.innerHTML);

      let button = $('#' + data.id)
          .closest('.datetimepicker-inner')
          .find('button'),
        month_num = Number(month) + 1;
      $(button)[0].dataset.year = year;
      $(button)[0].dataset.month = month_num < 10 ? '0' + month_num : month_num;
      $(button)[0].dataset.day = day < 10 ? '0' + day : day;
    } else if (typeof date === 'object') {
      const start = date.start;
      const end = date.end;
      const current = date.current;
      const year = current.getFullYear();
      const month = current.getMonth();
      for (let i = year - 1; i <= year + 1; i++) {
        data.years.push({ year: i, selected: i === year });
      }
      for (let i = month - 1; i <= month + 1; i++) {
        if (i < 0) {
          data.months.push({
            ordinal: 12 + i,
            month: months[12 + i].name,
            selected: i === month,
          });
        } else if (i > 11) {
          data.months.push({
            ordinal: i - 12,
            month: months[i - 12].name,
            selected: i === month,
          });
        } else {
          data.months.push({
            ordinal: i,
            month: months[i].name,
            selected: i === month,
          });
        }
      }

      let start_date = new Date();
      start_date.setFullYear(year);
      start_date.setMonth(month);
      start_date.setDate(1);
      let shift = start_date.getDay() - 1;

      if (shift < 0) {
        shift = 6;
      }

      if (month === 1 && leapYear(year)) {
        months[month].days = 29;
      } else if (month === 1) {
        months[month].days = 28;
      }

      for (let i = 1; i <= months[month].days + shift; i++) {
        if (i > shift) {
          let s = false;
          if (year >= start.getFullYear() && year <= end.getFullYear()) {
            if (month > start.getMonth() && month < end.getMonth()) {
              s = true;
            } else if (month === start.getMonth() && month !== end.getMonth()) {
              s = i - shift >= start.getDate();
            } else if (month === end.getMonth() && month !== start.getMonth()) {
              s = i - shift <= end.getDate();
            } else if (month === end.getMonth() && month === start.getMonth()) {
              if (year === start.getFullYear() && year === end.getFullYear()) {
                s = i - shift >= start.getDate() && i - shift <= end.getDate();
              } else if (
                year === start.getFullYear() &&
                year !== end.getFullYear()
              ) {
                s = i - shift >= start.getDate();
              } else if (
                year === end.getFullYear() &&
                year !== start.getFullYear()
              ) {
                s = i - shift <= end.getDate();
              }
            }
          }
          data.days.push({ day: i - shift, selected: s });
        } else {
          data.days.push({});
        }
      }

      $('#' + data.id).html($(await date_view(data))[0].firstChild.innerHTML);
    }

    dayjs.currentRangeDate = getRange(
      scripts.dayjs(
        global_data.d1 < global_data.d2 ? global_data.d1 : global_data.d2
      ),
      scripts.dayjs(
        global_data.d1 > global_data.d2 ? global_data.d1 : global_data.d2
      )
    );

    dayjs.rangeCurrentMonth = getRange(dayjs.startMonth, dayjs.today);
    dayjs.rangeToday = getRange(dayjs.today, dayjs.today);
    dayjs.rangeYesterday = getRange(dayjs.yesterday, dayjs.yesterday);
    dayjs.rangeWeek = getRange(dayjs.startWeek, dayjs.today);
    dayjs.rangeYear = getRange(dayjs.startYear, dayjs.today);
    $calendar.find('span.btn.round').removeClass('blue3');
    //console.log(dayjs.currentRangeDate);

    if ($('.datetimepicker').find('input')[0].value.length) {
      if (dayjs.currentRangeDate === dayjs.rangeCurrentMonth) {
        $calendar.find('span.btn.round.currentmonth').addClass('blue3');
      } else if (dayjs.currentRangeDate === dayjs.rangeYesterday) {
        $calendar.find('span.btn.round.yesterday').addClass('blue3');
      } else if (dayjs.currentRangeDate === dayjs.rangeToday) {
        $calendar.find('span.btn.round.today').addClass('blue3');
      } else if (dayjs.currentRangeDate === dayjs.rangeWeek) {
        $calendar.find('span.btn.round.sevendays').addClass('blue3');
      } else if (dayjs.currentRangeDate === dayjs.rangeYear) {
        $calendar.find('span.btn.round.currentyear').addClass('blue3');
      }
    }
    return $('#' + data.id);
  }

  return async (params) => {
    let data = params;
    _type = params.type;
    data.id = 'dateplugin_' + Math.round(Math.random() * 1000000);
    global_data = { d1: new Date(), d2: new Date() };
    if (params.type === 'period') {
      if (params.value) {
        let start = params.value.split(' - ')[0];
        let end = params.value.split(' - ')[1];
        global_data = {
          d1: new Date(
            start.split('-')[0],
            +start.split('-')[1] - 1,
            start.split('-')[2]
          ),
          d2: new Date(
            end.split('-')[0],
            +end.split('-')[1] - 1,
            end.split('-')[2]
          ),
        };
      }
    }
    if (data.type === 'date') {
      if (data.value && data.value.match(/\d{4}-\d{1,2}-\d{1,2}/)) {
        let date = data.value.split('-');
        data.value = new Date(date[0], date[1] - 1, date[2]);
      } else if (!(data.value instanceof Date)) {
        data.value = new Date();
      }
    } else if (data.type === 'datetime') {
      if (
        data.value &&
        data.value.match(/\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}/)
      ) {
        let date_time = data.value.split(' '),
          date = date_time[0].split('-'),
          time = date_time[1].split(':');
        data.value = new Date(
          date[0],
          date[1] - 1,
          date[2],
          time[0],
          time[1],
          time[2]
        );
      } else {
        data.value = new Date();
      }
    } else {
      data.value = new Date();
    }

    let wait_load = setInterval(() => {
      $calendar = $('#' + data.id);
      if ($calendar.length) {
        update(
          data.type === 'period' ? getDateData(data.id) : data.value,
          data.id
        );
        clearInterval(wait_load);

        const xToday = scripts.dayjs();
        dayjs = {
          currentYear: xToday.year(), // int
          currentMonth: xToday.month(), // int
          yesterday: xToday.add(-1, 'day'), // dayjs
          today: xToday, // dayjs
          daysInMonth: xToday.daysInMonth(), // int
          startWeek: xToday.add(-7, 'day'),
        };
        dayjs.startYear = scripts.dayjs(`${dayjs.currentYear}-01-01`);
        dayjs.startMonth = scripts.dayjs(
          `${dayjs.currentYear}-${dayjs.currentMonth + 1}-01`
        );
        $calendar
          .on('dblclick', (e) => {
            let $el = $(e.target);
            if (data.type === 'date') {
              if (e.target.nodeName === 'LI' && !$el.hasClass('selected')) {
                /* if ($el.closest('ul').hasClass('years')) {
                                 data.value.setFullYear($el[0].innerText)
                                 update(data.value, data.id)
                             } else if ($el.closest('ul').hasClass('months')) {
                                 data.value.setMonth($el[0].dataset.month);
                                 update(data.value, data.id)
                             } else */
                if ($el.closest('ul').hasClass('days')) {
                  data.value.setDate($el[0].innerText);
                  update(data.value, data.id);
                }
              }
              $($el)
                .closest('.datetimepicker')
                .find('.datetimepicker-selector > button')[0]
                .click();
            }
          })
          .on('click', async (e) => {
            let $el = $(e.target);

            function hoverHandler(e) {
              const target = $(e.target);
              const collection = target
                .closest('ul')
                .find('li:not([data-day=""])');
              let selected = [target[0]];
              $(collection).removeClass('selected');

              if (!target.hasClass('target')) {
                let start, end;
                for (let i = 0; i < collection.length; i++) {
                  if (
                    $(collection[i]).hasClass('target') ||
                    collection[i] === target[0]
                  ) {
                    !start ? (start = i + 1) : (end = i + 1);
                  }
                }
                selected = collection.slice(start - 1, end);
              }
              if (target[0].dataset.day) $(selected).addClass('selected');
            }

            if (data.type === 'period') {
              if (e.target.nodeName == 'LI') {
                if ($el.closest('ul').hasClass('years')) {
                  data.value.setFullYear($el[0].innerText);
                  $calendar = await update(data.value, data.id);
                  if ($calendar.hasClass('selecting')) {
                    let m = new Date();
                    m.setFullYear($el[0].innerText);
                    m.setMonth(
                      $calendar.find('.months .selected')[0].dataset.month
                    );
                    $calendar.find('.days li').removeClass('selected');
                    if (
                      global_data.d1.getFullYear() === m.getFullYear() &&
                      global_data.d1.getMonth() === m.getMonth()
                    ) {
                      $calendar
                        .find(`[data-day="${global_data.d1.getDate()}"]`)
                        .addClass('target selected');
                      $calendar
                        .find('ul.days li')
                        .on('mouseover', hoverHandler);
                    } else {
                      if (global_data.d1.getTime() > m.getTime()) {
                        $calendar
                          .find('.days li:last-child')
                          .addClass('target');
                        $calendar
                          .find('ul.days li')
                          .on('mouseover', hoverHandler);
                      }
                      if (m.getTime() > global_data.d1.getTime()) {
                        $calendar
                          .find('.days li[data-day="1"]')
                          .addClass('target');
                        $calendar
                          .find('ul.days li')
                          .on('mouseover', hoverHandler);
                      }
                    }
                  } else {
                    let period = $(`#${data.id}`)[0].period;
                    if (period) {
                      period.current = data.value;
                      update(period, data.id);
                    } else update(data.value, data.id);
                  }
                } else if ($el.closest('ul').hasClass('months')) {
                  data.value.setMonth($el[0].dataset.month);
                  $calendar = $('#' + data.id);
                  if ($calendar.hasClass('selecting')) {
                    $calendar = await update(data.value, data.id);
                    let m = new Date();
                    m.setMonth(e.target.dataset.month);
                    $calendar.find('.days li').removeClass('selected');
                    if (global_data.d1.getMonth() === m.getMonth()) {
                      $calendar
                        .find(`[data-day="${global_data.d1.getDate()}"]`)
                        .addClass('target selected');
                      $calendar
                        .find('ul.days li')
                        .on('mouseover', hoverHandler);
                    } else {
                      if (global_data.d1.getTime() > m.getTime()) {
                        $calendar
                          .find('.days li:last-child')
                          .addClass('target');
                        $calendar
                          .find('ul.days li')
                          .on('mouseover', hoverHandler);
                      }
                      if (m.getTime() > global_data.d1.getTime()) {
                        $calendar
                          .find('.days li[data-day="1"]')
                          .addClass('target');
                        $calendar
                          .find('ul.days li')
                          .on('mouseover', hoverHandler);
                      }
                    }
                  } else {
                    let period = $(`#${data.id}`)[0].period;
                    if (period) {
                      period.current = data.value;
                      update(period, data.id);
                    } else update(data.value, data.id);
                  }
                } else if ($el.closest('ul').hasClass('days')) {
                  if ($el[0].innerText !== '') {
                    $el.closest('ul').find('li').removeClass('selected');
                    $el.addClass('target selected');
                    $el.closest('.dateplugin').toggleClass('selecting');

                    if ($el.closest('.dateplugin').hasClass('selecting')) {
                      let d1 = new Date();
                      d1.setFullYear(
                        $calendar.find('.years li.selected')[0].innerText
                      );
                      d1.setMonth(
                        $calendar.find('.months li.selected')[0].dataset.month
                      );
                      d1.setDate($el[0].innerText);
                      global_data.d1 = d1;
                      $el
                        .closest('ul')
                        .find('li')
                        .on('mouseover', hoverHandler);
                    } else {
                      let d2 = new Date();
                      d2.setFullYear(
                        $calendar.find('.years li.selected')[0].innerText
                      );
                      d2.setMonth(
                        $calendar.find('.months li.selected')[0].dataset.month
                      );
                      d2.setDate($el[0].innerText);
                      global_data.d2 = d2;

                      await update(getDateData(data.id), data.id);
                      $('.datetimepicker-selector').find('button')[0].click();
                    }
                  }
                }
              } else if (e.target.nodeName == 'SPAN') {
                let today = new Date();
                if ($el.hasClass('today')) {
                  global_data.d1 = today;
                  global_data.d2 = today;
                  update(getDateData(data.id), data.id);

                  $('.datetimepicker-selector').find('button')[0].click();
                } else if ($el.hasClass('yesterday')) {
                  let yesterday = new Date(Date.now() - 86400 * 1000);
                  global_data.d1 = yesterday;
                  global_data.d2 = yesterday;

                  update(getDateData(data.id), data.id);
                  $('.datetimepicker-selector').find('button')[0].click();
                } else if ($el.hasClass('sevendays')) {
                  let sevendays = new Date(Date.now() - 86400 * 1000 * 7);
                  global_data.d1 = today;
                  global_data.d2 = sevendays;
                  update(getDateData(data.id), data.id);
                  $('.datetimepicker-selector').find('button')[0].click();
                } else if ($el.hasClass('currentmonth')) {
                  let currentmonth = new Date();
                  currentmonth.setDate(1);
                  global_data.d1 = today;
                  global_data.d2 = currentmonth;
                  update(getDateData(data.id), data.id);

                  $('.datetimepicker-selector').find('button')[0].click();
                } else if ($el.hasClass('currentyear')) {
                  let currentyear = new Date();
                  currentyear.setMonth(0);
                  currentyear.setDate(1);
                  global_data.d1 = today;
                  global_data.d2 = currentyear;
                  update(getDateData(data.id), data.id);
                  $('.datetimepicker-selector').find('button')[0].click();
                }
              }
            } else {
              if (e.target.nodeName == 'LI' && !$el.hasClass('selected')) {
                if ($el.closest('ul').hasClass('years')) {
                  data.value.setFullYear($el[0].innerText);
                  await update(data.value, data.id);
                } else if ($el.closest('ul').hasClass('months')) {
                  data.value.setMonth($el[0].dataset.month);
                  await update(data.value, data.id);
                } else if ($el.closest('ul').hasClass('days')) {
                  if ($el[0].innerText !== '') {
                    data.value.setDate($el[0].innerText);
                    await update(data.value, data.id);
                  }
                }
              } else if (e.target.nodeName == 'SPAN') {
                let today = new Date();
                if ($el.hasClass('today')) {
                  data.value.setFullYear(today.getFullYear());
                  data.value.setMonth(today.getMonth());
                  data.value.setDate(today.getDate());
                  update(data.value, data.id);
                } else if ($el.hasClass('yesterday')) {
                  let yesterday = new Date(Date.now() - 86400 * 1000);
                  data.value.setFullYear(yesterday.getFullYear());
                  data.value.setMonth(yesterday.getMonth());
                  data.value.setDate(yesterday.getDate());
                  update(data.value, data.id);
                } else if ($el.hasClass('sevendays')) {
                  let sevendays = new Date(Date.now() - 86400 * 1000 * 7);
                  data.value.setFullYear(sevendays.getFullYear());
                  data.value.setMonth(sevendays.getMonth());
                  data.value.setDate(sevendays.getDate());
                  update(data.value, data.id);
                } else if ($el.hasClass('currentmonth')) {
                  data.value.setFullYear(today.getFullYear());
                  data.value.setMonth(today.getMonth());
                  data.value.setDate(1);
                  update(data.value, data.id);
                } else if ($el.hasClass('currentyear')) {
                  data.value.setFullYear(today.getFullYear());
                  data.value.setMonth(0);
                  data.value.setDate(1);
                  update(data.value, data.id);
                }
              }
            }
          })
          .on('setDate', function (e) {
            data.value = e.detail;
            update(data.value, data.id);
          });
      }
    }, 300);

    return await date_view(data);
  };
}, name);};
app_cache["/app/modules/tooltip.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/tooltip'], function (
  mc,
  tooltip_view
) {
  return async (params, value, ctx) => {
    let inner_view = await value(ctx);
    let id = 'tooltip_' + Math.round(Math.random() * 1000000);
    let data = { id: id, content: inner_view };

    let wait_load = setInterval(() => {
      let $tooltip = $('#' + id);
      if ($tooltip.length) {
        clearInterval(wait_load);
      }
      let bounding = $tooltip.find('.content')[0].getBoundingClientRect();

      if (bounding.top < 0) {
        // Top is out of viewport
      }

      if (bounding.left < 0) {
        // Left side is out of viewoprt
        $tooltip.addClass('left');
      }

      if (
        bounding.bottom >
        (window.innerHeight || document.documentElement.clientHeight)
      ) {
        // Bottom is out of viewport
      }

      if (
        bounding.right >
        (window.innerWidth || document.documentElement.clientWidth)
      ) {
        // Right side is out of viewport
        $tooltip.addClass('right');
      }
    }, 1000);
    return await tooltip_view(data);
  };
}, name);};
app_cache["/app/modules/numdecl.js"] = async (name) => { await define(() => {
  return async (params, value, prev_ctx) => {
    let titles = JSON.parse(await value());
    let cases = [2, 0, 1, 1, 1, 2];
    return titles[
      params[0] % 100 > 4 && params[0] % 100 < 20
        ? 2
        : cases[params[0] % 10 < 5 ? params[0] % 10 : 5]
    ];
  };
}, name);};
app_cache["/app/modules/lang.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/lang'], function (mc, dropdown) {
  return async ($scope, $params) => {
    let language = localStorage.getItem('lang');

    return await dropdown({ lang: language });
  };
}, name);};
app_cache["/app/modules/select.js"] = async (name) => { await define([
  'microcore',
  'mst!layouts/components/select',
  'mst!layouts/components/select_option',
], function (mc, select_view, select_option) {
  return async (params, value, ctx) => {
    let data = params;
    data.id = 'select_' + Math.round(Math.random() * 1000000);
    let val = await value();

    if (val.length > 1) {
      try {
        data.options = JSON.parse(val);
      } catch (e) {}
    }
    for (let i in data.options) {
      if (data.options[i].value === data.value) {
        data.option = data.options[i].option;
        break;
      }
    }

    function updateOptions($select) {
      $select.find('.options li').on('click', (e) => {
        if (!$(e.target).hasClass('disabled')) {
          data.value = e.target.dataset.value;
          data.option = e.target.innerText;

          if ($(e.target).hasClass('selected')) {
            return;
          }

          $select
            .find('li')
            .removeClass('selected')
            .forEach((option) => {
              if (option.dataset.value === data.value) {
                $(option).addClass('selected');
              }
            });

          $select.find('.option span')[0].innerText = data.option;
          $select.find('.option span')[0].dataset.value = data.value;
          $select.find('.option')[0].dataset.value = data.value;
          $select.find('.option')[0].dataset.option = data.option;

          if (typeof data.onchange == 'function') {
            data.onchange(data);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, data);
          }
          if (!data.method) {
            $select.removeClass('open');
          }
        }
      });
    }

    let wait_load = setInterval(() => {
      let disabled = data.disabled || false;
      let $select = $('#' + data.id);
      if ($select.length) {
        const clearFunc = () => {
          $select[0].dataset.value = '';
          $select[0].dataset.option = '';
          const $span = $select.find('.option>span');
          $span.html('');
          $span[0].dataset.value = '';
          $select.find('li').removeClass('selected');
        };
        const selectFunc = (value, option) => {
          $select[0].dataset.value = value;
          $select[0].dataset.option = option;
          const $option = $select.find('.option');
          $option[0].dataset.value = value;
          $option[0].dataset.option = option;
          const $span = $select.find('.option>span');
          $span.html(option);
          $span[0].dataset.value = value;
          $select.find('li').removeClass('selected');
          $select.find(`li[data-value='${value}']`).addClass('selected');
        };
        const disableFunc = () => {
          disabled = true;
          $select.addClass('disabled');
          updateOptions($select);
        };
        const undisableFunc = () => {
          disabled = false;
          $select.removeClass('disabled');
          updateOptions($select);
        };

        $select[0].selectFunc = selectFunc;
        $select[0].clearFunc = clearFunc;
        $select[0].disableFunc = disableFunc;
        $select[0].undisableFunc = undisableFunc;

        $select[0].addOptions = async function (options, clear) {
          if (clear) {
            $(this).find('.options').html('');
            // $(this).find('.options').append(await select_option([{option: mc.i18n('select.default'), value: 'select'}]));
          }
          let appendItem = (item) => {
            if (
              $(this).find('.options li:first-child').length &&
              $(this).find('.options li:first-child')[0].dataset.value !==
                'select'
            ) {
              $(this).find('.options li:first-child').before(item);
            } else if (
              $(this).find('.options li:first-child').length &&
              $(this).find('.options li:first-child')[0].dataset.value ===
                'select' &&
              $(this).find('.options li:nth-child(2)').length
            ) {
              $(this).find('.options li:nth-child(2)').before(item);
            } else {
              $(this).find('.options').append(item);
            }
          };

          if (Array.isArray(options)) {
            for (let i = 0; i < options.length; i++) {
              let item = await select_option(options[i]);
              appendItem(item);
            }
          } else {
            let item = await select_option(options);
            appendItem(item);
          }
          updateOptions($(this));
          if (!clear) $(this).find('li:first-child')[0].click();
          return true;
        };
        $select[0].removeOptions = async function (options) {
          if (Array.isArray(options)) {
            for (let i = 0; i < options.length; i++) {
              $($select).find(`.options li[data-value=${options[i]}]`).remove();
            }
          } else {
            $($select).find(`.options li[data-value=${options}]`).remove();
          }
          updateOptions($(this));
          $(this).find('li:first-child')[0].click();
          return true;
        };
        $select[0].onchange = data.onchange;
        clearInterval(wait_load);

        $(document).on('click', (e) => {
          if (!$(e.target).closest('.select')) {
            $select.removeClass('open');
          }
        });

        $select.on('click', (e) => {
          if (!disabled) {
            $(`.select:not(#${data.id})`).removeClass('open');
            if ($select.hasClass('open') || $(e.target).closest('ul.options')) {
              $select.removeClass('open');
            } else {
              $select.addClass('open');
            }
          }
        });

        updateOptions($select);
        $select.on('update', (e) => {
          updateOptions($(e.target));
        });
      }
    }, 300);

    return await select_view(data);
  };
}, name);};
app_cache["/app/modules/chip.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/chip', 'utilities'], function (
  mc,
  chipTemplate,
  scripts
) {
  return async (params) => {
    let data = { ...params };

    data.id = 'chip_' + Math.round(Math.random() * 1000000);

    data.isCloseble = scripts.isFalse(data.isCloseble);

    data.filterId = data.filterId || false;

    const { value, filterId, isCloseble } = data;

    let wait_load = setInterval(async () => {
      const $component = $(`#${data.id}`);
      if ($component.length) {
        clearInterval(wait_load);

        if (isCloseble) {
          $component.forEach((item) =>
            $(item)
              .find(`[data-type='close']`)
              .on('click', () => {
                if (filterId) {
                  mc.events.push('filter_autocomplite.chip.close', {
                    value,
                    filterId,
                  });
                }
                $component.remove();
              })
          );
        }
      }
    }, 300);

    return await chipTemplate(data);
  };
}, name);};
app_cache["/app/modules/header.js"] = async (name) => { await define(['microcore'], function (mc) {
  mc.events.on('ws:notification', function (notification) {
    let $notifications = $('body > main > header .notifications');
    $notifications.find('.text').html(notification.text);
    $notifications.attr('href', notification.link);
    $notifications.css('display', 'block');
  });

  mc.events.on('ws:users.balance', function (data) {
    $('.balance').html(data.RUB + ' ' + ___mc.i18n('currency'));
  });

  return async function ($scope) {
    $($scope)
      .find('.mdi-menu')
      .on('click', function () {
        $(document).find('body')[0].classList.toggle('nav_minimized');
      });

    $($scope)
      .find('.mdi-dots-horizontal')
      .on('click', function () {
        $('body > nav').toggleClass('opened');
      });

    $('body > nav')
      .find('.mdi-close')
      .on('click', function () {
        $('body > nav').removeClass('opened');
      });

    if (!$($scope).hasClass('mobile')) {
      mc.api
        .batch(
          { method: 'users.me' },
          {
            method: 'notifications.list',
            params: { status: 'not_read', limit: 10 },
          }
        )
        .then(function (data) {
          let user = data[0];
          let notifications = data[1];

          const fileDomain = require.config.apiUrl.replace('/api/', '');

          if (user.avatar) {
            $($scope)
              .find('.avatar')
              .attr('src', fileDomain + user.avatar);
            $("nav .mobile_only").find(".avatar").attr('src', fileDomain + user.avatar);
          }
          if (user.balance) {
            $($scope).find('.balance').text(user.balance.RUB);
          }
          $($scope).find('.email').text(user.email);
          $("nav .mobile_only").find(".user-info").text(user.name||"" + user.surname||""+"("+user.email+")")
          $($scope)
            .find('.name')
            .html((user.name || '') + '&nbsp;' + (user.surname || ''));

          if (notifications) {
            // mc.events.push('notification', notifications[1])
          }

          //mc.events.push('notification', {text: 'Изменились условия оплаты', link: '/news'})
        });
    }

    if (sessionStorage.getItem('switch') != null) {
      try {
        let profile = JSON.parse(sessionStorage.getItem('switch'));
        if (profile && profile.name && profile.name.length) {
          if ($($scope).find('.user-actions').length) {
            $($scope)
              .find('.user-actions')
              .append(
                `<a class="mdi mdi-logout" onclick="___mc.auth.back()">Вернуться к ${profile.name}</a>`
              );
          }
        }
      } catch (ex) {}
    }
  };
}, name);};
app_cache["/app/modules/unless.js"] = async (name) => { await define(() => {
  return (cond, value, prev_ctx) => {
    switch (true) {
      case cond.length === 1:
        if (!cond[0]) {
          return value(prev_ctx);
        }
        break;

      case cond.length === 2:
        if (cond[0] != cond[1]) {
          return value(prev_ctx);
        }
        break;
      case cond.length === 3:
        try {
          if (cond[1].toUpperCase() === 'IN') {
            let arr = Array.from(cond).slice(2);
            if (!arr.includes(cond[0])) {
              return value(prev_ctx);
            }
          } else {
            if (typeof cond[0] == 'string') {
              cond[0] = '"' + cond[0] + '"';
            }

            if (typeof cond[2] == 'string') {
              cond[2] = '"' + cond[2] + '"';
            }
            if (!eval(cond[0] + cond[1] + cond[2])) {
              return value(prev_ctx);
            }
          }
        } catch (e) {
          console.error(e);
        }
        break;
      case cond.length > 3:
        if (cond[1].toUpperCase() === 'IN') {
          let arr = Array.from(cond).slice(2);
          if (!arr.includes(cond[0])) {
            return value(prev_ctx);
          }
        }
        break;
    }
  };
}, name);};
app_cache["/app/modules/info.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/info', 'utilities'], function (
  mc,
  view,
  scripts
) {
  return async (params) => {
    let data = { ...params };

    data.id = 'info_' + Math.round(Math.random() * 1000000);
    data.color = data.color || 'light-blue--text';
    data.icon = data.icon || 'information-outline';
    data.width = data.width || '250';
    data.icon_size = data.icon_size || '18';
    data.left = +data.icon_size + 6;
    data.top = data.i && data.i < 3;

    let wait_load = setInterval(async () => {
      const $component = $(`#${data.id}`);

      if ($component.length) {
        clearInterval(wait_load);

        const $wrapper = $component.find('.info-wrapper');
        const $icon = $component.find('.mdi');

        let isOpen = false;
        let closeDelayTimer = null;
        let openDelayTimer = null;

        $icon.on('mouseenter', open);
        $icon.on('mouseleave', close);

        $wrapper.on('mouseenter', () => clearTimeout(closeDelayTimer));
        $wrapper.on('mouseleave', close);

        function open() {
          clearTimeout(closeDelayTimer);
          if (!isOpen) {
            openDelayTimer = setTimeout(() => {
              isOpen = true;
              $wrapper.removeClass('hide');
            }, 300);
          }
        }

        function close() {
          clearTimeout(openDelayTimer);
          if (isOpen) {
            closeDelayTimer = setTimeout(() => {
              isOpen = false;
              $wrapper.addClass('hide');
            }, 300);
          }
        }
      }
    }, 300);

    if (data.comment) {
      return await view(data);
    }
  };
}, name);};
app_cache["/app/modules/sortable.js"] = async (name) => { await define(['microcore'], function (mc) {
  function getDragAfterElement(container, draggables, y) {
    return draggables.reduce(
      (closest, child) => {
        if (
          !$(child).hasClass('.dragging') &&
          $(child).closest('*[data-sortable-container]')[0] === container
        ) {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
          }
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  function initDraggable(draggable, $scope, $params) {
    $(draggable).attr('draggable', true);
    draggable.addEventListener('dragstart', () => {
      draggable.classList.add('dragging');
    });

    draggable.addEventListener('dragend', () => {
      if (typeof $params.sortableOnchange == 'function') {
        $params.sortableOnchange(draggable);
      } else {
        mc.events.push($params.sortableOnchange, {
          el: draggable,
          ordered: $($scope)
            .find('*[data-sortable-item]')
            .map((item) => {
              return item.dataset.id;
            }),
        });
      }
      draggable.classList.remove('dragging');
    });
  }

  return async ($scope, $params) => {
    let draggables = $($scope).find('*[data-sortable-item]');
    let container = $($scope).find('*[data-sortable-container]')[0] || $scope;

    let observer = new MutationObserver((mutationRecords) => {
      draggables = $($scope).find('*[data-sortable-item]');
      draggables.forEach((draggable) => {
        initDraggable(draggable, $scope, $params);
      });
    });

    observer.observe($scope, {
      childList: true,
      subtree: true,
    });

    draggables.forEach((draggable) => {
      initDraggable(draggable, $scope, $params);
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      let draggable = $('.dragging')[0];
      let container = draggable.closest('*[data-sortable-container]');
      let last = $(container).find('*[data-sortable-item]')[
        $(container).find('*[data-sortable-item]').length - 1
      ];
      let afterElement = getDragAfterElement(container, draggables, e.clientY);
      if (afterElement == null) {
        last.after(draggable);
      } else {
        afterElement.before(draggable);
      }
    });
  };
}, name);};
app_cache["/app/modules/locale.js"] = async (name) => { await define(() => {
  let j = {
    test: 'тест',
    new: 'Новый',
    inwork: 'В работе',
    approved: 'Принят',
    rejected: 'Отклонен',
    appealed: 'Апелляция',
    hold: 'Hold',
    active: 'активный',
    inactive: 'заблокирован',
    lead: 'лид',
    conversion: 'конверсия',
    call: 'звонок',
  };

  return async (params, value, prev_ctx) => {
    return j[params[0]];
  };
}, name);};
app_cache["/app/modules/multiple_input_wrapper.js"] = async (name) => { await define(['microcore', 'utilities', 'app/modules/multiple_input'], function (
  mc,
  scripts,
  multiple_input
) {
  return async (params) => {
    let components = [];
    let $wrapper;
    let id = 'multiple-input-wrapper_' + Math.round(Math.random() * 1000000);
    let props = { ...params };
    let elements = [];

    props.label = scripts.getStringFromI18n(props.label);
    props.placeholder = scripts.getStringFromI18n(props.placeholder);

    props.multiple = scripts.isTrue(props.multiple);
    props.disabled = scripts.isTrue(props.disabled);

    props.inputType = props.inputType.split(',') || ['string'];

    if (props.inputType.includes('string')) {
      props.string = true;
    }

    if (props.inputType.includes('url')) {
      props.url = true;
    }

    if (props.inputType.includes('phone')) {
      props.phone = true;
    }

    elements = await initElements(props.value);

    const wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.classList.add(
      'multiple-input__wrapper',
      'd-flex',
      'f-column',
      'r-gap-8'
    );

    if (elements.length) {
      for (const element of elements) {
        wrapper.append(element);
      }
    } else {
      wrapper.append(await createMultipleInput({ ...props, delete: false }));
    }

    mc.events.on(`multiple_intup.created.${id}`, ($component) => {
      components.push($component);
    });

    mc.events.on(`multiple_intup.delete.${id}`, ($component) => {
      const componentIndex = components.findIndex(
        (c) => c.component === $component
      );
      if (componentIndex > 0 && componentIndex === components.length - 1) {
        toogleAdd(componentIndex - 1);
      }
      components.splice(componentIndex, 1);
      $component.remove();
      getValue();
    });

    mc.events.on(`multiple_intup.add.${id}`, async (value = '') => {
      if (!includes(value)) {
        toogleAdd(components.length - 1);
        getWrapper().append(
          await createMultipleInput({
            ...props,
            delete: true,
            label: '',
            multiple: true,
            value,
          })
        );
        getValue();
      }
    });

    mc.events.on(`multiple_intup.onchange.${id}`, (event) => {
      getValue(event);
    });

    mc.events.push(`multiple_intup_wrapper.created`, {
      id,
      name: props.name,
      setValue,
      getValue,
    });
    return wrapper.outerHTML;

    function includes(value) {
      return getValues().includes(value);
    }

    async function setValue(value) {
      let elements = await initElements(value);
      if (elements.length) {
        getWrapper().html('');
        for (const element of elements) {
          getWrapper().append(element);
        }
      }
    }

    function getValues() {
      return getWrapper()
        .find('input')
        .map((input) => input.dataset.value || null);
    }

    function getValue(event) {
      let value = getValues();
      if (!props.multiple) {
        value = value[0];
      }
      const object = { ...props, value, event };
      if (typeof props.onchange == 'function') {
        props.onchange(object);
      } else if (typeof props.onchange == 'string') {
        mc.events.push(props.onchange, object);
      }
      return value;
    }

    async function initElements(values) {
      const elements = [];
      if (props.phone) {
        if (typeof values === 'object' && values?.length) {
          let i = 0;
          for await (value of values) {
            const isLast = props.multiple && i === values.length - 1;
            const label = i == 0 ? props.label : '';
            elements.push(
              await createMultipleInput({
                ...props,
                multiple: isLast,
                delete: i != 0,
                value,
                label,
              })
            );
            i += 1;
          }
        }
      }
      return elements;
    }

    function toogleAdd(index) {
      components[index].actions.toggleAdd();
    }

    async function createMultipleInput(props) {
      return scripts.htmlToElement(
        await multiple_input({ ...props, wrapperID: id })
      );
    }

    function getWrapper() {
      if (!$wrapper) {
        $wrapper = $(`#${id}`);
      }
      return $wrapper;
    }
  };
}, name);};
app_cache["/app/modules/sort_arrows.js"] = async (name) => { await define(['microcore'], function (mc) {
  return (params) => {
    const order = params.order || false;
    if (order) {
      const id = 'sort-arrow_' + Math.round(Math.random() * 1000000);

      const eventName = params.event || 'filter.order';
      const label = params.label || '';
      const orderKey = params.orderKey || 'order';

      const filter = mc.router.hash();

      const DESC = 'DESC';
      const ASC = 'ASC';

      filter.direction = filter.direction || DESC;
      filter.order = order;

      let isActive = filter[orderKey] == order;

      const isASC = () => isActive && filter.direction == DESC;

      const direction = () => (isActive ? (isASC() ? DESC : ASC) : DESC);

      const icon = () => (isASC() ? 'mdi-chevron-up ' : 'mdi-chevron-down');

      const classes = () =>
        'pointer mdi ' + (isActive ? 'active ' : '') + icon();

      let wait_load = setInterval(() => {
        let $component = $(`#${id}`);
        if ($component.length) {
          clearInterval(wait_load);
          const $arrow = $component.find('.pointer');
          $arrow.on('click', () => {
            isActive = true;
            filter.direction = isASC() ? ASC : DESC;
            $arrow[0].className = classes();
            window.history.pushState({}, '', mc.router.hash(filter));
            mc.events.push(eventName, {
              order,
              direction: direction(),
            });
          });
        }
      }, 300);

      return `
          <div id='${id}' class='nowrap sort-arrow-wrapper'>
            ${label}
            <span class="${classes()}"></span>
          </div>
          `;
    }
  };
}, name);};
app_cache["/app/modules/popup.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/popup'], function (
  mc,
  popup_view
) {
  return async function (view, data) {
    let id = 'popup_' + Math.round(Math.random() * 1000000);
    let $popup = $(
      await popup_view({
        id: id,
        content: await view(data),
      })
    );

    $popup.find('.popup-close').on('click', function () {
      $('body > main > article')
        .find('.popup#' + id)
        .closest('.popup-wrapper')
        .remove();
      mc.events.push('popup.closed');
    });

    $('body > main > article').append($popup);

    return new Promise((resolve, reject) => {
      resolve(
        $('body > main > article')
          .find('.popup#' + id)
          .closest('.popup-wrapper')
      );
    });
  };
}, name);};
app_cache["/app/modules/arrows.js"] = async (name) => { await define(['microcore'], function (mc) {
  return async (params, value, ctx) => {
    let cls = '',
      span = '',
      val = '',
      tmp = '';
    if (params && params.length === 1) {
      val = String(params[0]);
    }
    tmp = val;
    val = val.replace(/K|M/g, '');
    if (isNaN(val)) {
      val = 0;
      tmp = 0;
    }
    if (Number(val) > 0) {
      cls = 'diff_inc';
      span = '<span class="mdi mdi-menu-up"></span>';
    }
    if (Number(val) < 0) {
      cls = 'diff_dec';
      span = '<span class="mdi mdi-menu-down"></span>';
    }
    return `<span class="${cls}">${tmp}%${span}</span>`;
  };
}, name);};
app_cache["/app/modules/confirm.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/confirm'], function (
  mc,
  confirm_view
) {
  return async function (title, text, callback) {
    let $confirm = $(
      await confirm_view({
        title: title,
        text: text,
      })
    );

    $confirm.find('a').on('click', function (e) {
      e.preventDefault();
      $(this).closest('.confirm').remove();

      if (this.dataset.answer == 'true') {
        callback();
      }
    });

    $(document.body)
      .append($confirm)
      .find('.confirm')
      .on('click', (e) => {
        if (!$(e.target).closest('.block'))
          $(e.target).closest('.confirm').remove();
      });
  };
}, name);};
app_cache["/app/modules/checkbox.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/checkbox', 'utilities'], function (
  mc,
  template,
  scripts
) {
  return async (params) => {
    let data = { ...params };

    data.id = 'checkbox_' + Math.round(Math.random() * 1000000);

    data.label = mc.i18n(data.label) || data.label || false;

    let wait_load = setInterval(async () => {
      const $component = $(`#${data.id}`);
      if ($component.length) {
        clearInterval(wait_load);
        const $checkbox = $component.find('input');

        const getValue = () => $checkbox[0].checked;

        const onChange = () => {
          if (data.onchange) {
            if (typeof data.onchange == 'function') {
              data.onchange(getValue());
            } else if (typeof data.onchange == 'string') {
              mc.events.push(data.onchange, getValue());
            }
          }
        };

        $checkbox.on('change', onChange);
      }
    }, 300);

    return await template(data);
  };
}, name);};
app_cache["/app/modules/range.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/range'], function (
  mc,
  range_view
) {
  return async (params) => {
    let data = params;
    data.id = 'range_' + Math.round(Math.random() * 1000000);
    if (data.text && mc.i18n(data.text)) {
      data.text = mc.i18n(data.text);
    }

    let wait_load = setInterval(() => {
      let $range = $('#' + data.id);
      if ($range.length) {
        clearInterval(wait_load);

        $range.find('input')[0].oninput = function () {
          $range.find('span').html(this.value);
        };

        $range.find('input')[0].onchange = function () {
          data.value = +this.value;
          this.setAttribute('value', this.value);
          this.attributes.value = this.value;
          if (typeof data.onchange == 'function') {
            data.onchange(data);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, data);
          }
        };
      }
    }, 300);

    return await range_view(data);
  };
}, name);};
app_cache["/app/modules/timeplugin.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/timeplugin'], function (
  mc,
  time_view
) {
  return async (params) => {
    function update($time) {
      let button = $('#' + data.id)
          .closest('.datetimepicker-inner')
          .find('button'),
        hours = $($time.find('.timepicker-hours')[0]).val(),
        minutes = $($time.find('.timepicker-minutes')[0]).val(),
        seconds = $($time.find('.timepicker-seconds')[0]).val();

      if (Number(hours) < 10) {
        hours = '0' + Number(hours);
      }
      if (Number(minutes) < 10) {
        minutes = '0' + Number(minutes);
      }
      if (Number(seconds) < 10) {
        seconds = '0' + Number(seconds);
      }
      $(button)[0].dataset.hours = hours;
      $(button)[0].dataset.minutes = minutes;
      $(button)[0].dataset.seconds = seconds;
    }
    function set($time, time) {
      $($time.find('.timepicker-hours')[0]).val(time[0]);
      $($time.find('.timepicker-minutes')[0]).val(time[1]);
      $($time.find('.timepicker-seconds')[0]).val(time[2]);
    }

    let data = params,
      time = ['12', '00', '00'];
    data.id = 'timeplugin_' + Math.round(Math.random() * 1000000);

    if (data.type === 'datetime') {
      if (
        data.value &&
        data.value.match(/\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}/)
      ) {
        let date_time = data.value.split(' '),
          date = date_time[0].split('-');
        time = date_time[1].split(':');
      }
    } else if (data.type === 'time') {
      if (data.value && data.value.match(/\d{1,2}:\d{1,2}:\d{1,2}/)) {
        time = data.value.split(':');
      } else {
        let date = new Date();
        time[0] = date.getHours();
        time[1] = date.getMinutes();
        time[2] = '00';
      }
    } else {
      let date = new Date();
      time[0] = date.getHours();
      time[1] = date.getMinutes();
      time[2] = '00';
    }

    let wait_load = setInterval(() => {
      let $time = $('#' + data.id);
      if ($time.length) {
        clearInterval(wait_load);
        set($time, time);
        update($time);

        $($time.find('input[type=number]')).on('change', (e) => {
          update($time);
        });

        $time.on('setTime', function (e) {
          set($time, e.detail);
          update($time);
        });
      }
    }, 300);

    return await time_view(data);
  };
}, name);};
app_cache["/app/modules/seload.js"] = async (name) => { await define([
  'microcore',
  'mst!layouts/components/seload',
  'mst!layouts/components/select_option',
], function (mc, select_view, select_option) {
  return async (params, value, ctx) => {
    let data = { ...params };
    data.total = data.params.limit + 1 || 11;

    data.id = 'select_' + Math.round(Math.random() * 1000000);
    delete data.params.__r;
    data.pattern ? delete data.pattern.__r : void 0;

    if (!data.pattern) {
      data.pattern = {
        option: 'name',
        value: 'id',
      };
    }

    if (!data.option) data.option = mc.i18n('select.default');

    if (!data.value) data.value = 'select';

    function updateHandler($select) {
      $select.find('.options li').on('click', (e) => {
        if (!$(e.target).hasClass('disabled')) {
          if ($(e.target).hasClass('selected')) {
            return;
          }
          $(e.target).addClass('disabled');
          data.value = e.target.dataset.value;
          data.option = e.target.innerText;
          // data.selected ? $select.find(`li`).removeClass('disabled', 'selected') : void 0
          if (typeof data.onchange == 'function') {
            data.onchange(data);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, data);
          }

          if (!data.multiple) {
            $select.find(`li`).removeClass('selected');
            $(e.target).removeClass('disabled');
            $select.find('li').forEach((option) => {
              if (option.dataset.value === data.value) {
                $(option).addClass('selected');
              }
            });

            $select.find('.option span')[0].innerText = data.option;
            $select.find('.option span')[0].dataset.value = data.value;
            $select.find('.option')[0].dataset.value = data.value;
            $select.find('.option')[0].dataset.option = data.option;
          }
        }
      });
    }

    function updateSelect($select, option, value) {
      mc.api.call(data.method, data.params).then((res) => {
        if (res && res.items && res.items.length) {
          const parent = $select.find('ul.options');
          parent.html('');
          // option ? data.option = option : void 0;
          // value ? data.value = value : void 0;
          !!option ? $select.find('.option>span').html(option) : void 0;
          !!value ? ($select.find('.option')[0].dataset.value = value) : void 0;
          (async () => {
            // parent.append(await select_option({option: mc.i18n('select.default'), value: 'select', disabled: false}))

            // parent.append(await select_option({option: !!option ? option : mc.i18n('select.default'), value: !!value ? value : 'select', disabled: !!data.required}))
            parent.append(
              await select_option({
                option: mc.i18n('select.default'),
                value: 'select',
                disabled: !!data.required,
              })
            );
            await addOptions($select, Array.from(res.items));
          })();
        }
      });
    }

    async function addOptions(select, options) {
      let appendItem = (item) => {
        $(select).find('.options').append(item);
      };
      if (Array.isArray(options)) {
        for (let i = 0; i < options.length; i++) {
          let item_data = {
            option: options[i][data.pattern.option],
            value: options[i][data.pattern.value],
          };
          if (data.selected && data.selected.length) {
            data.selected.find((item) => {
              if (item === item_data.value) {
                item_data.selected = true;
                return true;
              }
            });
          }
          let item = await select_option(item_data);
          appendItem(item);
        }
      } else {
        let item_data = {
          option: options[data.pattern.option],
          value: options[data.pattern.value],
        };
        if (data.selected && data.selected.length) {
          data.selected.find((item) => {
            if (item === options[data.pattern.value]) {
              item_data.selected = true;
              return true;
            }
          });
        }
        let item = await select_option(item_data);
        appendItem(item);
      }
      updateHandler(select);
      return true;
    }

    let wait_load = setInterval(() => {
      let $select = $('#' + data.id);
      let params = { ...data.params };
      if ($select.length) {
        $select[0].onchange = data.onchange;
        $select[0].updateSelect = (selected, option, value) => {
          selected ? (data.selected = selected) : void 0;
          data.params.offset = 0;
          data.total = data.params.limit + 1;
          params = { ...data.params };
          updateSelect($select, option, value);
        };
        $select[0].addOptions = async function (options) {
          return await addOptions($(this), options);
        };
        clearInterval(wait_load);

        $(document).on('click', (e) => {
          if (!$(e.target).closest('.select')) {
            $select.removeClass('open');
          }
        });

        $select.on('click', (e) => {
          $(`.select:not(#${data.id})`).removeClass('open');
          if ($select.hasClass('open') || $(e.target).closest('ul.options')) {
            $select.removeClass('open');
          } else {
            $select.addClass('open');
          }
        });

        const options = $select.find('ul.options');
        options.on('scroll', function () {
          if (
            options[0].scrollTop + options[0].clientHeight >=
            options[0].scrollHeight
          ) {
            params.offset += params.limit;

            if (data.total >= params.offset) {
              mc.api.call(data.method, params).then((res) => {
                if (res && res.items && res.items.length) {
                  data.total = res.total;
                  addOptions($select, Array.from(res.items));
                }
              });
            }
          }
        });

        updateSelect($select, data.option, data.value);
        //updateSelect($select, data.option);
      }
    }, 300);

    return await select_view({
      classlist: data.classlist,
      id: data.id,
      value: data.value,
    });
  };
}, name);};
app_cache["/app/modules/datetimepicker.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/datetimepicker'], function (
  mc,
  datetimepicker_view
) {
  return async (params) => {
    let data = params;
    data.id = 'datetimepicker_' + Math.round(Math.random() * 1000000);
    data.label
      ? (data.label = mc.i18n(data.label))
      : false;
    if (data.type === 'period') {
      if (data.value) {
        let start = data.value.split(' - ')[0];
        let end = data.value.split(' - ')[1];
        data.period = {
          start: new Date(
            start.split('-')[0],
            +start.split('-')[1] - 1,
            start.split('-')[2]
          ),
          end: new Date(
            end.split('-')[0],
            +end.split('-')[1] - 1,
            end.split('-')[2]
          ),
        };
        setInputVal();
      }
    }

    if (data.placeholder) {
      data.placeholder = mc.i18n(data.placeholder) || data.placeholder;
    } else {
      data.placeholder = '';
    }

    function setInputVal(input) {
      data.value = `${data.period.start.getFullYear()}-${
        data.period.start.getMonth() + 1 < 10
          ? '0' + (data.period.start.getMonth() + 1)
          : data.period.start.getMonth() + 1
      }-${
        data.period.start.getDate() < 10
          ? '0' + data.period.start.getDate()
          : data.period.start.getDate()
      } - ${data.period.end.getFullYear()}-${
        data.period.end.getMonth() + 1 < 10
          ? '0' + (data.period.end.getMonth() + 1)
          : data.period.end.getMonth() + 1
      }-${
        data.period.end.getDate() < 10
          ? '0' + data.period.end.getDate()
          : data.period.end.getDate()
      }`;
      input ? $(input).val(data.value) : void 0;
    }

    let wait_load = setInterval(() => {
      let $datetimepicker = $('#' + data.id);
      if ($datetimepicker.length) {
        clearInterval(wait_load);

        $(document).on('click', (e) => {
          if (!$(e.target).closest('.datetimepicker, .calendar-list')) {
            $($datetimepicker.find('div')[0]).addClass('hide');
          }
        });

        $($datetimepicker.find('button')[0]).on('click', (e) => {
          e.preventDefault();
          if (data.type !== 'period') {
            let button = $('#' + data.id).find('.datetimepicker-inner button');

            if (data.type === 'date') {
              data.value =
                $(button)[0].dataset.year +
                '-' +
                $(button)[0].dataset.month +
                '-' +
                $(button)[0].dataset.day;
            } else if (data.type === 'time') {
              data.value =
                $(button)[0].dataset.hours +
                ':' +
                $(button)[0].dataset.minutes +
                ':' +
                $(button)[0].dataset.seconds;
            } else {
              data.value =
                $(button)[0].dataset.year +
                '-' +
                $(button)[0].dataset.month +
                '-' +
                $(button)[0].dataset.day +
                ' ' +
                $(button)[0].dataset.hours +
                ':' +
                $(button)[0].dataset.minutes +
                ':' +
                $(button)[0].dataset.seconds;
            }
          } else {
            const period = $(`#${data.id}`).find('.dateplugin')[0].period;

            if (period) {
              data.period = {
                start: period.start,
                end: period.end,
              };
            } else {
              data.period = {
                start: new Date(),
                end: new Date(),
              };
              data.period.start.setHours(0, 0, 0);
              data.period.end.setHours(23, 59, 59);
            }
            setInputVal($datetimepicker.find('input'));
          }

          if (typeof data.onchange == 'function') {
            data.onchange(data);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, data);
          }

          $($datetimepicker.find('input')[0]).val(data.value);
          $($datetimepicker.find('div')[0]).addClass('hide');
          $($datetimepicker.find('.clear')[0]).removeClass('hide');
        });

        $($datetimepicker.find('.clear')[0]).on('click', (e) => {
          let input = $($datetimepicker.find('input')[0]);
          if (!input[0].hasAttribute('disabled')) {
            input.val('');
            data.value = '';
            data.period = false;
            // $(`#${data.id}`).find('.dateplugin')[0].period = false;

            e.target.classList.add('hide');

            if (typeof data.onchange == 'function') {
              data.onchange(data);
            } else if (typeof data.onchange == 'string') {
              mc.events.push(data.onchange, data);
            }
          }
        });

        $($datetimepicker.find('input')[0])
          .on('focus', () => {
            $('.datetimepicker > span > div').addClass('hide');
            $($datetimepicker.find('div')[0]).removeClass('hide');
          })
          .on('keyup', function (event) {
            $($datetimepicker.find('.clear')[0]).removeClass('hide');
            if (data.type === 'date') {
              if (this.value.match(/\d{4}-\d{1,2}-\d{1,2}/)) {
                let date = this.value.split('-');
                $datetimepicker.find('.dateplugin')[0].dispatchEvent(
                  new CustomEvent('setDate', {
                    detail: new Date(date[0], date[1] - 1, date[2]),
                  })
                );
              }
            } else if (data.type === 'time') {
              if (this.value.match(/\d{1,2}:\d{1,2}:\d{1,2}/)) {
                let time = this.value.split(':');
                $datetimepicker
                  .find('.timeplugin')[0]
                  .dispatchEvent(new CustomEvent('setTime', { detail: time }));
              }
            } else {
              if (
                this.value.match(
                  /\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}/
                )
              ) {
                let date_time = this.value.split(' '),
                  date = date_time[0].split('-'),
                  time = date_time[1].split(':');
                $datetimepicker.find('.dateplugin')[0].dispatchEvent(
                  new CustomEvent('setDate', {
                    detail: new Date(date[0], date[1] - 1, date[2]),
                  })
                );
                $datetimepicker
                  .find('.timeplugin')[0]
                  .dispatchEvent(new CustomEvent('setTime', { detail: time }));
              }
            }
            // if (event.key === 'Enter') {
            //   const filter = mc.router.hash();
            //   filter.period = this.value;
            //   mc.router.go(mc.router.hash(filter));
            // }
          });
      }
    }, 300);

    return await datetimepicker_view(data);
  };
}, name);};
app_cache["/app/modules/pagination.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/pagination'], function (
  mc,
  pagination_view
) {
  mc.events.on('system:pagination.update', async (data) => {
    let hash = mc.router.hash();
    data.current = data.current || 1;
    data.total_pages = Math.ceil(data.total / data.limit);
    data.pages = [];
    data.limits = [
      { option: '10', value: 10 },
      { option: '25', value: 25 },
      { option: '50', value: 50 },
      { option: '100', value: 100 },
    ];
    if (data.stats && data.stats.length) {
      data.stats = [
        {
          value: data.total,
          name: mc.i18n('filter.found'),
        },
        ...data.stats,
      ];
    } else {
      data.stats = [
        {
          value: data.total,
          name: mc.i18n('filter.found'),
        },
      ];
    }

    data.limit_change = function (selected) {
      let hash = mc.router.hash();
      hash.limit = selected.value;
      hash.page = 1;

      mc.router.go(mc.router.hash(hash));
    };

    // if (data.total_pages > 1) {
    if (data.current > 1) {
      hash.page = data.current - 1;
      data.prev = mc.router.hash(hash);
    }

    if (data.total_pages > 10) {
      if (data.current < 7) {
        for (let i = 1; i <= 7; i++) {
          if (i != data.current) {
            hash.page = i;
            data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
          } else {
            data.pages.push({ page: i });
          }
        }

        data.pages.push({ page: '...' });
        hash.page = data.total_pages;
        data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
      } else if (data.current >= 7 && data.current < data.total_pages - 3) {
        hash.page = 1;
        data.pages.push({ page: 1, uri: mc.router.hash(hash) });
        data.pages.push({ page: '...' });
        for (let i = data.current - 2; i <= data.current + 2; i++) {
          if (i != data.current) {
            hash.page = i;
            data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
          } else {
            data.pages.push({ page: i });
          }
        }

        data.pages.push({ page: '...' });
        hash.page = data.total_pages;
        data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
      } else if (data.current >= 7 && data.current >= data.total_pages - 3) {
        hash.page = 1;
        data.pages.push({ page: 1, uri: mc.router.hash(hash) });
        data.pages.push({ page: '...' });
        for (let i = data.total_pages - 7; i <= data.total_pages; i++) {
          if (i != data.current) {
            hash.page = i;
            data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
          } else {
            data.pages.push({ page: i });
          }
        }
      }
    } else {
      for (let i = 1; i <= data.total_pages; i++) {
        if (i != data.current) {
          hash.page = i;
          data.pages.push({ page: hash.page, uri: mc.router.hash(hash) });
        } else {
          data.pages.push({ page: i });
        }
      }
    }

    if (data.current < data.total_pages) {
      hash.page = data.current + 1;
      data.next = mc.router.hash(hash);
    }
    // }

    $('.pagination-wrapper').each(async (index, pagination) => {
      if (pagination instanceof HTMLElement) {
        pagination.outerHTML = await pagination_view(data);
      }
    });
  });

  return async function () {
    return await pagination_view();
  };
}, name);};
app_cache["/app/modules/each.js"] = async (name) => { await define(() => {
  return async (cond, value, prev_ctx) => {
    if (typeof cond[0] == 'object') {
      return await (async (ctx) => {
        let r = [];
        if (ctx.length || Object.keys(ctx).length) {
          for (let key in ctx) {
            if (key == '__r' || key == '__p' || key == '__k') {
              continue;
            }
            let item = ctx[key];
            item.__p = prev_ctx;
            item.__k = key;
            r.push(await value(item));
          }
        }
        return r.join('');
      })(cond[0]);
    }
  };
}, name);};
app_cache["/app/modules/i18n.js"] = async (name) => { await define(['microcore'], async function (mc) {
  let locale = mc.storage.get('locale');
  mc.events.on('lang.change', async (lang) => {
    localStorage.setItem('lang', lang);
    let id = mc.auth.get().id;
    if (id) {
      await mc.api.call('users.update', { language: lang, id: id });
    }
    location.reload();
  });
  return async ($scope, $params, ctx) => {
    try {
      return eval('locale.' + (await $params(ctx)))
        ? eval('locale.' + (await $params(ctx)))
        : await $params(ctx);
    } catch (e) {
      return await $params(ctx);
    }
  };
}, name);};
app_cache["/app/modules/log.js"] = async (name) => { await define(() => {
  return (cond, value, prev_ctx) => {};
}, name);};
app_cache["/app/modules/notify.js"] = async (name) => { await define(['microcore', 'mst!layouts/components/notify'], function (
  mc,
  notify_view
) {
  return async function (level, title, text) {
    let id = 'notify_' + Math.round(Math.random() * 1000000);
    let $notify = $(
      await notify_view({
        level: level,
        title: title,
        text: text,
        id: id,
      })
    );
    let posY = '20px';
    let slideBack = setTimeout(function () {
      $(document.body)
        .find('.notify#' + id)
        .css('right', '-500px');
    }, 5000);

    let remove = setTimeout(function () {
      $(document.body)
        .find('.notify#' + id)
        .remove();
    }, 6000);

    if ($(document.body).find('.notify').length) {
      const last = $(document.body).find('.notify')[
        $(document.body).find('.notify').length - 1
      ];
      let pos = last.getBoundingClientRect().top + last.offsetHeight - 50;
      if (pos + last.offsetHeight > window.innerHeight) {
        $(document.body)
          .find('.notify')
          .forEach((e) => {
            e.style.top = `${+e.style.top.split('px')[0] - e.offsetHeight}px`;
          });
        pos -= last.offsetHeight;
      }
      posY = `${pos}px`;
    }
    $(document.body).append($notify);
    $(document.body)
      .find('.notify#' + id)
      .css('top', posY);

    setTimeout(function () {
      $(document.body)
        .find('.notify#' + id)
        .css('right', '10px');
    }, 100);

    $(document.body)
      .find('.notify#' + id)
      .on('click', function () {
        $(this).remove();
      });

    $(document.body)
      .find('.notify#' + id)
      .on('mouseenter', function () {
        clearTimeout(slideBack);
        clearTimeout(remove);
      });

    $(document.body)
      .find('.notify#' + id)
      .on('touchstart', function (e) {
        e.preventDefault();
        clearTimeout(slideBack);
        clearTimeout(remove);
      });

    $(document.body)
      .find('.notify#' + id)
      .on('mouseleave', function () {
        $(document.body)
          .find('.notify#' + id)
          .css('right', '-500px');
        setTimeout(function () {
          $(document.body)
            .find('.notify#' + id)
            .remove();
        }, 2000);
      });

    $(document.body)
      .find('.notify#' + id)
      .on('touchend', function () {
        $(document.body)
          .find('.notify#' + id)
          .css('right', '-500px');
        setTimeout(function () {
          $(document.body)
            .find('.notify#' + id)
            .remove();
        }, 2000);
      });
  };
}, name);};
app_cache["/assets/js/miq.js"] = async (name) => { await define('miq', function() {
//(function () {
    let miq = function (arg, doc) {
        doc = doc && doc.first || doc || document;

        if (typeof arg == 'function') {
            if (doc.readyState == 'loading') {
                doc.addEventListener('DOMContentLoaded', arg);
            } else {
                arg();
            }
        } else {
            let ret = Object.create(miq.fn);
            let i;

            if (typeof arg == 'object') {
                if ('length' in arg) {
                    ret.length = arg.length;

                    for (i = 0; i < arg.length; i++) {
                        ret[i] = arg[i];
                    }
                } else {
                    ret[0] = arg;
                    ret.length = 1;
                }
            } else if (!arg) {
                ret[0] = doc.createDocumentFragment();
                ret.length = 1;
            } else if (arg.match(/<[^>]+>/)) {
                let temp = document.createElement('template');
                temp.innerHTML = arg;
                ret[0] = temp.content;
                ret.length = 1;
            } else {
                let els = doc.querySelectorAll(arg);
                ret.length = els.length;
                for (i = 0; i < els.length; i++) {
                    ret[i] = els[i];
                }
            }

            return ret;
        }
    };

    miq.fn = Object.create(Array.prototype, {
        first: {
            get: function () {
                return this[0];
            }
        },

        eq: {
            value: function (i) {
                return miq(this[i || 0]);
            }
        },

        on: {
            value: function (evt, fn) {
                for (let i = 0; i < this.length; i++) {
                    this[i].addEventListener(evt, fn);
                }
                return this;
            }
        },

        off: {
            value: function (evt, fn) {
                for (let i = 0; i < this.length; i++) {
                    this[i].removeEventListener(evt, fn);
                }
                return this;
            }
        },

        addClass: {
            value: function (cls) {
                for (let i = 0; i < this.length; i++) {
                    if (!miq.fn.hasClass.call({first: this[i]}, cls)) {
                        let className = this[i].className.split(' ')
                            .filter((i) => i.length > 0);
                        className.push(cls);
                        this[i].className = className.join(' ')
                    }
                }
                return this;
            }
        },

        removeClass: {
            value: function (...cls) {
                for (let i = 0; i < this.length; i++) {
                    this[i].classList.remove(...cls) //= this [i].className.replace(cls, '');
                }
                return this;
            }
        },
        toggleClass: {
            value: function (cls) {
                for (let i = 0; i < this.length; i++) {
                    this[i].classList.toggle(cls)
                }
                return this;
            }
        },

        hasClass: {
            value: function (cls) {
                return this.first.className != '' && new RegExp('\\b' + cls + '\\b').test(this.first.className);
            }
        },

        prop: {
            value: function (property, value) {
                if (typeof value == 'undefined') {
                    return this.first[property];
                } else {
                    for (let i = 0; i < this.length; i++) {
                        this[i][property] = value;
                    }
                    return this;
                }
            }
        },

        attr: {
            value: function (property, value) {
                if (typeof value == 'undefined') {
                    return this.first.getAttribute(property);
                } else {
                    for (let i = 0; i < this.length; i++) {
                        this[i].setAttribute(property, value);
                    }
                    return this;
                }
            }
        },

        removeAttr: {
            value: function (property) {
                for (let i = 0; i < this.length; i++) {
                    this[i].removeAttribute(property);
                }
                return this;
            }
        },

        val: {
            value: function (value) {
                let el = this.first;
                let prop = 'value';

                switch (el.tagName) {
                    case 'SELECT':
                        prop = 'selectedIndex';
                        break;
                    case 'OPTION':
                        prop = 'selected';
                        break;
                    case 'INPUT':
                        if (el.type == 'checkbox' || el.type == 'radio') {
                            prop = 'checked';
                        }
                        break;
                }

                return this.prop(prop, value);
            }
        },

        each: {
            value: function (cb) {
                let t = this;
                for (let i in t) {
                    if (!(t[0] && isNaN(i))) {
                        cb(i, t[i]);
                    }

                }
                return this;
            }
        },

        append: {
            value: function (value) {
                let t = this, v = miq(value), len = v.length;
                for (let i = 0; i < len; i++) {
                    t.first.appendChild(v[i])
                }
                return this;
            }
        },
        prepend: {
            value: function (value) {
                let t = this, v = miq(value), len = v.length;
                for (let i = 0; i < len; i++) {
                    t.first.prepend(v[i])
                }
                return this;
            }
        },
        before: {
            value: function (value) {
                this.first.parentElement.insertBefore(miq().append(value).first, this.first);
                return this;
            }
        },
        after: {
            value: function (value) {
                if (this.first.nextElementSibling)
                    miq(this.first.nextElementSibling).before(value)
                else
                    miq(this.first.parentElement).append(value)
                return this;
            }
        },

        parent: {
            value: function () {
                return miq(this.first.parentNode);
            }
        },

        clone: {
            value: function () {
                return miq(this.first.cloneNode(true));
            }
        },

        remove: {
            value: function () {
                for (let i = 0; i < this.length; i++) {
                    this[i].parentNode.removeChild(this[i]);
                }
                return this;
            }
        },

        find: {
            value: function (value) {
                return miq(value, this.first);
            }
        },

        closest: {
            value: function (selector) {
                let el = this.first;
                do {
                    if (el[miq.matches](selector)) {
                        return miq(el);
                    }
                } while (el = el.parentElement);
                return null;
            }
        },

        is: {
            value: function (selector) {
                return miq(this.filter(function (el) {
                    return el[miq.matches](selector);
                }));
            }
        },

        css: {
            value: function (property, value) {
                if (typeof value == 'undefined') {
                    return this.first.style[property];
                } else {
                    for (let i = 0; i < this.length; i++) {
                        this[i].style[property] = value;
                    }
                    return this;
                }
            }
        },

        html: {
            value: function (value) {
                return this.prop('innerHTML', value);
            }
        },

        text: {
            value: function (value) {
                return this.prop('textContent', value);
            }
        }
    });

    miq.matches = ['matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector'].filter(function (sel) {
        return sel in document.documentElement;
    })[0];

    return miq;
});
    /*
        // Support MD and CommonJS module loading
        if (typeof define === 'function' && define.amd) {
            define(function () {
                return miq;
            });
        } else if (typeof module === 'object' && module.exports) {
            module.exports = miq;
        } else if (typeof $ == 'undefined') {
            $ = miq;
        }
    })();
     */};
app_cache["/assets/js/sortable.complete.esm.js"] = async (name) => { await define('sortable', function(){
  /**!
   * https://github.com/SortableJS/Sortable
   * Sortable 1.10.2
   * @author	RubaXa   <trash@rubaxa.org>
   * @author	owenm    <owen23355@gmail.com>
   * @license MIT
   */
  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _extends() {
    _extends = Object.assign || function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];

        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }

      return target;
    };

    return _extends.apply(this, arguments);
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _objectWithoutPropertiesLoose(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;

    for (i = 0; i < sourceKeys.length; i++) {
      key = sourceKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      target[key] = source[key];
    }

    return target;
  }

  function _objectWithoutProperties(source, excluded) {
    if (source == null) return {};

    var target = _objectWithoutPropertiesLoose(source, excluded);

    var key, i;

    if (Object.getOwnPropertySymbols) {
      var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

      for (i = 0; i < sourceSymbolKeys.length; i++) {
        key = sourceSymbolKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
        target[key] = source[key];
      }
    }

    return target;
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  var version = "1.10.2";

  function userAgent(pattern) {
    if (typeof window !== 'undefined' && window.navigator) {
      return !!
        /*@__PURE__*/
        navigator.userAgent.match(pattern);
    }
  }

  var IE11OrLess = userAgent(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i);
  var Edge = userAgent(/Edge/i);
  var FireFox = userAgent(/firefox/i);
  var Safari = userAgent(/safari/i) && !userAgent(/chrome/i) && !userAgent(/android/i);
  var IOS = userAgent(/iP(ad|od|hone)/i);
  var ChromeForAndroid = userAgent(/chrome/i) && userAgent(/android/i);

  var captureMode = {
    capture: false,
    passive: false
  };

  function on(el, event, fn) {
    el.addEventListener(event, fn, !IE11OrLess && captureMode);
  }

  function off(el, event, fn) {
    el.removeEventListener(event, fn, !IE11OrLess && captureMode);
  }

  function matches(
    /**HTMLElement*/
    el,
    /**String*/
    selector) {
    if (!selector) return;
    selector[0] === '>' && (selector = selector.substring(1));

    if (el) {
      try {
        if (el.matches) {
          return el.matches(selector);
        } else if (el.msMatchesSelector) {
          return el.msMatchesSelector(selector);
        } else if (el.webkitMatchesSelector) {
          return el.webkitMatchesSelector(selector);
        }
      } catch (_) {
        return false;
      }
    }

    return false;
  }

  function getParentOrHost(el) {
    return el.host && el !== document && el.host.nodeType ? el.host : el.parentNode;
  }

  function closest(
    /**HTMLElement*/
    el,
    /**String*/
    selector,
    /**HTMLElement*/
    ctx, includeCTX) {
    if (el) {
      ctx = ctx || document;

      do {
        if (selector != null && (selector[0] === '>' ? el.parentNode === ctx && matches(el, selector) : matches(el, selector)) || includeCTX && el === ctx) {
          return el;
        }

        if (el === ctx) break;
        /* jshint boss:true */
      } while (el = getParentOrHost(el));
    }

    return null;
  }

  var R_SPACE = /\s+/g;

  function toggleClass(el, name, state) {
    if (el && name) {
      if (el.classList) {
        el.classList[state ? 'add' : 'remove'](name);
      } else {
        var className = (' ' + el.className + ' ').replace(R_SPACE, ' ').replace(' ' + name + ' ', ' ');
        el.className = (className + (state ? ' ' + name : '')).replace(R_SPACE, ' ');
      }
    }
  }

  function css(el, prop, val) {
    var style = el && el.style;

    if (style) {
      if (val === void 0) {
        if (document.defaultView && document.defaultView.getComputedStyle) {
          val = document.defaultView.getComputedStyle(el, '');
        } else if (el.currentStyle) {
          val = el.currentStyle;
        }

        return prop === void 0 ? val : val[prop];
      } else {
        if (!(prop in style) && prop.indexOf('webkit') === -1) {
          prop = '-webkit-' + prop;
        }

        style[prop] = val + (typeof val === 'string' ? '' : 'px');
      }
    }
  }

  function matrix(el, selfOnly) {
    var appliedTransforms = '';

    if (typeof el === 'string') {
      appliedTransforms = el;
    } else {
      do {
        var transform = css(el, 'transform');

        if (transform && transform !== 'none') {
          appliedTransforms = transform + ' ' + appliedTransforms;
        }
        /* jshint boss:true */

      } while (!selfOnly && (el = el.parentNode));
    }

    var matrixFn = window.DOMMatrix || window.WebKitCSSMatrix || window.CSSMatrix || window.MSCSSMatrix;
    /*jshint -W056 */

    return matrixFn && new matrixFn(appliedTransforms);
  }

  function find(ctx, tagName, iterator) {
    if (ctx) {
      var list = ctx.getElementsByTagName(tagName),
        i = 0,
        n = list.length;

      if (iterator) {
        for (; i < n; i++) {
          iterator(list[i], i);
        }
      }

      return list;
    }

    return [];
  }

  function getWindowScrollingElement() {
    var scrollingElement = document.scrollingElement;

    if (scrollingElement) {
      return scrollingElement;
    } else {
      return document.documentElement;
    }
  }
  /**
   * Returns the "bounding client rect" of given element
   * @param  {HTMLElement} el                       The element whose boundingClientRect is wanted
   * @param  {[Boolean]} relativeToContainingBlock  Whether the rect should be relative to the containing block of (including) the container
   * @param  {[Boolean]} relativeToNonStaticParent  Whether the rect should be relative to the relative parent of (including) the contaienr
   * @param  {[Boolean]} undoScale                  Whether the container's scale() should be undone
   * @param  {[HTMLElement]} container              The parent the element will be placed in
   * @return {Object}                               The boundingClientRect of el, with specified adjustments
   */


  function getRect(el, relativeToContainingBlock, relativeToNonStaticParent, undoScale, container) {
    if (!el.getBoundingClientRect && el !== window) return;
    var elRect, top, left, bottom, right, height, width;

    if (el !== window && el !== getWindowScrollingElement()) {
      elRect = el.getBoundingClientRect();
      top = elRect.top;
      left = elRect.left;
      bottom = elRect.bottom;
      right = elRect.right;
      height = elRect.height;
      width = elRect.width;
    } else {
      top = 0;
      left = 0;
      bottom = window.innerHeight;
      right = window.innerWidth;
      height = window.innerHeight;
      width = window.innerWidth;
    }

    if ((relativeToContainingBlock || relativeToNonStaticParent) && el !== window) {
      // Adjust for translate()
      container = container || el.parentNode; // solves #1123 (see: https://stackoverflow.com/a/37953806/6088312)
      // Not needed on <= IE11

      if (!IE11OrLess) {
        do {
          if (container && container.getBoundingClientRect && (css(container, 'transform') !== 'none' || relativeToNonStaticParent && css(container, 'position') !== 'static')) {
            var containerRect = container.getBoundingClientRect(); // Set relative to edges of padding box of container

            top -= containerRect.top + parseInt(css(container, 'border-top-width'));
            left -= containerRect.left + parseInt(css(container, 'border-left-width'));
            bottom = top + elRect.height;
            right = left + elRect.width;
            break;
          }
          /* jshint boss:true */

        } while (container = container.parentNode);
      }
    }

    if (undoScale && el !== window) {
      // Adjust for scale()
      var elMatrix = matrix(container || el),
        scaleX = elMatrix && elMatrix.a,
        scaleY = elMatrix && elMatrix.d;

      if (elMatrix) {
        top /= scaleY;
        left /= scaleX;
        width /= scaleX;
        height /= scaleY;
        bottom = top + height;
        right = left + width;
      }
    }

    return {
      top: top,
      left: left,
      bottom: bottom,
      right: right,
      width: width,
      height: height
    };
  }
  /**
   * Checks if a side of an element is scrolled past a side of its parents
   * @param  {HTMLElement}  el           The element who's side being scrolled out of view is in question
   * @param  {String}       elSide       Side of the element in question ('top', 'left', 'right', 'bottom')
   * @param  {String}       parentSide   Side of the parent in question ('top', 'left', 'right', 'bottom')
   * @return {HTMLElement}               The parent scroll element that the el's side is scrolled past, or null if there is no such element
   */


  function isScrolledPast(el, elSide, parentSide) {
    var parent = getParentAutoScrollElement(el, true),
      elSideVal = getRect(el)[elSide];
    /* jshint boss:true */

    while (parent) {
      var parentSideVal = getRect(parent)[parentSide],
        visible = void 0;

      if (parentSide === 'top' || parentSide === 'left') {
        visible = elSideVal >= parentSideVal;
      } else {
        visible = elSideVal <= parentSideVal;
      }

      if (!visible) return parent;
      if (parent === getWindowScrollingElement()) break;
      parent = getParentAutoScrollElement(parent, false);
    }

    return false;
  }
  /**
   * Gets nth child of el, ignoring hidden children, sortable's elements (does not ignore clone if it's visible)
   * and non-draggable elements
   * @param  {HTMLElement} el       The parent element
   * @param  {Number} childNum      The index of the child
   * @param  {Object} options       Parent Sortable's options
   * @return {HTMLElement}          The child at index childNum, or null if not found
   */


  function getChild(el, childNum, options) {
    var currentChild = 0,
      i = 0,
      children = el.children;

    while (i < children.length) {
      if (children[i].style.display !== 'none' && children[i] !== Sortable.ghost && children[i] !== Sortable.dragged && closest(children[i], options.draggable, el, false)) {
        if (currentChild === childNum) {
          return children[i];
        }

        currentChild++;
      }

      i++;
    }

    return null;
  }
  /**
   * Gets the last child in the el, ignoring ghostEl or invisible elements (clones)
   * @param  {HTMLElement} el       Parent element
   * @param  {selector} selector    Any other elements that should be ignored
   * @return {HTMLElement}          The last child, ignoring ghostEl
   */


  function lastChild(el, selector) {
    var last = el.lastElementChild;

    while (last && (last === Sortable.ghost || css(last, 'display') === 'none' || selector && !matches(last, selector))) {
      last = last.previousElementSibling;
    }

    return last || null;
  }
  /**
   * Returns the index of an element within its parent for a selected set of
   * elements
   * @param  {HTMLElement} el
   * @param  {selector} selector
   * @return {number}
   */


  function index(el, selector) {
    var index = 0;

    if (!el || !el.parentNode) {
      return -1;
    }
    /* jshint boss:true */


    while (el = el.previousElementSibling) {
      if (el.nodeName.toUpperCase() !== 'TEMPLATE' && el !== Sortable.clone && (!selector || matches(el, selector))) {
        index++;
      }
    }

    return index;
  }
  /**
   * Returns the scroll offset of the given element, added with all the scroll offsets of parent elements.
   * The value is returned in real pixels.
   * @param  {HTMLElement} el
   * @return {Array}             Offsets in the format of [left, top]
   */


  function getRelativeScrollOffset(el) {
    var offsetLeft = 0,
      offsetTop = 0,
      winScroller = getWindowScrollingElement();

    if (el) {
      do {
        var elMatrix = matrix(el),
          scaleX = elMatrix.a,
          scaleY = elMatrix.d;
        offsetLeft += el.scrollLeft * scaleX;
        offsetTop += el.scrollTop * scaleY;
      } while (el !== winScroller && (el = el.parentNode));
    }

    return [offsetLeft, offsetTop];
  }
  /**
   * Returns the index of the object within the given array
   * @param  {Array} arr   Array that may or may not hold the object
   * @param  {Object} obj  An object that has a key-value pair unique to and identical to a key-value pair in the object you want to find
   * @return {Number}      The index of the object in the array, or -1
   */


  function indexOfObject(arr, obj) {
    for (var i in arr) {
      if (!arr.hasOwnProperty(i)) continue;

      for (var key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] === arr[i][key]) return Number(i);
      }
    }

    return -1;
  }

  function getParentAutoScrollElement(el, includeSelf) {
    // skip to window
    if (!el || !el.getBoundingClientRect) return getWindowScrollingElement();
    var elem = el;
    var gotSelf = false;

    do {
      // we don't need to get elem css if it isn't even overflowing in the first place (performance)
      if (elem.clientWidth < elem.scrollWidth || elem.clientHeight < elem.scrollHeight) {
        var elemCSS = css(elem);

        if (elem.clientWidth < elem.scrollWidth && (elemCSS.overflowX == 'auto' || elemCSS.overflowX == 'scroll') || elem.clientHeight < elem.scrollHeight && (elemCSS.overflowY == 'auto' || elemCSS.overflowY == 'scroll')) {
          if (!elem.getBoundingClientRect || elem === document.body) return getWindowScrollingElement();
          if (gotSelf || includeSelf) return elem;
          gotSelf = true;
        }
      }
      /* jshint boss:true */

    } while (elem = elem.parentNode);

    return getWindowScrollingElement();
  }

  function extend(dst, src) {
    if (dst && src) {
      for (var key in src) {
        if (src.hasOwnProperty(key)) {
          dst[key] = src[key];
        }
      }
    }

    return dst;
  }

  function isRectEqual(rect1, rect2) {
    return Math.round(rect1.top) === Math.round(rect2.top) && Math.round(rect1.left) === Math.round(rect2.left) && Math.round(rect1.height) === Math.round(rect2.height) && Math.round(rect1.width) === Math.round(rect2.width);
  }

  var _throttleTimeout;

  function throttle(callback, ms) {
    return function () {
      if (!_throttleTimeout) {
        var args = arguments,
          _this = this;

        if (args.length === 1) {
          callback.call(_this, args[0]);
        } else {
          callback.apply(_this, args);
        }

        _throttleTimeout = setTimeout(function () {
          _throttleTimeout = void 0;
        }, ms);
      }
    };
  }

  function cancelThrottle() {
    clearTimeout(_throttleTimeout);
    _throttleTimeout = void 0;
  }

  function scrollBy(el, x, y) {
    el.scrollLeft += x;
    el.scrollTop += y;
  }

  function clone(el) {
    var Polymer = window.Polymer;
    var $ = window.jQuery || window.Zepto;

    if (Polymer && Polymer.dom) {
      return Polymer.dom(el).cloneNode(true);
    } else if ($) {
      return $(el).clone(true)[0];
    } else {
      return el.cloneNode(true);
    }
  }

  function setRect(el, rect) {
    css(el, 'position', 'absolute');
    css(el, 'top', rect.top);
    css(el, 'left', rect.left);
    css(el, 'width', rect.width);
    css(el, 'height', rect.height);
  }

  function unsetRect(el) {
    css(el, 'position', '');
    css(el, 'top', '');
    css(el, 'left', '');
    css(el, 'width', '');
    css(el, 'height', '');
  }

  var expando = 'Sortable' + new Date().getTime();

  function AnimationStateManager() {
    var animationStates = [],
      animationCallbackId;
    return {
      captureAnimationState: function captureAnimationState() {
        animationStates = [];
        if (!this.options.animation) return;
        var children = [].slice.call(this.el.children);
        children.forEach(function (child) {
          if (css(child, 'display') === 'none' || child === Sortable.ghost) return;
          animationStates.push({
            target: child,
            rect: getRect(child)
          });

          var fromRect = _objectSpread({}, animationStates[animationStates.length - 1].rect); // If animating: compensate for current animation


          if (child.thisAnimationDuration) {
            var childMatrix = matrix(child, true);

            if (childMatrix) {
              fromRect.top -= childMatrix.f;
              fromRect.left -= childMatrix.e;
            }
          }

          child.fromRect = fromRect;
        });
      },
      addAnimationState: function addAnimationState(state) {
        animationStates.push(state);
      },
      removeAnimationState: function removeAnimationState(target) {
        animationStates.splice(indexOfObject(animationStates, {
          target: target
        }), 1);
      },
      animateAll: function animateAll(callback) {
        var _this = this;

        if (!this.options.animation) {
          clearTimeout(animationCallbackId);
          if (typeof callback === 'function') callback();
          return;
        }

        var animating = false,
          animationTime = 0;
        animationStates.forEach(function (state) {
          var time = 0,
            target = state.target,
            fromRect = target.fromRect,
            toRect = getRect(target),
            prevFromRect = target.prevFromRect,
            prevToRect = target.prevToRect,
            animatingRect = state.rect,
            targetMatrix = matrix(target, true);

          if (targetMatrix) {
            // Compensate for current animation
            toRect.top -= targetMatrix.f;
            toRect.left -= targetMatrix.e;
          }

          target.toRect = toRect;

          if (target.thisAnimationDuration) {
            // Could also check if animatingRect is between fromRect and toRect
            if (isRectEqual(prevFromRect, toRect) && !isRectEqual(fromRect, toRect) && // Make sure animatingRect is on line between toRect & fromRect
              (animatingRect.top - toRect.top) / (animatingRect.left - toRect.left) === (fromRect.top - toRect.top) / (fromRect.left - toRect.left)) {
              // If returning to same place as started from animation and on same axis
              time = calculateRealTime(animatingRect, prevFromRect, prevToRect, _this.options);
            }
          } // if fromRect != toRect: animate


          if (!isRectEqual(toRect, fromRect)) {
            target.prevFromRect = fromRect;
            target.prevToRect = toRect;

            if (!time) {
              time = _this.options.animation;
            }

            _this.animate(target, animatingRect, toRect, time);
          }

          if (time) {
            animating = true;
            animationTime = Math.max(animationTime, time);
            clearTimeout(target.animationResetTimer);
            target.animationResetTimer = setTimeout(function () {
              target.animationTime = 0;
              target.prevFromRect = null;
              target.fromRect = null;
              target.prevToRect = null;
              target.thisAnimationDuration = null;
            }, time);
            target.thisAnimationDuration = time;
          }
        });
        clearTimeout(animationCallbackId);

        if (!animating) {
          if (typeof callback === 'function') callback();
        } else {
          animationCallbackId = setTimeout(function () {
            if (typeof callback === 'function') callback();
          }, animationTime);
        }

        animationStates = [];
      },
      animate: function animate(target, currentRect, toRect, duration) {
        if (duration) {
          css(target, 'transition', '');
          css(target, 'transform', '');
          var elMatrix = matrix(this.el),
            scaleX = elMatrix && elMatrix.a,
            scaleY = elMatrix && elMatrix.d,
            translateX = (currentRect.left - toRect.left) / (scaleX || 1),
            translateY = (currentRect.top - toRect.top) / (scaleY || 1);
          target.animatingX = !!translateX;
          target.animatingY = !!translateY;
          css(target, 'transform', 'translate3d(' + translateX + 'px,' + translateY + 'px,0)');
          repaint(target); // repaint

          css(target, 'transition', 'transform ' + duration + 'ms' + (this.options.easing ? ' ' + this.options.easing : ''));
          css(target, 'transform', 'translate3d(0,0,0)');
          typeof target.animated === 'number' && clearTimeout(target.animated);
          target.animated = setTimeout(function () {
            css(target, 'transition', '');
            css(target, 'transform', '');
            target.animated = false;
            target.animatingX = false;
            target.animatingY = false;
          }, duration);
        }
      }
    };
  }

  function repaint(target) {
    return target.offsetWidth;
  }

  function calculateRealTime(animatingRect, fromRect, toRect, options) {
    return Math.sqrt(Math.pow(fromRect.top - animatingRect.top, 2) + Math.pow(fromRect.left - animatingRect.left, 2)) / Math.sqrt(Math.pow(fromRect.top - toRect.top, 2) + Math.pow(fromRect.left - toRect.left, 2)) * options.animation;
  }

  var plugins = [];
  var defaults = {
    initializeByDefault: true
  };
  var PluginManager = {
    mount: function mount(plugin) {
      // Set default static properties
      for (var option in defaults) {
        if (defaults.hasOwnProperty(option) && !(option in plugin)) {
          plugin[option] = defaults[option];
        }
      }

      plugins.push(plugin);
    },
    pluginEvent: function pluginEvent(eventName, sortable, evt) {
      var _this = this;

      this.eventCanceled = false;

      evt.cancel = function () {
        _this.eventCanceled = true;
      };

      var eventNameGlobal = eventName + 'Global';
      plugins.forEach(function (plugin) {
        if (!sortable[plugin.pluginName]) return; // Fire global events if it exists in this sortable

        if (sortable[plugin.pluginName][eventNameGlobal]) {
          sortable[plugin.pluginName][eventNameGlobal](_objectSpread({
            sortable: sortable
          }, evt));
        } // Only fire plugin event if plugin is enabled in this sortable,
        // and plugin has event defined


        if (sortable.options[plugin.pluginName] && sortable[plugin.pluginName][eventName]) {
          sortable[plugin.pluginName][eventName](_objectSpread({
            sortable: sortable
          }, evt));
        }
      });
    },
    initializePlugins: function initializePlugins(sortable, el, defaults, options) {
      plugins.forEach(function (plugin) {
        var pluginName = plugin.pluginName;
        if (!sortable.options[pluginName] && !plugin.initializeByDefault) return;
        var initialized = new plugin(sortable, el, sortable.options);
        initialized.sortable = sortable;
        initialized.options = sortable.options;
        sortable[pluginName] = initialized; // Add default options from plugin

        _extends(defaults, initialized.defaults);
      });

      for (var option in sortable.options) {
        if (!sortable.options.hasOwnProperty(option)) continue;
        var modified = this.modifyOption(sortable, option, sortable.options[option]);

        if (typeof modified !== 'undefined') {
          sortable.options[option] = modified;
        }
      }
    },
    getEventProperties: function getEventProperties(name, sortable) {
      var eventProperties = {};
      plugins.forEach(function (plugin) {
        if (typeof plugin.eventProperties !== 'function') return;

        _extends(eventProperties, plugin.eventProperties.call(sortable[plugin.pluginName], name));
      });
      return eventProperties;
    },
    modifyOption: function modifyOption(sortable, name, value) {
      var modifiedValue;
      plugins.forEach(function (plugin) {
        // Plugin must exist on the Sortable
        if (!sortable[plugin.pluginName]) return; // If static option listener exists for this option, call in the context of the Sortable's instance of this plugin

        if (plugin.optionListeners && typeof plugin.optionListeners[name] === 'function') {
          modifiedValue = plugin.optionListeners[name].call(sortable[plugin.pluginName], value);
        }
      });
      return modifiedValue;
    }
  };

  function dispatchEvent(_ref) {
    var sortable = _ref.sortable,
      rootEl = _ref.rootEl,
      name = _ref.name,
      targetEl = _ref.targetEl,
      cloneEl = _ref.cloneEl,
      toEl = _ref.toEl,
      fromEl = _ref.fromEl,
      oldIndex = _ref.oldIndex,
      newIndex = _ref.newIndex,
      oldDraggableIndex = _ref.oldDraggableIndex,
      newDraggableIndex = _ref.newDraggableIndex,
      originalEvent = _ref.originalEvent,
      putSortable = _ref.putSortable,
      extraEventProperties = _ref.extraEventProperties;
    sortable = sortable || rootEl && rootEl[expando];
    if (!sortable) return;
    var evt,
      options = sortable.options,
      onName = 'on' + name.charAt(0).toUpperCase() + name.substr(1); // Support for new CustomEvent feature

    if (window.CustomEvent && !IE11OrLess && !Edge) {
      evt = new CustomEvent(name, {
        bubbles: true,
        cancelable: true
      });
    } else {
      evt = document.createEvent('Event');
      evt.initEvent(name, true, true);
    }

    evt.to = toEl || rootEl;
    evt.from = fromEl || rootEl;
    evt.item = targetEl || rootEl;
    evt.clone = cloneEl;
    evt.oldIndex = oldIndex;
    evt.newIndex = newIndex;
    evt.oldDraggableIndex = oldDraggableIndex;
    evt.newDraggableIndex = newDraggableIndex;
    evt.originalEvent = originalEvent;
    evt.pullMode = putSortable ? putSortable.lastPutMode : undefined;

    var allEventProperties = _objectSpread({}, extraEventProperties, PluginManager.getEventProperties(name, sortable));

    for (var option in allEventProperties) {
      evt[option] = allEventProperties[option];
    }

    if (rootEl) {
      rootEl.dispatchEvent(evt);
    }

    if (options[onName]) {
      options[onName].call(sortable, evt);
    }
  }

  var pluginEvent = function pluginEvent(eventName, sortable) {
    var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      originalEvent = _ref.evt,
      data = _objectWithoutProperties(_ref, ["evt"]);

    PluginManager.pluginEvent.bind(Sortable)(eventName, sortable, _objectSpread({
      dragEl: dragEl,
      parentEl: parentEl,
      ghostEl: ghostEl,
      rootEl: rootEl,
      nextEl: nextEl,
      lastDownEl: lastDownEl,
      cloneEl: cloneEl,
      cloneHidden: cloneHidden,
      dragStarted: moved,
      putSortable: putSortable,
      activeSortable: Sortable.active,
      originalEvent: originalEvent,
      oldIndex: oldIndex,
      oldDraggableIndex: oldDraggableIndex,
      newIndex: newIndex,
      newDraggableIndex: newDraggableIndex,
      hideGhostForTarget: _hideGhostForTarget,
      unhideGhostForTarget: _unhideGhostForTarget,
      cloneNowHidden: function cloneNowHidden() {
        cloneHidden = true;
      },
      cloneNowShown: function cloneNowShown() {
        cloneHidden = false;
      },
      dispatchSortableEvent: function dispatchSortableEvent(name) {
        _dispatchEvent({
          sortable: sortable,
          name: name,
          originalEvent: originalEvent
        });
      }
    }, data));
  };

  function _dispatchEvent(info) {
    dispatchEvent(_objectSpread({
      putSortable: putSortable,
      cloneEl: cloneEl,
      targetEl: dragEl,
      rootEl: rootEl,
      oldIndex: oldIndex,
      oldDraggableIndex: oldDraggableIndex,
      newIndex: newIndex,
      newDraggableIndex: newDraggableIndex
    }, info));
  }

  var dragEl,
    parentEl,
    ghostEl,
    rootEl,
    nextEl,
    lastDownEl,
    cloneEl,
    cloneHidden,
    oldIndex,
    newIndex,
    oldDraggableIndex,
    newDraggableIndex,
    activeGroup,
    putSortable,
    awaitingDragStarted = false,
    ignoreNextClick = false,
    sortables = [],
    tapEvt,
    touchEvt,
    lastDx,
    lastDy,
    tapDistanceLeft,
    tapDistanceTop,
    moved,
    lastTarget,
    lastDirection,
    pastFirstInvertThresh = false,
    isCircumstantialInvert = false,
    targetMoveDistance,
    // For positioning ghost absolutely
    ghostRelativeParent,
    ghostRelativeParentInitialScroll = [],
    // (left, top)
    _silent = false,
    savedInputChecked = [];
  /** @const */

  var documentExists = typeof document !== 'undefined',
    PositionGhostAbsolutely = IOS,
    CSSFloatProperty = Edge || IE11OrLess ? 'cssFloat' : 'float',
    // This will not pass for IE9, because IE9 DnD only works on anchors
    supportDraggable = documentExists && !ChromeForAndroid && !IOS && 'draggable' in document.createElement('div'),
    supportCssPointerEvents = function () {
      if (!documentExists) return; // false when <= IE11

      if (IE11OrLess) {
        return false;
      }

      var el = document.createElement('x');
      el.style.cssText = 'pointer-events:auto';
      return el.style.pointerEvents === 'auto';
    }(),
    _detectDirection = function _detectDirection(el, options) {
      var elCSS = css(el),
        elWidth = parseInt(elCSS.width) - parseInt(elCSS.paddingLeft) - parseInt(elCSS.paddingRight) - parseInt(elCSS.borderLeftWidth) - parseInt(elCSS.borderRightWidth),
        child1 = getChild(el, 0, options),
        child2 = getChild(el, 1, options),
        firstChildCSS = child1 && css(child1),
        secondChildCSS = child2 && css(child2),
        firstChildWidth = firstChildCSS && parseInt(firstChildCSS.marginLeft) + parseInt(firstChildCSS.marginRight) + getRect(child1).width,
        secondChildWidth = secondChildCSS && parseInt(secondChildCSS.marginLeft) + parseInt(secondChildCSS.marginRight) + getRect(child2).width;

      if (elCSS.display === 'flex') {
        return elCSS.flexDirection === 'column' || elCSS.flexDirection === 'column-reverse' ? 'vertical' : 'horizontal';
      }

      if (elCSS.display === 'grid') {
        return elCSS.gridTemplateColumns.split(' ').length <= 1 ? 'vertical' : 'horizontal';
      }

      if (child1 && firstChildCSS["float"] && firstChildCSS["float"] !== 'none') {
        var touchingSideChild2 = firstChildCSS["float"] === 'left' ? 'left' : 'right';
        return child2 && (secondChildCSS.clear === 'both' || secondChildCSS.clear === touchingSideChild2) ? 'vertical' : 'horizontal';
      }

      return child1 && (firstChildCSS.display === 'block' || firstChildCSS.display === 'flex' || firstChildCSS.display === 'table' || firstChildCSS.display === 'grid' || firstChildWidth >= elWidth && elCSS[CSSFloatProperty] === 'none' || child2 && elCSS[CSSFloatProperty] === 'none' && firstChildWidth + secondChildWidth > elWidth) ? 'vertical' : 'horizontal';
    },
    _dragElInRowColumn = function _dragElInRowColumn(dragRect, targetRect, vertical) {
      var dragElS1Opp = vertical ? dragRect.left : dragRect.top,
        dragElS2Opp = vertical ? dragRect.right : dragRect.bottom,
        dragElOppLength = vertical ? dragRect.width : dragRect.height,
        targetS1Opp = vertical ? targetRect.left : targetRect.top,
        targetS2Opp = vertical ? targetRect.right : targetRect.bottom,
        targetOppLength = vertical ? targetRect.width : targetRect.height;
      return dragElS1Opp === targetS1Opp || dragElS2Opp === targetS2Opp || dragElS1Opp + dragElOppLength / 2 === targetS1Opp + targetOppLength / 2;
    },

    /**
     * Detects first nearest empty sortable to X and Y position using emptyInsertThreshold.
     * @param  {Number} x      X position
     * @param  {Number} y      Y position
     * @return {HTMLElement}   Element of the first found nearest Sortable
     */
    _detectNearestEmptySortable = function _detectNearestEmptySortable(x, y) {
      var ret;
      sortables.some(function (sortable) {
        if (lastChild(sortable)) return;
        var rect = getRect(sortable),
          threshold = sortable[expando].options.emptyInsertThreshold,
          insideHorizontally = x >= rect.left - threshold && x <= rect.right + threshold,
          insideVertically = y >= rect.top - threshold && y <= rect.bottom + threshold;

        if (threshold && insideHorizontally && insideVertically) {
          return ret = sortable;
        }
      });
      return ret;
    },
    _prepareGroup = function _prepareGroup(options) {
      function toFn(value, pull) {
        return function (to, from, dragEl, evt) {
          var sameGroup = to.options.group.name && from.options.group.name && to.options.group.name === from.options.group.name;

          if (value == null && (pull || sameGroup)) {
            // Default pull value
            // Default pull and put value if same group
            return true;
          } else if (value == null || value === false) {
            return false;
          } else if (pull && value === 'clone') {
            return value;
          } else if (typeof value === 'function') {
            return toFn(value(to, from, dragEl, evt), pull)(to, from, dragEl, evt);
          } else {
            var otherGroup = (pull ? to : from).options.group.name;
            return value === true || typeof value === 'string' && value === otherGroup || value.join && value.indexOf(otherGroup) > -1;
          }
        };
      }

      var group = {};
      var originalGroup = options.group;

      if (!originalGroup || _typeof(originalGroup) != 'object') {
        originalGroup = {
          name: originalGroup
        };
      }

      group.name = originalGroup.name;
      group.checkPull = toFn(originalGroup.pull, true);
      group.checkPut = toFn(originalGroup.put);
      group.revertClone = originalGroup.revertClone;
      options.group = group;
    },
    _hideGhostForTarget = function _hideGhostForTarget() {
      if (!supportCssPointerEvents && ghostEl) {
        css(ghostEl, 'display', 'none');
      }
    },
    _unhideGhostForTarget = function _unhideGhostForTarget() {
      if (!supportCssPointerEvents && ghostEl) {
        css(ghostEl, 'display', '');
      }
    }; // #1184 fix - Prevent click event on fallback if dragged but item not changed position


  if (documentExists) {
    document.addEventListener('click', function (evt) {
      if (ignoreNextClick) {
        evt.preventDefault();
        evt.stopPropagation && evt.stopPropagation();
        evt.stopImmediatePropagation && evt.stopImmediatePropagation();
        ignoreNextClick = false;
        return false;
      }
    }, true);
  }

  var nearestEmptyInsertDetectEvent = function nearestEmptyInsertDetectEvent(evt) {
    if (dragEl) {
      evt = evt.touches ? evt.touches[0] : evt;

      var nearest = _detectNearestEmptySortable(evt.clientX, evt.clientY);

      if (nearest) {
        // Create imitation event
        var event = {};

        for (var i in evt) {
          if (evt.hasOwnProperty(i)) {
            event[i] = evt[i];
          }
        }

        event.target = event.rootEl = nearest;
        event.preventDefault = void 0;
        event.stopPropagation = void 0;

        nearest[expando]._onDragOver(event);
      }
    }
  };

  var _checkOutsideTargetEl = function _checkOutsideTargetEl(evt) {
    if (dragEl) {
      dragEl.parentNode[expando]._isOutsideThisEl(evt.target);
    }
  };
  /**
   * @class  Sortable
   * @param  {HTMLElement}  el
   * @param  {Object}       [options]
   */


  function Sortable(el, options) {
    if (!(el && el.nodeType && el.nodeType === 1)) {
      throw "Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(el));
    }

    this.el = el; // root element

    this.options = options = _extends({}, options); // Export instance

    el[expando] = this;
    var defaults = {
      group: null,
      sort: true,
      disabled: false,
      store: null,
      handle: null,
      draggable: /^[uo]l$/i.test(el.nodeName) ? '>li' : '>*',
      swapThreshold: 1,
      // percentage; 0 <= x <= 1
      invertSwap: false,
      // invert always
      invertedSwapThreshold: null,
      // will be set to same as swapThreshold if default
      removeCloneOnHide: true,
      direction: function direction() {
        return _detectDirection(el, this.options);
      },
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      ignore: 'a, img',
      filter: null,
      preventOnFilter: true,
      animation: 0,
      easing: null,
      setData: function setData(dataTransfer, dragEl) {
        dataTransfer.setData('Text', dragEl.textContent);
      },
      dropBubble: false,
      dragoverBubble: false,
      dataIdAttr: 'data-id',
      delay: 0,
      delayOnTouchOnly: false,
      touchStartThreshold: (Number.parseInt ? Number : window).parseInt(window.devicePixelRatio, 10) || 1,
      forceFallback: false,
      fallbackClass: 'sortable-fallback',
      fallbackOnBody: false,
      fallbackTolerance: 0,
      fallbackOffset: {
        x: 0,
        y: 0
      },
      supportPointer: Sortable.supportPointer !== false && 'PointerEvent' in window,
      emptyInsertThreshold: 5
    };
    PluginManager.initializePlugins(this, el, defaults); // Set default options

    for (var name in defaults) {
      !(name in options) && (options[name] = defaults[name]);
    }

    _prepareGroup(options); // Bind all private methods


    for (var fn in this) {
      if (fn.charAt(0) === '_' && typeof this[fn] === 'function') {
        this[fn] = this[fn].bind(this);
      }
    } // Setup drag mode


    this.nativeDraggable = options.forceFallback ? false : supportDraggable;

    if (this.nativeDraggable) {
      // Touch start threshold cannot be greater than the native dragstart threshold
      this.options.touchStartThreshold = 1;
    } // Bind events


    if (options.supportPointer) {
      on(el, 'pointerdown', this._onTapStart);
    } else {
      on(el, 'mousedown', this._onTapStart);
      on(el, 'touchstart', this._onTapStart);
    }

    if (this.nativeDraggable) {
      on(el, 'dragover', this);
      on(el, 'dragenter', this);
    }

    sortables.push(this.el); // Restore sorting

    options.store && options.store.get && this.sort(options.store.get(this) || []); // Add animation state manager

    _extends(this, AnimationStateManager());
  }

  Sortable.prototype =
    /** @lends Sortable.prototype */
    {
      constructor: Sortable,
      _isOutsideThisEl: function _isOutsideThisEl(target) {
        if (!this.el.contains(target) && target !== this.el) {
          lastTarget = null;
        }
      },
      _getDirection: function _getDirection(evt, target) {
        return typeof this.options.direction === 'function' ? this.options.direction.call(this, evt, target, dragEl) : this.options.direction;
      },
      _onTapStart: function _onTapStart(
        /** Event|TouchEvent */
        evt) {
        if (!evt.cancelable) return;

        var _this = this,
          el = this.el,
          options = this.options,
          preventOnFilter = options.preventOnFilter,
          type = evt.type,
          touch = evt.touches && evt.touches[0] || evt.pointerType && evt.pointerType === 'touch' && evt,
          target = (touch || evt).target,
          originalTarget = evt.target.shadowRoot && (evt.path && evt.path[0] || evt.composedPath && evt.composedPath()[0]) || target,
          filter = options.filter;

        _saveInputCheckedState(el); // Don't trigger start event when an element is been dragged, otherwise the evt.oldindex always wrong when set option.group.


        if (dragEl) {
          return;
        }

        if (/mousedown|pointerdown/.test(type) && evt.button !== 0 || options.disabled) {
          return; // only left button and enabled
        } // cancel dnd if original target is content editable


        if (originalTarget.isContentEditable) {
          return;
        }

        target = closest(target, options.draggable, el, false);

        if (target && target.animated) {
          return;
        }

        if (lastDownEl === target) {
          // Ignoring duplicate `down`
          return;
        } // Get the index of the dragged element within its parent


        oldIndex = index(target);
        oldDraggableIndex = index(target, options.draggable); // Check filter

        if (typeof filter === 'function') {
          if (filter.call(this, evt, target, this)) {
            _dispatchEvent({
              sortable: _this,
              rootEl: originalTarget,
              name: 'filter',
              targetEl: target,
              toEl: el,
              fromEl: el
            });

            pluginEvent('filter', _this, {
              evt: evt
            });
            preventOnFilter && evt.cancelable && evt.preventDefault();
            return; // cancel dnd
          }
        } else if (filter) {
          filter = filter.split(',').some(function (criteria) {
            criteria = closest(originalTarget, criteria.trim(), el, false);

            if (criteria) {
              _dispatchEvent({
                sortable: _this,
                rootEl: criteria,
                name: 'filter',
                targetEl: target,
                fromEl: el,
                toEl: el
              });

              pluginEvent('filter', _this, {
                evt: evt
              });
              return true;
            }
          });

          if (filter) {
            preventOnFilter && evt.cancelable && evt.preventDefault();
            return; // cancel dnd
          }
        }

        if (options.handle && !closest(originalTarget, options.handle, el, false)) {
          return;
        } // Prepare `dragstart`


        this._prepareDragStart(evt, touch, target);
      },
      _prepareDragStart: function _prepareDragStart(
        /** Event */
        evt,
        /** Touch */
        touch,
        /** HTMLElement */
        target) {
        var _this = this,
          el = _this.el,
          options = _this.options,
          ownerDocument = el.ownerDocument,
          dragStartFn;

        if (target && !dragEl && target.parentNode === el) {
          var dragRect = getRect(target);
          rootEl = el;
          dragEl = target;
          parentEl = dragEl.parentNode;
          nextEl = dragEl.nextSibling;
          lastDownEl = target;
          activeGroup = options.group;
          Sortable.dragged = dragEl;
          tapEvt = {
            target: dragEl,
            clientX: (touch || evt).clientX,
            clientY: (touch || evt).clientY
          };
          tapDistanceLeft = tapEvt.clientX - dragRect.left;
          tapDistanceTop = tapEvt.clientY - dragRect.top;
          this._lastX = (touch || evt).clientX;
          this._lastY = (touch || evt).clientY;
          dragEl.style['will-change'] = 'all';

          dragStartFn = function dragStartFn() {
            pluginEvent('delayEnded', _this, {
              evt: evt
            });

            if (Sortable.eventCanceled) {
              _this._onDrop();

              return;
            } // Delayed drag has been triggered
            // we can re-enable the events: touchmove/mousemove


            _this._disableDelayedDragEvents();

            if (!FireFox && _this.nativeDraggable) {
              dragEl.draggable = true;
            } // Bind the events: dragstart/dragend


            _this._triggerDragStart(evt, touch); // Drag start event


            _dispatchEvent({
              sortable: _this,
              name: 'choose',
              originalEvent: evt
            }); // Chosen item


            toggleClass(dragEl, options.chosenClass, true);
          }; // Disable "draggable"


          options.ignore.split(',').forEach(function (criteria) {
            find(dragEl, criteria.trim(), _disableDraggable);
          });
          on(ownerDocument, 'dragover', nearestEmptyInsertDetectEvent);
          on(ownerDocument, 'mousemove', nearestEmptyInsertDetectEvent);
          on(ownerDocument, 'touchmove', nearestEmptyInsertDetectEvent);
          on(ownerDocument, 'mouseup', _this._onDrop);
          on(ownerDocument, 'touchend', _this._onDrop);
          on(ownerDocument, 'touchcancel', _this._onDrop); // Make dragEl draggable (must be before delay for FireFox)

          if (FireFox && this.nativeDraggable) {
            this.options.touchStartThreshold = 4;
            dragEl.draggable = true;
          }

          pluginEvent('delayStart', this, {
            evt: evt
          }); // Delay is impossible for native DnD in Edge or IE

          if (options.delay && (!options.delayOnTouchOnly || touch) && (!this.nativeDraggable || !(Edge || IE11OrLess))) {
            if (Sortable.eventCanceled) {
              this._onDrop();

              return;
            } // If the user moves the pointer or let go the click or touch
            // before the delay has been reached:
            // disable the delayed drag


            on(ownerDocument, 'mouseup', _this._disableDelayedDrag);
            on(ownerDocument, 'touchend', _this._disableDelayedDrag);
            on(ownerDocument, 'touchcancel', _this._disableDelayedDrag);
            on(ownerDocument, 'mousemove', _this._delayedDragTouchMoveHandler);
            on(ownerDocument, 'touchmove', _this._delayedDragTouchMoveHandler);
            options.supportPointer && on(ownerDocument, 'pointermove', _this._delayedDragTouchMoveHandler);
            _this._dragStartTimer = setTimeout(dragStartFn, options.delay);
          } else {
            dragStartFn();
          }
        }
      },
      _delayedDragTouchMoveHandler: function _delayedDragTouchMoveHandler(
        /** TouchEvent|PointerEvent **/
        e) {
        var touch = e.touches ? e.touches[0] : e;

        if (Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) >= Math.floor(this.options.touchStartThreshold / (this.nativeDraggable && window.devicePixelRatio || 1))) {
          this._disableDelayedDrag();
        }
      },
      _disableDelayedDrag: function _disableDelayedDrag() {
        dragEl && _disableDraggable(dragEl);
        clearTimeout(this._dragStartTimer);

        this._disableDelayedDragEvents();
      },
      _disableDelayedDragEvents: function _disableDelayedDragEvents() {
        var ownerDocument = this.el.ownerDocument;
        off(ownerDocument, 'mouseup', this._disableDelayedDrag);
        off(ownerDocument, 'touchend', this._disableDelayedDrag);
        off(ownerDocument, 'touchcancel', this._disableDelayedDrag);
        off(ownerDocument, 'mousemove', this._delayedDragTouchMoveHandler);
        off(ownerDocument, 'touchmove', this._delayedDragTouchMoveHandler);
        off(ownerDocument, 'pointermove', this._delayedDragTouchMoveHandler);
      },
      _triggerDragStart: function _triggerDragStart(
        /** Event */
        evt,
        /** Touch */
        touch) {
        touch = touch || evt.pointerType == 'touch' && evt;

        if (!this.nativeDraggable || touch) {
          if (this.options.supportPointer) {
            on(document, 'pointermove', this._onTouchMove);
          } else if (touch) {
            on(document, 'touchmove', this._onTouchMove);
          } else {
            on(document, 'mousemove', this._onTouchMove);
          }
        } else {
          on(dragEl, 'dragend', this);
          on(rootEl, 'dragstart', this._onDragStart);
        }

        try {
          if (document.selection) {
            // Timeout neccessary for IE9
            _nextTick(function () {
              document.selection.empty();
            });
          } else {
            window.getSelection().removeAllRanges();
          }
        } catch (err) {}
      },
      _dragStarted: function _dragStarted(fallback, evt) {

        awaitingDragStarted = false;

        if (rootEl && dragEl) {
          pluginEvent('dragStarted', this, {
            evt: evt
          });

          if (this.nativeDraggable) {
            on(document, 'dragover', _checkOutsideTargetEl);
          }

          var options = this.options; // Apply effect

          !fallback && toggleClass(dragEl, options.dragClass, false);
          toggleClass(dragEl, options.ghostClass, true);
          Sortable.active = this;
          fallback && this._appendGhost(); // Drag start event

          _dispatchEvent({
            sortable: this,
            name: 'start',
            originalEvent: evt
          });
        } else {
          this._nulling();
        }
      },
      _emulateDragOver: function _emulateDragOver() {
        if (touchEvt) {
          this._lastX = touchEvt.clientX;
          this._lastY = touchEvt.clientY;

          _hideGhostForTarget();

          var target = document.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
          var parent = target;

          while (target && target.shadowRoot) {
            target = target.shadowRoot.elementFromPoint(touchEvt.clientX, touchEvt.clientY);
            if (target === parent) break;
            parent = target;
          }

          dragEl.parentNode[expando]._isOutsideThisEl(target);

          if (parent) {
            do {
              if (parent[expando]) {
                var inserted = void 0;
                inserted = parent[expando]._onDragOver({
                  clientX: touchEvt.clientX,
                  clientY: touchEvt.clientY,
                  target: target,
                  rootEl: parent
                });

                if (inserted && !this.options.dragoverBubble) {
                  break;
                }
              }

              target = parent; // store last element
            }
              /* jshint boss:true */
            while (parent = parent.parentNode);
          }

          _unhideGhostForTarget();
        }
      },
      _onTouchMove: function _onTouchMove(
        /**TouchEvent*/
        evt) {
        if (tapEvt) {
          var options = this.options,
            fallbackTolerance = options.fallbackTolerance,
            fallbackOffset = options.fallbackOffset,
            touch = evt.touches ? evt.touches[0] : evt,
            ghostMatrix = ghostEl && matrix(ghostEl, true),
            scaleX = ghostEl && ghostMatrix && ghostMatrix.a,
            scaleY = ghostEl && ghostMatrix && ghostMatrix.d,
            relativeScrollOffset = PositionGhostAbsolutely && ghostRelativeParent && getRelativeScrollOffset(ghostRelativeParent),
            dx = (touch.clientX - tapEvt.clientX + fallbackOffset.x) / (scaleX || 1) + (relativeScrollOffset ? relativeScrollOffset[0] - ghostRelativeParentInitialScroll[0] : 0) / (scaleX || 1),
            dy = (touch.clientY - tapEvt.clientY + fallbackOffset.y) / (scaleY || 1) + (relativeScrollOffset ? relativeScrollOffset[1] - ghostRelativeParentInitialScroll[1] : 0) / (scaleY || 1); // only set the status to dragging, when we are actually dragging

          if (!Sortable.active && !awaitingDragStarted) {
            if (fallbackTolerance && Math.max(Math.abs(touch.clientX - this._lastX), Math.abs(touch.clientY - this._lastY)) < fallbackTolerance) {
              return;
            }

            this._onDragStart(evt, true);
          }

          if (ghostEl) {
            if (ghostMatrix) {
              ghostMatrix.e += dx - (lastDx || 0);
              ghostMatrix.f += dy - (lastDy || 0);
            } else {
              ghostMatrix = {
                a: 1,
                b: 0,
                c: 0,
                d: 1,
                e: dx,
                f: dy
              };
            }

            var cssMatrix = "matrix(".concat(ghostMatrix.a, ",").concat(ghostMatrix.b, ",").concat(ghostMatrix.c, ",").concat(ghostMatrix.d, ",").concat(ghostMatrix.e, ",").concat(ghostMatrix.f, ")");
            css(ghostEl, 'webkitTransform', cssMatrix);
            css(ghostEl, 'mozTransform', cssMatrix);
            css(ghostEl, 'msTransform', cssMatrix);
            css(ghostEl, 'transform', cssMatrix);
            lastDx = dx;
            lastDy = dy;
            touchEvt = touch;
          }

          evt.cancelable && evt.preventDefault();
        }
      },
      _appendGhost: function _appendGhost() {
        // Bug if using scale(): https://stackoverflow.com/questions/2637058
        // Not being adjusted for
        if (!ghostEl) {
          var container = this.options.fallbackOnBody ? document.body : rootEl,
            rect = getRect(dragEl, true, PositionGhostAbsolutely, true, container),
            options = this.options; // Position absolutely

          if (PositionGhostAbsolutely) {
            // Get relatively positioned parent
            ghostRelativeParent = container;

            while (css(ghostRelativeParent, 'position') === 'static' && css(ghostRelativeParent, 'transform') === 'none' && ghostRelativeParent !== document) {
              ghostRelativeParent = ghostRelativeParent.parentNode;
            }

            if (ghostRelativeParent !== document.body && ghostRelativeParent !== document.documentElement) {
              if (ghostRelativeParent === document) ghostRelativeParent = getWindowScrollingElement();
              rect.top += ghostRelativeParent.scrollTop;
              rect.left += ghostRelativeParent.scrollLeft;
            } else {
              ghostRelativeParent = getWindowScrollingElement();
            }

            ghostRelativeParentInitialScroll = getRelativeScrollOffset(ghostRelativeParent);
          }

          ghostEl = dragEl.cloneNode(true);
          toggleClass(ghostEl, options.ghostClass, false);
          toggleClass(ghostEl, options.fallbackClass, true);
          toggleClass(ghostEl, options.dragClass, true);
          css(ghostEl, 'transition', '');
          css(ghostEl, 'transform', '');
          css(ghostEl, 'box-sizing', 'border-box');
          css(ghostEl, 'margin', 0);
          css(ghostEl, 'top', rect.top);
          css(ghostEl, 'left', rect.left);
          css(ghostEl, 'width', rect.width);
          css(ghostEl, 'height', rect.height);
          css(ghostEl, 'opacity', '0.8');
          css(ghostEl, 'position', PositionGhostAbsolutely ? 'absolute' : 'fixed');
          css(ghostEl, 'zIndex', '100000');
          css(ghostEl, 'pointerEvents', 'none');
          Sortable.ghost = ghostEl;
          container.appendChild(ghostEl); // Set transform-origin

          css(ghostEl, 'transform-origin', tapDistanceLeft / parseInt(ghostEl.style.width) * 100 + '% ' + tapDistanceTop / parseInt(ghostEl.style.height) * 100 + '%');
        }
      },
      _onDragStart: function _onDragStart(
        /**Event*/
        evt,
        /**boolean*/
        fallback) {
        var _this = this;

        var dataTransfer = evt.dataTransfer;
        var options = _this.options;
        pluginEvent('dragStart', this, {
          evt: evt
        });

        if (Sortable.eventCanceled) {
          this._onDrop();

          return;
        }

        pluginEvent('setupClone', this);

        if (!Sortable.eventCanceled) {
          cloneEl = clone(dragEl);
          cloneEl.draggable = false;
          cloneEl.style['will-change'] = '';

          this._hideClone();

          toggleClass(cloneEl, this.options.chosenClass, false);
          Sortable.clone = cloneEl;
        } // #1143: IFrame support workaround


        _this.cloneId = _nextTick(function () {
          pluginEvent('clone', _this);
          if (Sortable.eventCanceled) return;

          if (!_this.options.removeCloneOnHide) {
            rootEl.insertBefore(cloneEl, dragEl);
          }

          _this._hideClone();

          _dispatchEvent({
            sortable: _this,
            name: 'clone'
          });
        });
        !fallback && toggleClass(dragEl, options.dragClass, true); // Set proper drop events

        if (fallback) {
          ignoreNextClick = true;
          _this._loopId = setInterval(_this._emulateDragOver, 50);
        } else {
          // Undo what was set in _prepareDragStart before drag started
          off(document, 'mouseup', _this._onDrop);
          off(document, 'touchend', _this._onDrop);
          off(document, 'touchcancel', _this._onDrop);

          if (dataTransfer) {
            dataTransfer.effectAllowed = 'move';
            options.setData && options.setData.call(_this, dataTransfer, dragEl);
          }

          on(document, 'drop', _this); // #1276 fix:

          css(dragEl, 'transform', 'translateZ(0)');
        }

        awaitingDragStarted = true;
        _this._dragStartId = _nextTick(_this._dragStarted.bind(_this, fallback, evt));
        on(document, 'selectstart', _this);
        moved = true;

        if (Safari) {
          css(document.body, 'user-select', 'none');
        }
      },
      // Returns true - if no further action is needed (either inserted or another condition)
      _onDragOver: function _onDragOver(
        /**Event*/
        evt) {
        var el = this.el,
          target = evt.target,
          dragRect,
          targetRect,
          revert,
          options = this.options,
          group = options.group,
          activeSortable = Sortable.active,
          isOwner = activeGroup === group,
          canSort = options.sort,
          fromSortable = putSortable || activeSortable,
          vertical,
          _this = this,
          completedFired = false;

        if (_silent) return;

        function dragOverEvent(name, extra) {
          pluginEvent(name, _this, _objectSpread({
            evt: evt,
            isOwner: isOwner,
            axis: vertical ? 'vertical' : 'horizontal',
            revert: revert,
            dragRect: dragRect,
            targetRect: targetRect,
            canSort: canSort,
            fromSortable: fromSortable,
            target: target,
            completed: completed,
            onMove: function onMove(target, after) {
              return _onMove(rootEl, el, dragEl, dragRect, target, getRect(target), evt, after);
            },
            changed: changed
          }, extra));
        } // Capture animation state


        function capture() {
          dragOverEvent('dragOverAnimationCapture');

          _this.captureAnimationState();

          if (_this !== fromSortable) {
            fromSortable.captureAnimationState();
          }
        } // Return invocation when dragEl is inserted (or completed)


        function completed(insertion) {
          dragOverEvent('dragOverCompleted', {
            insertion: insertion
          });

          if (insertion) {
            // Clones must be hidden before folding animation to capture dragRectAbsolute properly
            if (isOwner) {
              activeSortable._hideClone();
            } else {
              activeSortable._showClone(_this);
            }

            if (_this !== fromSortable) {
              // Set ghost class to new sortable's ghost class
              toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : activeSortable.options.ghostClass, false);
              toggleClass(dragEl, options.ghostClass, true);
            }

            if (putSortable !== _this && _this !== Sortable.active) {
              putSortable = _this;
            } else if (_this === Sortable.active && putSortable) {
              putSortable = null;
            } // Animation


            if (fromSortable === _this) {
              _this._ignoreWhileAnimating = target;
            }

            _this.animateAll(function () {
              dragOverEvent('dragOverAnimationComplete');
              _this._ignoreWhileAnimating = null;
            });

            if (_this !== fromSortable) {
              fromSortable.animateAll();
              fromSortable._ignoreWhileAnimating = null;
            }
          } // Null lastTarget if it is not inside a previously swapped element


          if (target === dragEl && !dragEl.animated || target === el && !target.animated) {
            lastTarget = null;
          } // no bubbling and not fallback


          if (!options.dragoverBubble && !evt.rootEl && target !== document) {
            dragEl.parentNode[expando]._isOutsideThisEl(evt.target); // Do not detect for empty insert if already inserted


            !insertion && nearestEmptyInsertDetectEvent(evt);
          }

          !options.dragoverBubble && evt.stopPropagation && evt.stopPropagation();
          return completedFired = true;
        } // Call when dragEl has been inserted


        function changed() {
          newIndex = index(dragEl);
          newDraggableIndex = index(dragEl, options.draggable);

          _dispatchEvent({
            sortable: _this,
            name: 'change',
            toEl: el,
            newIndex: newIndex,
            newDraggableIndex: newDraggableIndex,
            originalEvent: evt
          });
        }

        if (evt.preventDefault !== void 0) {
          evt.cancelable && evt.preventDefault();
        }

        target = closest(target, options.draggable, el, true);
        dragOverEvent('dragOver');
        if (Sortable.eventCanceled) return completedFired;

        if (dragEl.contains(evt.target) || target.animated && target.animatingX && target.animatingY || _this._ignoreWhileAnimating === target) {
          return completed(false);
        }

        ignoreNextClick = false;

        if (activeSortable && !options.disabled && (isOwner ? canSort || (revert = !rootEl.contains(dragEl)) // Reverting item into the original list
          : putSortable === this || (this.lastPutMode = activeGroup.checkPull(this, activeSortable, dragEl, evt)) && group.checkPut(this, activeSortable, dragEl, evt))) {
          vertical = this._getDirection(evt, target) === 'vertical';
          dragRect = getRect(dragEl);
          dragOverEvent('dragOverValid');
          if (Sortable.eventCanceled) return completedFired;

          if (revert) {
            parentEl = rootEl; // actualization

            capture();

            this._hideClone();

            dragOverEvent('revert');

            if (!Sortable.eventCanceled) {
              if (nextEl) {
                rootEl.insertBefore(dragEl, nextEl);
              } else {
                rootEl.appendChild(dragEl);
              }
            }

            return completed(true);
          }

          var elLastChild = lastChild(el, options.draggable);

          if (!elLastChild || _ghostIsLast(evt, vertical, this) && !elLastChild.animated) {
            // If already at end of list: Do not insert
            if (elLastChild === dragEl) {
              return completed(false);
            } // assign target only if condition is true


            if (elLastChild && el === evt.target) {
              target = elLastChild;
            }

            if (target) {
              targetRect = getRect(target);
            }

            if (_onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, !!target) !== false) {
              capture();
              el.appendChild(dragEl);
              parentEl = el; // actualization

              changed();
              return completed(true);
            }
          } else if (target.parentNode === el) {
            targetRect = getRect(target);
            var direction = 0,
              targetBeforeFirstSwap,
              differentLevel = dragEl.parentNode !== el,
              differentRowCol = !_dragElInRowColumn(dragEl.animated && dragEl.toRect || dragRect, target.animated && target.toRect || targetRect, vertical),
              side1 = vertical ? 'top' : 'left',
              scrolledPastTop = isScrolledPast(target, 'top', 'top') || isScrolledPast(dragEl, 'top', 'top'),
              scrollBefore = scrolledPastTop ? scrolledPastTop.scrollTop : void 0;

            if (lastTarget !== target) {
              targetBeforeFirstSwap = targetRect[side1];
              pastFirstInvertThresh = false;
              isCircumstantialInvert = !differentRowCol && options.invertSwap || differentLevel;
            }

            direction = _getSwapDirection(evt, target, targetRect, vertical, differentRowCol ? 1 : options.swapThreshold, options.invertedSwapThreshold == null ? options.swapThreshold : options.invertedSwapThreshold, isCircumstantialInvert, lastTarget === target);
            var sibling;

            if (direction !== 0) {
              // Check if target is beside dragEl in respective direction (ignoring hidden elements)
              var dragIndex = index(dragEl);

              do {
                dragIndex -= direction;
                sibling = parentEl.children[dragIndex];
              } while (sibling && (css(sibling, 'display') === 'none' || sibling === ghostEl));
            } // If dragEl is already beside target: Do not insert


            if (direction === 0 || sibling === target) {
              return completed(false);
            }

            lastTarget = target;
            lastDirection = direction;
            var nextSibling = target.nextElementSibling,
              after = false;
            after = direction === 1;

            var moveVector = _onMove(rootEl, el, dragEl, dragRect, target, targetRect, evt, after);

            if (moveVector !== false) {
              if (moveVector === 1 || moveVector === -1) {
                after = moveVector === 1;
              }

              _silent = true;
              setTimeout(_unsilent, 30);
              capture();

              if (after && !nextSibling) {
                el.appendChild(dragEl);
              } else {
                target.parentNode.insertBefore(dragEl, after ? nextSibling : target);
              } // Undo chrome's scroll adjustment (has no effect on other browsers)


              if (scrolledPastTop) {
                scrollBy(scrolledPastTop, 0, scrollBefore - scrolledPastTop.scrollTop);
              }

              parentEl = dragEl.parentNode; // actualization
              // must be done before animation

              if (targetBeforeFirstSwap !== undefined && !isCircumstantialInvert) {
                targetMoveDistance = Math.abs(targetBeforeFirstSwap - getRect(target)[side1]);
              }

              changed();
              return completed(true);
            }
          }

          if (el.contains(dragEl)) {
            return completed(false);
          }
        }

        return false;
      },
      _ignoreWhileAnimating: null,
      _offMoveEvents: function _offMoveEvents() {
        off(document, 'mousemove', this._onTouchMove);
        off(document, 'touchmove', this._onTouchMove);
        off(document, 'pointermove', this._onTouchMove);
        off(document, 'dragover', nearestEmptyInsertDetectEvent);
        off(document, 'mousemove', nearestEmptyInsertDetectEvent);
        off(document, 'touchmove', nearestEmptyInsertDetectEvent);
      },
      _offUpEvents: function _offUpEvents() {
        var ownerDocument = this.el.ownerDocument;
        off(ownerDocument, 'mouseup', this._onDrop);
        off(ownerDocument, 'touchend', this._onDrop);
        off(ownerDocument, 'pointerup', this._onDrop);
        off(ownerDocument, 'touchcancel', this._onDrop);
        off(document, 'selectstart', this);
      },
      _onDrop: function _onDrop(
        /**Event*/
        evt) {
        var el = this.el,
          options = this.options; // Get the index of the dragged element within its parent

        newIndex = index(dragEl);
        newDraggableIndex = index(dragEl, options.draggable);
        pluginEvent('drop', this, {
          evt: evt
        });
        parentEl = dragEl && dragEl.parentNode; // Get again after plugin event

        newIndex = index(dragEl);
        newDraggableIndex = index(dragEl, options.draggable);

        if (Sortable.eventCanceled) {
          this._nulling();

          return;
        }

        awaitingDragStarted = false;
        isCircumstantialInvert = false;
        pastFirstInvertThresh = false;
        clearInterval(this._loopId);
        clearTimeout(this._dragStartTimer);

        _cancelNextTick(this.cloneId);

        _cancelNextTick(this._dragStartId); // Unbind events


        if (this.nativeDraggable) {
          off(document, 'drop', this);
          off(el, 'dragstart', this._onDragStart);
        }

        this._offMoveEvents();

        this._offUpEvents();

        if (Safari) {
          css(document.body, 'user-select', '');
        }

        css(dragEl, 'transform', '');

        if (evt) {
          if (moved) {
            evt.cancelable && evt.preventDefault();
            !options.dropBubble && evt.stopPropagation();
          }

          ghostEl && ghostEl.parentNode && ghostEl.parentNode.removeChild(ghostEl);

          if (rootEl === parentEl || putSortable && putSortable.lastPutMode !== 'clone') {
            // Remove clone(s)
            cloneEl && cloneEl.parentNode && cloneEl.parentNode.removeChild(cloneEl);
          }

          if (dragEl) {
            if (this.nativeDraggable) {
              off(dragEl, 'dragend', this);
            }

            _disableDraggable(dragEl);

            dragEl.style['will-change'] = ''; // Remove classes
            // ghostClass is added in dragStarted

            if (moved && !awaitingDragStarted) {
              toggleClass(dragEl, putSortable ? putSortable.options.ghostClass : this.options.ghostClass, false);
            }

            toggleClass(dragEl, this.options.chosenClass, false); // Drag stop event

            _dispatchEvent({
              sortable: this,
              name: 'unchoose',
              toEl: parentEl,
              newIndex: null,
              newDraggableIndex: null,
              originalEvent: evt
            });

            if (rootEl !== parentEl) {
              if (newIndex >= 0) {
                // Add event
                _dispatchEvent({
                  rootEl: parentEl,
                  name: 'add',
                  toEl: parentEl,
                  fromEl: rootEl,
                  originalEvent: evt
                }); // Remove event


                _dispatchEvent({
                  sortable: this,
                  name: 'remove',
                  toEl: parentEl,
                  originalEvent: evt
                }); // drag from one list and drop into another


                _dispatchEvent({
                  rootEl: parentEl,
                  name: 'sort',
                  toEl: parentEl,
                  fromEl: rootEl,
                  originalEvent: evt
                });

                _dispatchEvent({
                  sortable: this,
                  name: 'sort',
                  toEl: parentEl,
                  originalEvent: evt
                });
              }

              putSortable && putSortable.save();
            } else {
              if (newIndex !== oldIndex) {
                if (newIndex >= 0) {
                  // drag & drop within the same list
                  _dispatchEvent({
                    sortable: this,
                    name: 'update',
                    toEl: parentEl,
                    originalEvent: evt
                  });

                  _dispatchEvent({
                    sortable: this,
                    name: 'sort',
                    toEl: parentEl,
                    originalEvent: evt
                  });
                }
              }
            }

            if (Sortable.active) {
              /* jshint eqnull:true */
              if (newIndex == null || newIndex === -1) {
                newIndex = oldIndex;
                newDraggableIndex = oldDraggableIndex;
              }

              _dispatchEvent({
                sortable: this,
                name: 'end',
                toEl: parentEl,
                originalEvent: evt
              }); // Save sorting


              this.save();
            }
          }
        }

        this._nulling();
      },
      _nulling: function _nulling() {
        pluginEvent('nulling', this);
        rootEl = dragEl = parentEl = ghostEl = nextEl = cloneEl = lastDownEl = cloneHidden = tapEvt = touchEvt = moved = newIndex = newDraggableIndex = oldIndex = oldDraggableIndex = lastTarget = lastDirection = putSortable = activeGroup = Sortable.dragged = Sortable.ghost = Sortable.clone = Sortable.active = null;
        savedInputChecked.forEach(function (el) {
          el.checked = true;
        });
        savedInputChecked.length = lastDx = lastDy = 0;
      },
      handleEvent: function handleEvent(
        /**Event*/
        evt) {
        switch (evt.type) {
          case 'drop':
          case 'dragend':
            this._onDrop(evt);

            break;

          case 'dragenter':
          case 'dragover':
            if (dragEl) {
              this._onDragOver(evt);

              _globalDragOver(evt);
            }

            break;

          case 'selectstart':
            evt.preventDefault();
            break;
        }
      },

      /**
       * Serializes the item into an array of string.
       * @returns {String[]}
       */
      toArray: function toArray() {
        var order = [],
          el,
          children = this.el.children,
          i = 0,
          n = children.length,
          options = this.options;

        for (; i < n; i++) {
          el = children[i];

          if (closest(el, options.draggable, this.el, false)) {
            order.push(el.getAttribute(options.dataIdAttr) || _generateId(el));
          }
        }

        return order;
      },

      /**
       * Sorts the elements according to the array.
       * @param  {String[]}  order  order of the items
       */
      sort: function sort(order) {
        var items = {},
          rootEl = this.el;
        this.toArray().forEach(function (id, i) {
          var el = rootEl.children[i];

          if (closest(el, this.options.draggable, rootEl, false)) {
            items[id] = el;
          }
        }, this);
        order.forEach(function (id) {
          if (items[id]) {
            rootEl.removeChild(items[id]);
            rootEl.appendChild(items[id]);
          }
        });
      },

      /**
       * Save the current sorting
       */
      save: function save() {
        var store = this.options.store;
        store && store.set && store.set(this);
      },

      /**
       * For each element in the set, get the first element that matches the selector by testing the element itself and traversing up through its ancestors in the DOM tree.
       * @param   {HTMLElement}  el
       * @param   {String}       [selector]  default: `options.draggable`
       * @returns {HTMLElement|null}
       */
      closest: function closest$1(el, selector) {
        return closest(el, selector || this.options.draggable, this.el, false);
      },

      /**
       * Set/get option
       * @param   {string} name
       * @param   {*}      [value]
       * @returns {*}
       */
      option: function option(name, value) {
        var options = this.options;

        if (value === void 0) {
          return options[name];
        } else {
          var modifiedValue = PluginManager.modifyOption(this, name, value);

          if (typeof modifiedValue !== 'undefined') {
            options[name] = modifiedValue;
          } else {
            options[name] = value;
          }

          if (name === 'group') {
            _prepareGroup(options);
          }
        }
      },

      /**
       * Destroy
       */
      destroy: function destroy() {
        pluginEvent('destroy', this);
        var el = this.el;
        el[expando] = null;
        off(el, 'mousedown', this._onTapStart);
        off(el, 'touchstart', this._onTapStart);
        off(el, 'pointerdown', this._onTapStart);

        if (this.nativeDraggable) {
          off(el, 'dragover', this);
          off(el, 'dragenter', this);
        } // Remove draggable attributes


        Array.prototype.forEach.call(el.querySelectorAll('[draggable]'), function (el) {
          el.removeAttribute('draggable');
        });

        this._onDrop();

        this._disableDelayedDragEvents();

        sortables.splice(sortables.indexOf(this.el), 1);
        this.el = el = null;
      },
      _hideClone: function _hideClone() {
        if (!cloneHidden) {
          pluginEvent('hideClone', this);
          if (Sortable.eventCanceled) return;
          css(cloneEl, 'display', 'none');

          if (this.options.removeCloneOnHide && cloneEl.parentNode) {
            cloneEl.parentNode.removeChild(cloneEl);
          }

          cloneHidden = true;
        }
      },
      _showClone: function _showClone(putSortable) {
        if (putSortable.lastPutMode !== 'clone') {
          this._hideClone();

          return;
        }

        if (cloneHidden) {
          pluginEvent('showClone', this);
          if (Sortable.eventCanceled) return; // show clone at dragEl or original position

          if (rootEl.contains(dragEl) && !this.options.group.revertClone) {
            rootEl.insertBefore(cloneEl, dragEl);
          } else if (nextEl) {
            rootEl.insertBefore(cloneEl, nextEl);
          } else {
            rootEl.appendChild(cloneEl);
          }

          if (this.options.group.revertClone) {
            this.animate(dragEl, cloneEl);
          }

          css(cloneEl, 'display', '');
          cloneHidden = false;
        }
      }
    };

  function _globalDragOver(
    /**Event*/
    evt) {
    if (evt.dataTransfer) {
      evt.dataTransfer.dropEffect = 'move';
    }

    evt.cancelable && evt.preventDefault();
  }

  function _onMove(fromEl, toEl, dragEl, dragRect, targetEl, targetRect, originalEvent, willInsertAfter) {
    var evt,
      sortable = fromEl[expando],
      onMoveFn = sortable.options.onMove,
      retVal; // Support for new CustomEvent feature

    if (window.CustomEvent && !IE11OrLess && !Edge) {
      evt = new CustomEvent('move', {
        bubbles: true,
        cancelable: true
      });
    } else {
      evt = document.createEvent('Event');
      evt.initEvent('move', true, true);
    }

    evt.to = toEl;
    evt.from = fromEl;
    evt.dragged = dragEl;
    evt.draggedRect = dragRect;
    evt.related = targetEl || toEl;
    evt.relatedRect = targetRect || getRect(toEl);
    evt.willInsertAfter = willInsertAfter;
    evt.originalEvent = originalEvent;
    fromEl.dispatchEvent(evt);

    if (onMoveFn) {
      retVal = onMoveFn.call(sortable, evt, originalEvent);
    }

    return retVal;
  }

  function _disableDraggable(el) {
    el.draggable = false;
  }

  function _unsilent() {
    _silent = false;
  }

  function _ghostIsLast(evt, vertical, sortable) {
    var rect = getRect(lastChild(sortable.el, sortable.options.draggable));
    var spacer = 10;
    return vertical ? evt.clientX > rect.right + spacer || evt.clientX <= rect.right && evt.clientY > rect.bottom && evt.clientX >= rect.left : evt.clientX > rect.right && evt.clientY > rect.top || evt.clientX <= rect.right && evt.clientY > rect.bottom + spacer;
  }

  function _getSwapDirection(evt, target, targetRect, vertical, swapThreshold, invertedSwapThreshold, invertSwap, isLastTarget) {
    var mouseOnAxis = vertical ? evt.clientY : evt.clientX,
      targetLength = vertical ? targetRect.height : targetRect.width,
      targetS1 = vertical ? targetRect.top : targetRect.left,
      targetS2 = vertical ? targetRect.bottom : targetRect.right,
      invert = false;

    if (!invertSwap) {
      // Never invert or create dragEl shadow when target movemenet causes mouse to move past the end of regular swapThreshold
      if (isLastTarget && targetMoveDistance < targetLength * swapThreshold) {
        // multiplied only by swapThreshold because mouse will already be inside target by (1 - threshold) * targetLength / 2
        // check if past first invert threshold on side opposite of lastDirection
        if (!pastFirstInvertThresh && (lastDirection === 1 ? mouseOnAxis > targetS1 + targetLength * invertedSwapThreshold / 2 : mouseOnAxis < targetS2 - targetLength * invertedSwapThreshold / 2)) {
          // past first invert threshold, do not restrict inverted threshold to dragEl shadow
          pastFirstInvertThresh = true;
        }

        if (!pastFirstInvertThresh) {
          // dragEl shadow (target move distance shadow)
          if (lastDirection === 1 ? mouseOnAxis < targetS1 + targetMoveDistance // over dragEl shadow
            : mouseOnAxis > targetS2 - targetMoveDistance) {
            return -lastDirection;
          }
        } else {
          invert = true;
        }
      } else {
        // Regular
        if (mouseOnAxis > targetS1 + targetLength * (1 - swapThreshold) / 2 && mouseOnAxis < targetS2 - targetLength * (1 - swapThreshold) / 2) {
          return _getInsertDirection(target);
        }
      }
    }

    invert = invert || invertSwap;

    if (invert) {
      // Invert of regular
      if (mouseOnAxis < targetS1 + targetLength * invertedSwapThreshold / 2 || mouseOnAxis > targetS2 - targetLength * invertedSwapThreshold / 2) {
        return mouseOnAxis > targetS1 + targetLength / 2 ? 1 : -1;
      }
    }

    return 0;
  }
  /**
   * Gets the direction dragEl must be swapped relative to target in order to make it
   * seem that dragEl has been "inserted" into that element's position
   * @param  {HTMLElement} target       The target whose position dragEl is being inserted at
   * @return {Number}                   Direction dragEl must be swapped
   */


  function _getInsertDirection(target) {
    if (index(dragEl) < index(target)) {
      return 1;
    } else {
      return -1;
    }
  }
  /**
   * Generate id
   * @param   {HTMLElement} el
   * @returns {String}
   * @private
   */


  function _generateId(el) {
    var str = el.tagName + el.className + el.src + el.href + el.textContent,
      i = str.length,
      sum = 0;

    while (i--) {
      sum += str.charCodeAt(i);
    }

    return sum.toString(36);
  }

  function _saveInputCheckedState(root) {
    savedInputChecked.length = 0;
    var inputs = root.getElementsByTagName('input');
    var idx = inputs.length;

    while (idx--) {
      var el = inputs[idx];
      el.checked && savedInputChecked.push(el);
    }
  }

  function _nextTick(fn) {
    return setTimeout(fn, 0);
  }

  function _cancelNextTick(id) {
    return clearTimeout(id);
  } // Fixed #973:


  if (documentExists) {
    on(document, 'touchmove', function (evt) {
      if ((Sortable.active || awaitingDragStarted) && evt.cancelable) {
        evt.preventDefault();
      }
    });
  } // Export utils


  Sortable.utils = {
    on: on,
    off: off,
    css: css,
    find: find,
    is: function is(el, selector) {
      return !!closest(el, selector, el, false);
    },
    extend: extend,
    throttle: throttle,
    closest: closest,
    toggleClass: toggleClass,
    clone: clone,
    index: index,
    nextTick: _nextTick,
    cancelNextTick: _cancelNextTick,
    detectDirection: _detectDirection,
    getChild: getChild
  };
  /**
   * Get the Sortable instance of an element
   * @param  {HTMLElement} element The element
   * @return {Sortable|undefined}         The instance of Sortable
   */

  Sortable.get = function (element) {
    return element[expando];
  };
  /**
   * Mount a plugin to Sortable
   * @param  {...SortablePlugin|SortablePlugin[]} plugins       Plugins being mounted
   */


  Sortable.mount = function () {
    for (var _len = arguments.length, plugins = new Array(_len), _key = 0; _key < _len; _key++) {
      plugins[_key] = arguments[_key];
    }

    if (plugins[0].constructor === Array) plugins = plugins[0];
    plugins.forEach(function (plugin) {
      if (!plugin.prototype || !plugin.prototype.constructor) {
        throw "Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(plugin));
      }

      if (plugin.utils) Sortable.utils = _objectSpread({}, Sortable.utils, plugin.utils);
      PluginManager.mount(plugin);
    });
  };
  /**
   * Create sortable instance
   * @param {HTMLElement}  el
   * @param {Object}      [options]
   */


  Sortable.create = function (el, options) {
    return new Sortable(el, options);
  }; // Export


  Sortable.version = version;

  var autoScrolls = [],
    scrollEl,
    scrollRootEl,
    scrolling = false,
    lastAutoScrollX,
    lastAutoScrollY,
    touchEvt$1,
    pointerElemChangedInterval;

  function AutoScrollPlugin() {
    function AutoScroll() {
      this.defaults = {
        scroll: true,
        scrollSensitivity: 30,
        scrollSpeed: 10,
        bubbleScroll: true
      }; // Bind all private methods

      for (var fn in this) {
        if (fn.charAt(0) === '_' && typeof this[fn] === 'function') {
          this[fn] = this[fn].bind(this);
        }
      }
    }

    AutoScroll.prototype = {
      dragStarted: function dragStarted(_ref) {
        var originalEvent = _ref.originalEvent;

        if (this.sortable.nativeDraggable) {
          on(document, 'dragover', this._handleAutoScroll);
        } else {
          if (this.options.supportPointer) {
            on(document, 'pointermove', this._handleFallbackAutoScroll);
          } else if (originalEvent.touches) {
            on(document, 'touchmove', this._handleFallbackAutoScroll);
          } else {
            on(document, 'mousemove', this._handleFallbackAutoScroll);
          }
        }
      },
      dragOverCompleted: function dragOverCompleted(_ref2) {
        var originalEvent = _ref2.originalEvent;

        // For when bubbling is canceled and using fallback (fallback 'touchmove' always reached)
        if (!this.options.dragOverBubble && !originalEvent.rootEl) {
          this._handleAutoScroll(originalEvent);
        }
      },
      drop: function drop() {
        if (this.sortable.nativeDraggable) {
          off(document, 'dragover', this._handleAutoScroll);
        } else {
          off(document, 'pointermove', this._handleFallbackAutoScroll);
          off(document, 'touchmove', this._handleFallbackAutoScroll);
          off(document, 'mousemove', this._handleFallbackAutoScroll);
        }

        clearPointerElemChangedInterval();
        clearAutoScrolls();
        cancelThrottle();
      },
      nulling: function nulling() {
        touchEvt$1 = scrollRootEl = scrollEl = scrolling = pointerElemChangedInterval = lastAutoScrollX = lastAutoScrollY = null;
        autoScrolls.length = 0;
      },
      _handleFallbackAutoScroll: function _handleFallbackAutoScroll(evt) {
        this._handleAutoScroll(evt, true);
      },
      _handleAutoScroll: function _handleAutoScroll(evt, fallback) {
        var _this = this;

        var x = (evt.touches ? evt.touches[0] : evt).clientX,
          y = (evt.touches ? evt.touches[0] : evt).clientY,
          elem = document.elementFromPoint(x, y);
        touchEvt$1 = evt; // IE does not seem to have native autoscroll,
        // Edge's autoscroll seems too conditional,
        // MACOS Safari does not have autoscroll,
        // Firefox and Chrome are good

        if (fallback || Edge || IE11OrLess || Safari) {
          autoScroll(evt, this.options, elem, fallback); // Listener for pointer element change

          var ogElemScroller = getParentAutoScrollElement(elem, true);

          if (scrolling && (!pointerElemChangedInterval || x !== lastAutoScrollX || y !== lastAutoScrollY)) {
            pointerElemChangedInterval && clearPointerElemChangedInterval(); // Detect for pointer elem change, emulating native DnD behaviour

            pointerElemChangedInterval = setInterval(function () {
              var newElem = getParentAutoScrollElement(document.elementFromPoint(x, y), true);

              if (newElem !== ogElemScroller) {
                ogElemScroller = newElem;
                clearAutoScrolls();
              }

              autoScroll(evt, _this.options, newElem, fallback);
            }, 10);
            lastAutoScrollX = x;
            lastAutoScrollY = y;
          }
        } else {
          // if DnD is enabled (and browser has good autoscrolling), first autoscroll will already scroll, so get parent autoscroll of first autoscroll
          if (!this.options.bubbleScroll || getParentAutoScrollElement(elem, true) === getWindowScrollingElement()) {
            clearAutoScrolls();
            return;
          }

          autoScroll(evt, this.options, getParentAutoScrollElement(elem, false), false);
        }
      }
    };
    return _extends(AutoScroll, {
      pluginName: 'scroll',
      initializeByDefault: true
    });
  }

  function clearAutoScrolls() {
    autoScrolls.forEach(function (autoScroll) {
      clearInterval(autoScroll.pid);
    });
    autoScrolls = [];
  }

  function clearPointerElemChangedInterval() {
    clearInterval(pointerElemChangedInterval);
  }

  var autoScroll = throttle(function (evt, options, rootEl, isFallback) {
    // Bug: https://bugzilla.mozilla.org/show_bug.cgi?id=505521
    if (!options.scroll) return;
    var x = (evt.touches ? evt.touches[0] : evt).clientX,
      y = (evt.touches ? evt.touches[0] : evt).clientY,
      sens = options.scrollSensitivity,
      speed = options.scrollSpeed,
      winScroller = getWindowScrollingElement();
    var scrollThisInstance = false,
      scrollCustomFn; // New scroll root, set scrollEl

    if (scrollRootEl !== rootEl) {
      scrollRootEl = rootEl;
      clearAutoScrolls();
      scrollEl = options.scroll;
      scrollCustomFn = options.scrollFn;

      if (scrollEl === true) {
        scrollEl = getParentAutoScrollElement(rootEl, true);
      }
    }

    var layersOut = 0;
    var currentParent = scrollEl;

    do {
      var el = currentParent,
        rect = getRect(el),
        top = rect.top,
        bottom = rect.bottom,
        left = rect.left,
        right = rect.right,
        width = rect.width,
        height = rect.height,
        canScrollX = void 0,
        canScrollY = void 0,
        scrollWidth = el.scrollWidth,
        scrollHeight = el.scrollHeight,
        elCSS = css(el),
        scrollPosX = el.scrollLeft,
        scrollPosY = el.scrollTop;

      if (el === winScroller) {
        canScrollX = width < scrollWidth && (elCSS.overflowX === 'auto' || elCSS.overflowX === 'scroll' || elCSS.overflowX === 'visible');
        canScrollY = height < scrollHeight && (elCSS.overflowY === 'auto' || elCSS.overflowY === 'scroll' || elCSS.overflowY === 'visible');
      } else {
        canScrollX = width < scrollWidth && (elCSS.overflowX === 'auto' || elCSS.overflowX === 'scroll');
        canScrollY = height < scrollHeight && (elCSS.overflowY === 'auto' || elCSS.overflowY === 'scroll');
      }

      var vx = canScrollX && (Math.abs(right - x) <= sens && scrollPosX + width < scrollWidth) - (Math.abs(left - x) <= sens && !!scrollPosX);
      var vy = canScrollY && (Math.abs(bottom - y) <= sens && scrollPosY + height < scrollHeight) - (Math.abs(top - y) <= sens && !!scrollPosY);

      if (!autoScrolls[layersOut]) {
        for (var i = 0; i <= layersOut; i++) {
          if (!autoScrolls[i]) {
            autoScrolls[i] = {};
          }
        }
      }

      if (autoScrolls[layersOut].vx != vx || autoScrolls[layersOut].vy != vy || autoScrolls[layersOut].el !== el) {
        autoScrolls[layersOut].el = el;
        autoScrolls[layersOut].vx = vx;
        autoScrolls[layersOut].vy = vy;
        clearInterval(autoScrolls[layersOut].pid);

        if (vx != 0 || vy != 0) {
          scrollThisInstance = true;
          /* jshint loopfunc:true */

          autoScrolls[layersOut].pid = setInterval(function () {
            // emulate drag over during autoscroll (fallback), emulating native DnD behaviour
            if (isFallback && this.layer === 0) {
              Sortable.active._onTouchMove(touchEvt$1); // To move ghost if it is positioned absolutely

            }

            var scrollOffsetY = autoScrolls[this.layer].vy ? autoScrolls[this.layer].vy * speed : 0;
            var scrollOffsetX = autoScrolls[this.layer].vx ? autoScrolls[this.layer].vx * speed : 0;

            if (typeof scrollCustomFn === 'function') {
              if (scrollCustomFn.call(Sortable.dragged.parentNode[expando], scrollOffsetX, scrollOffsetY, evt, touchEvt$1, autoScrolls[this.layer].el) !== 'continue') {
                return;
              }
            }

            scrollBy(autoScrolls[this.layer].el, scrollOffsetX, scrollOffsetY);
          }.bind({
            layer: layersOut
          }), 24);
        }
      }

      layersOut++;
    } while (options.bubbleScroll && currentParent !== winScroller && (currentParent = getParentAutoScrollElement(currentParent, false)));

    scrolling = scrollThisInstance; // in case another function catches scrolling as false in between when it is not
  }, 30);

  var drop = function drop(_ref) {
    var originalEvent = _ref.originalEvent,
      putSortable = _ref.putSortable,
      dragEl = _ref.dragEl,
      activeSortable = _ref.activeSortable,
      dispatchSortableEvent = _ref.dispatchSortableEvent,
      hideGhostForTarget = _ref.hideGhostForTarget,
      unhideGhostForTarget = _ref.unhideGhostForTarget;
    if (!originalEvent) return;
    var toSortable = putSortable || activeSortable;
    hideGhostForTarget();
    var touch = originalEvent.changedTouches && originalEvent.changedTouches.length ? originalEvent.changedTouches[0] : originalEvent;
    var target = document.elementFromPoint(touch.clientX, touch.clientY);
    unhideGhostForTarget();

    if (toSortable && !toSortable.el.contains(target)) {
      dispatchSortableEvent('spill');
      this.onSpill({
        dragEl: dragEl,
        putSortable: putSortable
      });
    }
  };

  function Revert() {}

  Revert.prototype = {
    startIndex: null,
    dragStart: function dragStart(_ref2) {
      var oldDraggableIndex = _ref2.oldDraggableIndex;
      this.startIndex = oldDraggableIndex;
    },
    onSpill: function onSpill(_ref3) {
      var dragEl = _ref3.dragEl,
        putSortable = _ref3.putSortable;
      this.sortable.captureAnimationState();

      if (putSortable) {
        putSortable.captureAnimationState();
      }

      var nextSibling = getChild(this.sortable.el, this.startIndex, this.options);

      if (nextSibling) {
        this.sortable.el.insertBefore(dragEl, nextSibling);
      } else {
        this.sortable.el.appendChild(dragEl);
      }

      this.sortable.animateAll();

      if (putSortable) {
        putSortable.animateAll();
      }
    },
    drop: drop
  };

  _extends(Revert, {
    pluginName: 'revertOnSpill'
  });

  function Remove() {}

  Remove.prototype = {
    onSpill: function onSpill(_ref4) {
      var dragEl = _ref4.dragEl,
        putSortable = _ref4.putSortable;
      var parentSortable = putSortable || this.sortable;
      parentSortable.captureAnimationState();
      dragEl.parentNode && dragEl.parentNode.removeChild(dragEl);
      parentSortable.animateAll();
    },
    drop: drop
  };

  _extends(Remove, {
    pluginName: 'removeOnSpill'
  });

  var lastSwapEl;

  function SwapPlugin() {
    function Swap() {
      this.defaults = {
        swapClass: 'sortable-swap-highlight'
      };
    }

    Swap.prototype = {
      dragStart: function dragStart(_ref) {
        var dragEl = _ref.dragEl;
        lastSwapEl = dragEl;
      },
      dragOverValid: function dragOverValid(_ref2) {
        var completed = _ref2.completed,
          target = _ref2.target,
          onMove = _ref2.onMove,
          activeSortable = _ref2.activeSortable,
          changed = _ref2.changed,
          cancel = _ref2.cancel;
        if (!activeSortable.options.swap) return;
        var el = this.sortable.el,
          options = this.options;

        if (target && target !== el) {
          var prevSwapEl = lastSwapEl;

          if (onMove(target) !== false) {
            toggleClass(target, options.swapClass, true);
            lastSwapEl = target;
          } else {
            lastSwapEl = null;
          }

          if (prevSwapEl && prevSwapEl !== lastSwapEl) {
            toggleClass(prevSwapEl, options.swapClass, false);
          }
        }

        changed();
        completed(true);
        cancel();
      },
      drop: function drop(_ref3) {
        var activeSortable = _ref3.activeSortable,
          putSortable = _ref3.putSortable,
          dragEl = _ref3.dragEl;
        var toSortable = putSortable || this.sortable;
        var options = this.options;
        lastSwapEl && toggleClass(lastSwapEl, options.swapClass, false);

        if (lastSwapEl && (options.swap || putSortable && putSortable.options.swap)) {
          if (dragEl !== lastSwapEl) {
            toSortable.captureAnimationState();
            if (toSortable !== activeSortable) activeSortable.captureAnimationState();
            swapNodes(dragEl, lastSwapEl);
            toSortable.animateAll();
            if (toSortable !== activeSortable) activeSortable.animateAll();
          }
        }
      },
      nulling: function nulling() {
        lastSwapEl = null;
      }
    };
    return _extends(Swap, {
      pluginName: 'swap',
      eventProperties: function eventProperties() {
        return {
          swapItem: lastSwapEl
        };
      }
    });
  }

  function swapNodes(n1, n2) {
    var p1 = n1.parentNode,
      p2 = n2.parentNode,
      i1,
      i2;
    if (!p1 || !p2 || p1.isEqualNode(n2) || p2.isEqualNode(n1)) return;
    i1 = index(n1);
    i2 = index(n2);

    if (p1.isEqualNode(p2) && i1 < i2) {
      i2++;
    }

    p1.insertBefore(n2, p1.children[i1]);
    p2.insertBefore(n1, p2.children[i2]);
  }

  var multiDragElements = [],
    multiDragClones = [],
    lastMultiDragSelect,
    // for selection with modifier key down (SHIFT)
    multiDragSortable,
    initialFolding = false,
    // Initial multi-drag fold when drag started
    folding = false,
    // Folding any other time
    dragStarted = false,
    dragEl$1,
    clonesFromRect,
    clonesHidden;

  function MultiDragPlugin() {
    function MultiDrag(sortable) {
      // Bind all private methods
      for (var fn in this) {
        if (fn.charAt(0) === '_' && typeof this[fn] === 'function') {
          this[fn] = this[fn].bind(this);
        }
      }

      if (sortable.options.supportPointer) {
        on(document, 'pointerup', this._deselectMultiDrag);
      } else {
        on(document, 'mouseup', this._deselectMultiDrag);
        on(document, 'touchend', this._deselectMultiDrag);
      }

      on(document, 'keydown', this._checkKeyDown);
      on(document, 'keyup', this._checkKeyUp);
      this.defaults = {
        selectedClass: 'sortable-selected',
        multiDragKey: null,
        setData: function setData(dataTransfer, dragEl) {
          var data = '';

          if (multiDragElements.length && multiDragSortable === sortable) {
            multiDragElements.forEach(function (multiDragElement, i) {
              data += (!i ? '' : ', ') + multiDragElement.textContent;
            });
          } else {
            data = dragEl.textContent;
          }

          dataTransfer.setData('Text', data);
        }
      };
    }

    MultiDrag.prototype = {
      multiDragKeyDown: false,
      isMultiDrag: false,
      delayStartGlobal: function delayStartGlobal(_ref) {
        var dragged = _ref.dragEl;
        dragEl$1 = dragged;
      },
      delayEnded: function delayEnded() {
        this.isMultiDrag = ~multiDragElements.indexOf(dragEl$1);
      },
      setupClone: function setupClone(_ref2) {
        var sortable = _ref2.sortable,
          cancel = _ref2.cancel;
        if (!this.isMultiDrag) return;

        for (var i = 0; i < multiDragElements.length; i++) {
          multiDragClones.push(clone(multiDragElements[i]));
          multiDragClones[i].sortableIndex = multiDragElements[i].sortableIndex;
          multiDragClones[i].draggable = false;
          multiDragClones[i].style['will-change'] = '';
          toggleClass(multiDragClones[i], this.options.selectedClass, false);
          multiDragElements[i] === dragEl$1 && toggleClass(multiDragClones[i], this.options.chosenClass, false);
        }

        sortable._hideClone();

        cancel();
      },
      clone: function clone(_ref3) {
        var sortable = _ref3.sortable,
          rootEl = _ref3.rootEl,
          dispatchSortableEvent = _ref3.dispatchSortableEvent,
          cancel = _ref3.cancel;
        if (!this.isMultiDrag) return;

        if (!this.options.removeCloneOnHide) {
          if (multiDragElements.length && multiDragSortable === sortable) {
            insertMultiDragClones(true, rootEl);
            dispatchSortableEvent('clone');
            cancel();
          }
        }
      },
      showClone: function showClone(_ref4) {
        var cloneNowShown = _ref4.cloneNowShown,
          rootEl = _ref4.rootEl,
          cancel = _ref4.cancel;
        if (!this.isMultiDrag) return;
        insertMultiDragClones(false, rootEl);
        multiDragClones.forEach(function (clone) {
          css(clone, 'display', '');
        });
        cloneNowShown();
        clonesHidden = false;
        cancel();
      },
      hideClone: function hideClone(_ref5) {
        var _this = this;

        var sortable = _ref5.sortable,
          cloneNowHidden = _ref5.cloneNowHidden,
          cancel = _ref5.cancel;
        if (!this.isMultiDrag) return;
        multiDragClones.forEach(function (clone) {
          css(clone, 'display', 'none');

          if (_this.options.removeCloneOnHide && clone.parentNode) {
            clone.parentNode.removeChild(clone);
          }
        });
        cloneNowHidden();
        clonesHidden = true;
        cancel();
      },
      dragStartGlobal: function dragStartGlobal(_ref6) {
        var sortable = _ref6.sortable;

        if (!this.isMultiDrag && multiDragSortable) {
          multiDragSortable.multiDrag._deselectMultiDrag();
        }

        multiDragElements.forEach(function (multiDragElement) {
          multiDragElement.sortableIndex = index(multiDragElement);
        }); // Sort multi-drag elements

        multiDragElements = multiDragElements.sort(function (a, b) {
          return a.sortableIndex - b.sortableIndex;
        });
        dragStarted = true;
      },
      dragStarted: function dragStarted(_ref7) {
        var _this2 = this;

        var sortable = _ref7.sortable;
        if (!this.isMultiDrag) return;

        if (this.options.sort) {
          // Capture rects,
          // hide multi drag elements (by positioning them absolute),
          // set multi drag elements rects to dragRect,
          // show multi drag elements,
          // animate to rects,
          // unset rects & remove from DOM
          sortable.captureAnimationState();

          if (this.options.animation) {
            multiDragElements.forEach(function (multiDragElement) {
              if (multiDragElement === dragEl$1) return;
              css(multiDragElement, 'position', 'absolute');
            });
            var dragRect = getRect(dragEl$1, false, true, true);
            multiDragElements.forEach(function (multiDragElement) {
              if (multiDragElement === dragEl$1) return;
              setRect(multiDragElement, dragRect);
            });
            folding = true;
            initialFolding = true;
          }
        }

        sortable.animateAll(function () {
          folding = false;
          initialFolding = false;

          if (_this2.options.animation) {
            multiDragElements.forEach(function (multiDragElement) {
              unsetRect(multiDragElement);
            });
          } // Remove all auxiliary multidrag items from el, if sorting enabled


          if (_this2.options.sort) {
            removeMultiDragElements();
          }
        });
      },
      dragOver: function dragOver(_ref8) {
        var target = _ref8.target,
          completed = _ref8.completed,
          cancel = _ref8.cancel;

        if (folding && ~multiDragElements.indexOf(target)) {
          completed(false);
          cancel();
        }
      },
      revert: function revert(_ref9) {
        var fromSortable = _ref9.fromSortable,
          rootEl = _ref9.rootEl,
          sortable = _ref9.sortable,
          dragRect = _ref9.dragRect;

        if (multiDragElements.length > 1) {
          // Setup unfold animation
          multiDragElements.forEach(function (multiDragElement) {
            sortable.addAnimationState({
              target: multiDragElement,
              rect: folding ? getRect(multiDragElement) : dragRect
            });
            unsetRect(multiDragElement);
            multiDragElement.fromRect = dragRect;
            fromSortable.removeAnimationState(multiDragElement);
          });
          folding = false;
          insertMultiDragElements(!this.options.removeCloneOnHide, rootEl);
        }
      },
      dragOverCompleted: function dragOverCompleted(_ref10) {
        var sortable = _ref10.sortable,
          isOwner = _ref10.isOwner,
          insertion = _ref10.insertion,
          activeSortable = _ref10.activeSortable,
          parentEl = _ref10.parentEl,
          putSortable = _ref10.putSortable;
        var options = this.options;

        if (insertion) {
          // Clones must be hidden before folding animation to capture dragRectAbsolute properly
          if (isOwner) {
            activeSortable._hideClone();
          }

          initialFolding = false; // If leaving sort:false root, or already folding - Fold to new location

          if (options.animation && multiDragElements.length > 1 && (folding || !isOwner && !activeSortable.options.sort && !putSortable)) {
            // Fold: Set all multi drag elements's rects to dragEl's rect when multi-drag elements are invisible
            var dragRectAbsolute = getRect(dragEl$1, false, true, true);
            multiDragElements.forEach(function (multiDragElement) {
              if (multiDragElement === dragEl$1) return;
              setRect(multiDragElement, dragRectAbsolute); // Move element(s) to end of parentEl so that it does not interfere with multi-drag clones insertion if they are inserted
              // while folding, and so that we can capture them again because old sortable will no longer be fromSortable

              parentEl.appendChild(multiDragElement);
            });
            folding = true;
          } // Clones must be shown (and check to remove multi drags) after folding when interfering multiDragElements are moved out


          if (!isOwner) {
            // Only remove if not folding (folding will remove them anyways)
            if (!folding) {
              removeMultiDragElements();
            }

            if (multiDragElements.length > 1) {
              var clonesHiddenBefore = clonesHidden;

              activeSortable._showClone(sortable); // Unfold animation for clones if showing from hidden


              if (activeSortable.options.animation && !clonesHidden && clonesHiddenBefore) {
                multiDragClones.forEach(function (clone) {
                  activeSortable.addAnimationState({
                    target: clone,
                    rect: clonesFromRect
                  });
                  clone.fromRect = clonesFromRect;
                  clone.thisAnimationDuration = null;
                });
              }
            } else {
              activeSortable._showClone(sortable);
            }
          }
        }
      },
      dragOverAnimationCapture: function dragOverAnimationCapture(_ref11) {
        var dragRect = _ref11.dragRect,
          isOwner = _ref11.isOwner,
          activeSortable = _ref11.activeSortable;
        multiDragElements.forEach(function (multiDragElement) {
          multiDragElement.thisAnimationDuration = null;
        });

        if (activeSortable.options.animation && !isOwner && activeSortable.multiDrag.isMultiDrag) {
          clonesFromRect = _extends({}, dragRect);
          var dragMatrix = matrix(dragEl$1, true);
          clonesFromRect.top -= dragMatrix.f;
          clonesFromRect.left -= dragMatrix.e;
        }
      },
      dragOverAnimationComplete: function dragOverAnimationComplete() {
        if (folding) {
          folding = false;
          removeMultiDragElements();
        }
      },
      drop: function drop(_ref12) {
        var evt = _ref12.originalEvent,
          rootEl = _ref12.rootEl,
          parentEl = _ref12.parentEl,
          sortable = _ref12.sortable,
          dispatchSortableEvent = _ref12.dispatchSortableEvent,
          oldIndex = _ref12.oldIndex,
          putSortable = _ref12.putSortable;
        var toSortable = putSortable || this.sortable;
        if (!evt) return;
        var options = this.options,
          children = parentEl.children; // Multi-drag selection

        if (!dragStarted) {
          if (options.multiDragKey && !this.multiDragKeyDown) {
            this._deselectMultiDrag();
          }

          toggleClass(dragEl$1, options.selectedClass, !~multiDragElements.indexOf(dragEl$1));

          if (!~multiDragElements.indexOf(dragEl$1)) {
            multiDragElements.push(dragEl$1);
            dispatchEvent({
              sortable: sortable,
              rootEl: rootEl,
              name: 'select',
              targetEl: dragEl$1,
              originalEvt: evt
            }); // Modifier activated, select from last to dragEl

            if (evt.shiftKey && lastMultiDragSelect && sortable.el.contains(lastMultiDragSelect)) {
              var lastIndex = index(lastMultiDragSelect),
                currentIndex = index(dragEl$1);

              if (~lastIndex && ~currentIndex && lastIndex !== currentIndex) {
                // Must include lastMultiDragSelect (select it), in case modified selection from no selection
                // (but previous selection existed)
                var n, i;

                if (currentIndex > lastIndex) {
                  i = lastIndex;
                  n = currentIndex;
                } else {
                  i = currentIndex;
                  n = lastIndex + 1;
                }

                for (; i < n; i++) {
                  if (~multiDragElements.indexOf(children[i])) continue;
                  toggleClass(children[i], options.selectedClass, true);
                  multiDragElements.push(children[i]);
                  dispatchEvent({
                    sortable: sortable,
                    rootEl: rootEl,
                    name: 'select',
                    targetEl: children[i],
                    originalEvt: evt
                  });
                }
              }
            } else {
              lastMultiDragSelect = dragEl$1;
            }

            multiDragSortable = toSortable;
          } else {
            multiDragElements.splice(multiDragElements.indexOf(dragEl$1), 1);
            lastMultiDragSelect = null;
            dispatchEvent({
              sortable: sortable,
              rootEl: rootEl,
              name: 'deselect',
              targetEl: dragEl$1,
              originalEvt: evt
            });
          }
        } // Multi-drag drop


        if (dragStarted && this.isMultiDrag) {
          // Do not "unfold" after around dragEl if reverted
          if ((parentEl[expando].options.sort || parentEl !== rootEl) && multiDragElements.length > 1) {
            var dragRect = getRect(dragEl$1),
              multiDragIndex = index(dragEl$1, ':not(.' + this.options.selectedClass + ')');
            if (!initialFolding && options.animation) dragEl$1.thisAnimationDuration = null;
            toSortable.captureAnimationState();

            if (!initialFolding) {
              if (options.animation) {
                dragEl$1.fromRect = dragRect;
                multiDragElements.forEach(function (multiDragElement) {
                  multiDragElement.thisAnimationDuration = null;

                  if (multiDragElement !== dragEl$1) {
                    var rect = folding ? getRect(multiDragElement) : dragRect;
                    multiDragElement.fromRect = rect; // Prepare unfold animation

                    toSortable.addAnimationState({
                      target: multiDragElement,
                      rect: rect
                    });
                  }
                });
              } // Multi drag elements are not necessarily removed from the DOM on drop, so to reinsert
              // properly they must all be removed


              removeMultiDragElements();
              multiDragElements.forEach(function (multiDragElement) {
                if (children[multiDragIndex]) {
                  parentEl.insertBefore(multiDragElement, children[multiDragIndex]);
                } else {
                  parentEl.appendChild(multiDragElement);
                }

                multiDragIndex++;
              }); // If initial folding is done, the elements may have changed position because they are now
              // unfolding around dragEl, even though dragEl may not have his index changed, so update event
              // must be fired here as Sortable will not.

              if (oldIndex === index(dragEl$1)) {
                var update = false;
                multiDragElements.forEach(function (multiDragElement) {
                  if (multiDragElement.sortableIndex !== index(multiDragElement)) {
                    update = true;
                    return;
                  }
                });

                if (update) {
                  dispatchSortableEvent('update');
                }
              }
            } // Must be done after capturing individual rects (scroll bar)


            multiDragElements.forEach(function (multiDragElement) {
              unsetRect(multiDragElement);
            });
            toSortable.animateAll();
          }

          multiDragSortable = toSortable;
        } // Remove clones if necessary


        if (rootEl === parentEl || putSortable && putSortable.lastPutMode !== 'clone') {
          multiDragClones.forEach(function (clone) {
            clone.parentNode && clone.parentNode.removeChild(clone);
          });
        }
      },
      nullingGlobal: function nullingGlobal() {
        this.isMultiDrag = dragStarted = false;
        multiDragClones.length = 0;
      },
      destroyGlobal: function destroyGlobal() {
        this._deselectMultiDrag();

        off(document, 'pointerup', this._deselectMultiDrag);
        off(document, 'mouseup', this._deselectMultiDrag);
        off(document, 'touchend', this._deselectMultiDrag);
        off(document, 'keydown', this._checkKeyDown);
        off(document, 'keyup', this._checkKeyUp);
      },
      _deselectMultiDrag: function _deselectMultiDrag(evt) {
        if (typeof dragStarted !== "undefined" && dragStarted) return; // Only deselect if selection is in this sortable

        if (multiDragSortable !== this.sortable) return; // Only deselect if target is not item in this sortable

        if (evt && closest(evt.target, this.options.draggable, this.sortable.el, false)) return; // Only deselect if left click

        if (evt && evt.button !== 0) return;

        while (multiDragElements.length) {
          var el = multiDragElements[0];
          toggleClass(el, this.options.selectedClass, false);
          multiDragElements.shift();
          dispatchEvent({
            sortable: this.sortable,
            rootEl: this.sortable.el,
            name: 'deselect',
            targetEl: el,
            originalEvt: evt
          });
        }
      },
      _checkKeyDown: function _checkKeyDown(evt) {
        if (evt.key === this.options.multiDragKey) {
          this.multiDragKeyDown = true;
        }
      },
      _checkKeyUp: function _checkKeyUp(evt) {
        if (evt.key === this.options.multiDragKey) {
          this.multiDragKeyDown = false;
        }
      }
    };
    return _extends(MultiDrag, {
      // Static methods & properties
      pluginName: 'multiDrag',
      utils: {
        /**
         * Selects the provided multi-drag item
         * @param  {HTMLElement} el    The element to be selected
         */
        select: function select(el) {
          var sortable = el.parentNode[expando];
          if (!sortable || !sortable.options.multiDrag || ~multiDragElements.indexOf(el)) return;

          if (multiDragSortable && multiDragSortable !== sortable) {
            multiDragSortable.multiDrag._deselectMultiDrag();

            multiDragSortable = sortable;
          }

          toggleClass(el, sortable.options.selectedClass, true);
          multiDragElements.push(el);
        },

        /**
         * Deselects the provided multi-drag item
         * @param  {HTMLElement} el    The element to be deselected
         */
        deselect: function deselect(el) {
          var sortable = el.parentNode[expando],
            index = multiDragElements.indexOf(el);
          if (!sortable || !sortable.options.multiDrag || !~index) return;
          toggleClass(el, sortable.options.selectedClass, false);
          multiDragElements.splice(index, 1);
        }
      },
      eventProperties: function eventProperties() {
        var _this3 = this;

        var oldIndicies = [],
          newIndicies = [];
        multiDragElements.forEach(function (multiDragElement) {
          oldIndicies.push({
            multiDragElement: multiDragElement,
            index: multiDragElement.sortableIndex
          }); // multiDragElements will already be sorted if folding

          var newIndex;

          if (folding && multiDragElement !== dragEl$1) {
            newIndex = -1;
          } else if (folding) {
            newIndex = index(multiDragElement, ':not(.' + _this3.options.selectedClass + ')');
          } else {
            newIndex = index(multiDragElement);
          }

          newIndicies.push({
            multiDragElement: multiDragElement,
            index: newIndex
          });
        });
        return {
          items: _toConsumableArray(multiDragElements),
          clones: [].concat(multiDragClones),
          oldIndicies: oldIndicies,
          newIndicies: newIndicies
        };
      },
      optionListeners: {
        multiDragKey: function multiDragKey(key) {
          key = key.toLowerCase();

          if (key === 'ctrl') {
            key = 'Control';
          } else if (key.length > 1) {
            key = key.charAt(0).toUpperCase() + key.substr(1);
          }

          return key;
        }
      }
    });
  }

  function insertMultiDragElements(clonesInserted, rootEl) {
    multiDragElements.forEach(function (multiDragElement, i) {
      var target = rootEl.children[multiDragElement.sortableIndex + (clonesInserted ? Number(i) : 0)];

      if (target) {
        rootEl.insertBefore(multiDragElement, target);
      } else {
        rootEl.appendChild(multiDragElement);
      }
    });
  }
  /**
   * Insert multi-drag clones
   * @param  {[Boolean]} elementsInserted  Whether the multi-drag elements are inserted
   * @param  {HTMLElement} rootEl
   */


  function insertMultiDragClones(elementsInserted, rootEl) {
    multiDragClones.forEach(function (clone, i) {
      var target = rootEl.children[clone.sortableIndex + (elementsInserted ? Number(i) : 0)];

      if (target) {
        rootEl.insertBefore(clone, target);
      } else {
        rootEl.appendChild(clone);
      }
    });
  }

  function removeMultiDragElements() {
    multiDragElements.forEach(function (multiDragElement) {
      if (multiDragElement === dragEl$1) return;
      multiDragElement.parentNode && multiDragElement.parentNode.removeChild(multiDragElement);
    });
  }

  Sortable.mount(new AutoScrollPlugin());
  Sortable.mount(Remove, Revert);

  Sortable.mount(new SwapPlugin());
  Sortable.mount(new MultiDragPlugin());

  //export default Sortable;
  return Sortable
}, name);};
app_cache["/assets/js/microcore.js"] = async (name) => { await define('microcore', function () {
  function b64DecodeUnicode(str) {
    return decodeURIComponent(
      atob(str.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  }

  String.prototype.hashCode = function () {
    let hash = 0;
    if (this.length === 0) {
      return hash;
    }
    for (let i = 0; i < this.length; i++) {
      let char = this.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };

  window.___mc = {
    events: (() => {
      let observer = {};
      let events = [];

      setInterval(function () {
        let event = events.shift();

        while (event) {
          if (observer[event.name] && observer[event.name].length) {
            observer[event.name].forEach(function (item) {
              event.resolve(item(event.data, event.name));
            });
          }
          event = events.shift();
        }
      }, 10);

      return {
        on: function (events, cb) {
          if (typeof events === 'string') {
            events = [events];
          }
          let ids = [];
          events.forEach((event) => {
            observer[event] = observer[event] || [];
            ids.push(observer[event].push(cb));
          });
          return ids;
        },
        push: function (name, data) {
          return new Promise((resolve, reject) => {
            events.push({ name: name, data: data, resolve: resolve });
          });
        },
        off: function (events, id) {
          if (id) {
            delete observer[events][id];
          } else {
            if (typeof events === 'string') {
              events = [events];
            }
            events.forEach((event) => {
              delete observer[event];
            });
          }
        },
        handlers: function () {},
      };
    })(),
    storage: (() => {
      let storage = {};
      return {
        set: function (key, value) {
          storage[key] = value;
        },
        unset: function (key) {
          delete storage[key];
        },
        get: function (key) {
          return storage[key];
        },
        clear: function () {
          storage = {};
        }
      };
    })(),
    router: (() => {
      let routes = {};
      let current = location.pathname;

      window.onpopstate = function (e) {
        e.preventDefault();
        let returnLocation = history.location || document.location;
        router.go(returnLocation.pathname, true);
      };

      let router = {
        add: (route, cb, dp) => {
          routes[
            route.replace(/^\//, '').replace(/:([^\/]+)/g, '(?<$1>[^\\/]+)')
          ] = [cb, dp || {}];
        },
        go: (uri, onpopstate) => {
          if (!onpopstate) {
            history.pushState(null, '', uri);
          }
          if (uri[0] === '#') {
            uri = location.pathname + uri;
          }
          current = uri;
          router.dispatch(current);
        },
        dispatch: (uri) => {
          let rendered = false;
          uri = uri.split('#')[0];
          for (let route in routes) {
            let matched = uri.replace(/^\//, '').match(route);
            if (matched && matched[0] === matched.input) {
              let params = routes[route][1];
              if (matched.groups) {
                for (let param in matched.groups) {
                  params[param] = matched.groups[param];
                }
              }
              router.route = routes[route][0];
              router.route(params);
              rendered = true;
              break;
            }
          }
          if (!rendered) {
            ___mc.router.go(`/404`);
          }
        },
        hash: (data) => {
          if (data) {
            let params = '#';
            for (let param in data) {
              let value = data[param];
              if (typeof value === 'object' && !value.length) {
                value = null;
              }
              if (value && value !== 'undefined') {
                value = JSON.stringify(value);
                params += param + '=' + value + '&';
              }
            }

            return params.substr(0, params.length - 1) || '#';
          } else {
            let params = {};
            if (location.hash.length) {
              let data = location.hash
                .substr(1)
                .split('&')
                .map((value) => {
                  return value.split('=');
                });

              for (let param in data) {
                let value = data[param][1];
                if (value) {
                  param = data[param][0];
                  let v = JSON.parse(decodeURIComponent(value));
                  if (typeof v === 'object' && !v.length) {
                    v = null;
                  }
                  if (v) {
                    params[param] = v;
                  }
                }
              }
            }
            return params;
          }
        },
      };

      return router;
    })(),
    auth: (() => {
      return {
        token: () => {
          let cookies = {};
          if (document.cookie.split(';')[0] !== '') {
            document.cookie.split(';').forEach((item) => {
              cookies[item.split('=')[0].trim()] = item.split('=')[1].trim();
            });
          }
          return cookies['__token'];
        },
        get: function () {
          let c = document.cookie.split(' ');
          let cookies = {};
          if (c.length) {
            c.forEach((item) => {
              cookies[item.split('=')[0]] = item.split('=')[1];
            });
          }

          let token = cookies['__token'];
          token = (token &&
            JSON.parse(b64DecodeUnicode(token.split('.')[1]))) || {
            role: 'public',
          };

          if (token.exp <= new Date().getTime() / 1000) {
            document.cookie =
              '__token=;domain=' +
              window.location.hostname +
              ';expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
            setTimeout(() => {
              location.reload();
            }, 100);
            return false;
          }
          return token;
        },
        logout: function () {
          document.cookie =
            '__token=;domain=' +
            window.location.hostname +
            ';expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
          sessionStorage.removeItem('switch');
          location.href = '/login';
        },
        back: function () {
          try {
            let profile = sessionStorage.getItem('switch');
            if (profile !== null) {
              profile = JSON.parse(profile);
              if (profile.token && profile.token.length && profile.exp) {
                document.cookie = `__token=${profile.token};domain=${window.location.hostname};expires=${profile.exp}; path=/`;
                sessionStorage.removeItem('switch');
                location.href = '/';
              }
            }
          } catch (ex) {}
        },
      };
    })(),
    api: (() => {
      let cache = {};
      setInterval(() => {
        cache = {};
      }, 1000);

      async function request(data) {
        let response = [];
        let body = [];

        if (data.constructor === [].constructor) {
          for (let i in data) {
            let cache_id = JSON.stringify(data[i]).hashCode();
            data[i].id = i;
            if (cache[cache_id]) {
              response[i] = await cache[cache_id];
            } else {
              response[i] = cache_id;
              cache[cache_id] = new Promise((resolve) => {
                let waiter = setInterval(() => {
                  if (response[i] !== cache_id) {
                    clearInterval(waiter);
                    resolve(response[i]);
                  }
                });
              }, 10);
              body.push(data[i]);
            }
          }

          if (body.length === 0) {
            return response;
          }
        } else {
          let cache_id = JSON.stringify(data).hashCode();

          if (cache[cache_id]) {
            return await cache[cache_id];
          } else {
            response = cache_id;
            cache[cache_id] = new Promise((resolve) => {
              let waiter = setInterval(() => {
                if (response !== cache_id) {
                  clearInterval(waiter);
                  resolve(response);
                }
              }, 10);
            }).finally(() => {
              setTimeout(() => {
                delete cache[cache_id];
              }, 5000);
            });
          }
          body = data;
        }

        let cookies = {};
        if (document.cookie.split(';')[0] !== '') {
          document.cookie.split(';').forEach((item) => {
            cookies[item.split('=')[0].trim()] = item.split('=')[1].trim();
          });
        }

        let token = cookies['__token'];

        let res = await fetch(require.config.env.API_URL, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Token: token,
          },
          body: JSON.stringify(body),
          method: 'POST',
        });

        let result = await res;
        if (res.headers.get('content-type').match('json')) {
          result = await res.json();
        } else {
          return res;
        }

        if (res.headers.get('token') !== null) {
          token = res.headers.get('token') || token;
          let t = (token &&
            JSON.parse(b64DecodeUnicode(token.split('.')[1]))) || {
            role: 'public',
          };
          let exp = new Date(t.exp * 1000);
          document.cookie = `__token=${token}; domain=${window.location.hostname}; expires=${exp.toUTCString()}; path=/`;
        }

        if (res.headers.get('switch') !== null) {
          try {
            let profile = ___mc.auth.get();
            sessionStorage.setItem(
              'switch',
              JSON.stringify({
                token: token,
                name: profile.name || profile.role || '',
                exp: profile.exp || 0,
              })
            );
            let switched = res.headers.get('switch');
            let s = (switched &&
              JSON.parse(b64DecodeUnicode(switched.split('.')[1]))) || {
              role: 'public',
            };
            document.cookie = `__token=${switched}; domain=${window.location.hostname}; expires=${s.exp}; path=/`;
          } catch (ex) {}
        }

        if (result.constructor === [].constructor) {
          result.forEach((resp) => {
            if (resp.error) {
              console.error(resp.error);
              ___mc.events.push('sys:api.error', result.error);
            }

            response[resp.id] = resp.result;
          });
        } else {
          if (result.error) {
            console.error(result.error);
            ___mc.events.push('sys:api.error', result.error);
          }

          response = result.result;
        }

        return response;
      }

      return {
        call: function (method, params) {
          return request({ method: method, params: params });
        },
        batch: function (...requests) {
          return request(requests);
        },
      };
    })(),
    i18n: (str) => {
      let locale = ___mc.storage.get('locale');
      try {
        return eval('locale.' + str) ? eval('locale.' + str) : str;
      } catch (e) {
        return str;
      }
    },
    ws: (() => {
      let server = {
        user_id: null,
        timer: null,
        socket: null,
        url: 'wss://' + location.host + '/ws/',
        protocol: 'client',
        connect: function () {
          if (___mc.auth.get().id) {
            this.user_id = ___mc.auth.get().id.toString();
          }

          this.socket = new WebSocket(this.url, this.protocol);
          this.socket.onopen = this.onopen;
          this.socket.onmessage = this.onmessage;
          this.socket.onclose = this.onclose;
        },
        onopen: function () {
          clearInterval(server.timer);
          if (server.user_id) {
            server.socket.send(
              JSON.stringify({
                id: server.user_id,
                mess_id: ___mc.storage.get('ws.message.id') || 0,
                type: 'init',
              })
            );
          }
        },
        onmessage: function (event, cb) {
          let data = JSON.parse(event.data);
          if (data.type === 'event') {
            ___mc.storage.set('ws.message.id', data.mess_id);
            ___mc.events.push('ws:' + data.action, data.data);
          } else if (data.type === 'ping') {
            server.socket.send(
              JSON.stringify({
                id: server.user_id,
                last_message_id: ___mc.storage.get('ws.message.id'),
                type: 'pong',
              })
            );
            ___mc.storage.set('ws.last_ping', new Date().getTime());
          }
        },
        onclose: function (event) {
          clearInterval(server.timer);
          server.timer = setInterval(function () {
            server.connect();
          }, 1000);
        },
      };
      return server;
    })(),
  };

  return window.___mc;
}, name);};
app_cache["/assets/js/common.js"] = async (name) => { await define(['microcore', 'render', 'app/modules/notify'], async function (
  mc,
  render,
  notify
) {
  await require([
    '/app/modules/pagination',
    '/app/modules/select'
  ], (pagination, select) => {
    render.helpers.add('pagination', pagination);
    render.helpers.add('select', select);
  });

  window.onfocus = () => {
    if (
      mc.auth.get().role === 'public' &&
      location.pathname !== '/login' &&
      location.pathname !== '/registration' &&
      location.pathname !== '/forgot' &&
      location.pathname !== '/password'
    ) {
      location.href = '/login';
    }
  };

  mc.events.on('filter.reset', async ($scope) => {
    mc.router.go(location.pathname);
  });

  mc.events.on('sys:route.change', function () {
    if ($(document.body).find('main').length) {
      $(document.body).find('main')[0].scroll(0, 0);

      $('.tabs li a').on('click', function (e) {
        e.preventDefault();
        if ($(this).attr('href')) {
          if (!$(e.target).closest('li').hasClass('disabled')) {
            if ($(this).attr('href').substr(0, 5) == '#tab=') {
              let tab = $(this).attr('href').substr(5);
              let previous = $(this)
                .closest('.tabs')
                .find('.active a')
                .attr('href')
                .substr(5);

              $(this).closest('.tabs').find('.active').removeClass('active');
              $(this).closest('li').addClass('active');
              $('#' + previous).addClass('hide');
              $('#' + tab).removeClass('hide');
            }
          }
        }
        return false;
      });

      if (location.hash.match('tab=.*?[^&]')) {
        $('.tabs a[href="' + location.hash + '"]')[0].click();
      }

      let max_length = 0;
      let selected = null;
      $('aside nav.primary')
        .find('a')
        .each((i, el) => {
          if ($(el).attr('href') !== null) {
            let link = $(el).attr('href').toString().split("#")[0];
            if (location.pathname.match(link)) {
              if (link.length > max_length) {
                selected = el;
                max_length = link.length;
              }
            }
          }
        });

      $('aside nav.primary').find('.active').removeClass('active');
      try {
        if (selected) {
          $(selected).addClass('active');
          $(selected).closest('.menu-item').addClass('active');
        }
      } catch (e) {}
    }
  });
  mc.events.on('sys:api.error', function (err) {
    //console.log(err);
    if (err.code){
      let code = err.code.toString().slice(1),
          msg = mc.i18n(`errors._`);
      if (mc.i18n(`errors._${code}`) !== `errors._${code}`){
        msg = mc.i18n(`errors._${code}`);
      }
      notify("error", mc.i18n('notify.error'), msg);
    }
  });
}, name);};
app_cache["/assets/js/render.js"] = async (name) => { await define("render", ["microcore"], function (mc) {
    function deepCopy(obj, remove_recursive) {
        if (typeof obj === 'object' && !Array.isArray(obj)) {
            let clone = Object.assign({}, obj);
            for (let i in clone) {
                if (i != '__r' && i != '__p') {
                    clone[i] = deepCopy(clone[i], remove_recursive)
                }

                if (remove_recursive && (i == '__r' || i == '__p')) {
                    delete clone[i]
                }
            }
            return clone;
        } else if (Array.isArray(obj)) {
            let clone = [];
            for (let i in obj) {
                if (i != '__r' && i != '__p') {
                    clone.push(deepCopy(obj[i], remove_recursive))
                }
            }
            return clone;
        }

        return obj;
    }

    let filters = async (filter, value) => {
        let path = require.config.render.filters + '/' || '/'
        if (!filters.__cache[filter]) {
            filters.__cache[filter] = await require([path + filter], filter => filter)
        }

        return await filters.__cache[filter](value)
    };

    filters.__proto__.__cache = []

    let helpers = async (helper, args, ctx, prev_ctx) => {
        let path = require.config.render.helpers + '/' || '/'
        if (!helpers.__cache[helper]) {
            helpers.__cache[helper] = await require([path + helper], helper => helper)
        }

        return helpers.__cache[helper](args, ctx, prev_ctx)
    };

    helpers.__proto__.__cache = []
    helpers.__proto__.include = async (src, ctx, params) => {
        if (params) {
            params = params.split(' ').reduce((params, param) => {
                let [key, value] = param.split('=');
                if (value.match(/^['"]/)) {
                    value = value.replace(/^['"]/, '').replace(/['"]$/, '')
                } else {
                    value = helpers.__gv(value)
                }
                params[key] = value;
                return params;
            }, {})
            for (let i in params) {
                ctx[i] = params[i]
            }
        }

        return require(["mst!" + src], async (view) => {
            return view(ctx);
        });
    }
    helpers.__proto__.__gv = async (variable, ctx) => {
        let value = ctx;
        let escape = true;
        let filter = null;
        if (variable) {
            if (variable[0] === "{") {
                escape = false;
                variable = variable.replace(/({|})/g, '');
            }

            [variable, filter] = variable.split("|")

            if (variable != '.') {
                variable.replace(/^\.\.\//, "__p.")
                  .replace(/^\.\//, "__r.")
                  .split(".").forEach((part) => {
                    if (value && value[part] != undefined) {
                        value = value[part];
                        return value
                    } else {
                        return value = undefined;
                    }
                });
            }

            if (filter) {
                if (!variable.match(/^['"]/)) {
                    value = await filters(filter, deepCopy(value, true))
                } else {
                    value = await filters(filter, variable
                      .replace(/^['"]/, '')
                      .replace(/['"]$/, '')
                    )
                }
            }

            if (value && typeof value == 'string' && escape) {
                value = value.replace(/&/g, '&amp;')
                  .replace(/'/g, '&apos;')
                  .replace(/"/g, '&quot;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
            }
        }

        return value;
    }

    function compileCommand(command) {
        command = command.match(/{{\s*(.*)\s*}}/)[1].trim()
        let params = []
        switch (command[0]) {
            case "#":
                params = command.substr(1).split(
                  /\s+(?=(?:'(?:\\'|[^'])+'|[^'])+$)/g)
                let bh = params.shift();

                let is_object = false
                for (let param in params) {
                    let value = params[param]
                    if (value.match(/.*?=.*?/)) {
                        let data = value.split('=')
                        if (data[1][0] != '"' && data[1][0] != "'" && parseInt(data[1][0]) != data[1][0]) {
                            data[1] = "await h.__gv('" + data[1].replace(/'/g, "\\'") + "', ctx)";
                        }
                        params[param] = data[0] + ': ' + data[1]
                        is_object = true
                    } else {
                        if (value[0] != '"' && value[0] != "'" && parseInt(value[0]) != value[0]) {
                            params[param] = "await h.__gv('" + value.replace(/'/g, "\\'") + "', ctx)";
                        }
                    }
                }

                return "r.push(await h('" + bh
                  + "'," +
                  (is_object ? "{" : "[")
                  + params.join(",")
                  + (is_object ? "}" : "]")
                  + ", (async (ctx, prev_ctx) => {let r = [];";
            case "/":
                return "return r.join('');}), ctx));";
            case ">":
                params = command.substring(2).split(' ')
                if (params.length == 1) {
                    return "r.push(await h.include('" + params[0].replace(/'/g, "\\'") + "', ctx));";
                } else {
                    return "r.push(await h.include('" + params[0].replace(/'/g, "\\'") + "', ctx, '" + params.slice(1).map((item) => {
                        return item.replace(/'/g, "\\'")
                    }).join(' ') + "'));";
                }

            case "@":
                return "r.push(await h.__gv('.', ctx).__k);";
            default:
                return "r.push(await h.__gv('" + command.replace(/'/g, "\\'") + "', ctx));";
        }
    }

    function prepareCtx(ctx, parent, root) {
        if (!ctx) return ctx;
        if (ctx.__r) return ctx;

        if (!root) {
            root = ctx
        }

        if (typeof ctx == "object") {
            for (let item in ctx) {
                if (item != '__r' || item != '__p') {
                    item = ctx[item];
                    item = prepareCtx(item, ctx, root)
                }
            }
        }

        if (root) {
            if (typeof ctx == 'string') {
                ctx = String(ctx)
            }
            ctx.__r = root;
        }

        return ctx;
    }

    let render = {
        compile: (template) => {
            let parts = template.split(/{?{{[^}]+}}}?/);
            let commands = template.match(/{?{{([^}]+)}}}?/g);

            let compiled = ["async (ctx, h) => {let r = [];"];
            let boc = 0;
            let lb = "";

            parts.forEach(function (part, index) {
                if (part.length > 0) {
                    compiled.push("r.push(\"" + part.replace(/"/g, '\\"')
                        .replace(/\n+/g, " ")
                        .replace(/\s+/g, " ")
                      + "\");")
                }
                if (commands && commands[index]) {
                    commands[index].charAt(2) == '#' ? (boc++, lb = commands[index]) : '';
                    commands[index].charAt(2) == '/' && boc--;
                    compiled.push(compileCommand(commands[index], index))
                }
            });

            if (boc > 0) {
                console.error("Close opened  block " + lb);
                return undefined;
            }

            compiled.push("return r.join('')}");
            return eval(compiled.join("\r"));
        },

        render: async (template, data) => {
            let ctx = deepCopy(data);
            ctx = prepareCtx(ctx);
            let view = typeof template == 'string' ? render.compile(template) : template;
            return await view(ctx, helpers);
        },

        helpers: {
            add: (helper, cb) => {
                helpers.__cache[helper] = cb
            }
        },

        filters: {
            add: (filter, cb) => {
                filters.__cache[filter] = cb
            }
        }
    };

    return render;
}, name);};
app_cache["/assets/js/qrcode.js"] = async (name) => { await define('qrcode', function() {
    /**
     * @fileoverview
     * - Using the 'QRCode for Javascript library'
     * - Fixed dataset of 'QRCode for Javascript library' for support full-spec.
     * - this library has no dependencies.
     *
     * @author davidshimjs
     * @see <a href="http://www.d-project.com/" target="_blank">http://www.d-project.com/</a>
     * @see <a href="http://jeromeetienne.github.com/jquery-qrcode/" target="_blank">http://jeromeetienne.github.com/jquery-qrcode/</a>
     */
    let QRCode;

    //(function () {
        //---------------------------------------------------------------------
        // QRCode for JavaScript
        //
        // Copyright (c) 2009 Kazuhiko Arase
        //
        // URL: http://www.d-project.com/
        //
        // Licensed under the MIT license:
        //   http://www.opensource.org/licenses/mit-license.php
        //
        // The word "QR Code" is registered trademark of
        // DENSO WAVE INCORPORATED
        //   http://www.denso-wave.com/qrcode/faqpatent-e.html
        //
        //---------------------------------------------------------------------
        function QR8bitByte(data) {
            this.mode = QRMode.MODE_8BIT_BYTE;
            this.data = data;
            this.parsedData = [];

            // Added to support UTF-8 Characters
            for (var i = 0, l = this.data.length; i < l; i++) {
                var byteArray = [];
                var code = this.data.charCodeAt(i);

                if (code > 0x10000) {
                    byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
                    byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
                    byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
                    byteArray[3] = 0x80 | (code & 0x3F);
                } else if (code > 0x800) {
                    byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
                    byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
                    byteArray[2] = 0x80 | (code & 0x3F);
                } else if (code > 0x80) {
                    byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
                    byteArray[1] = 0x80 | (code & 0x3F);
                } else {
                    byteArray[0] = code;
                }

                this.parsedData.push(byteArray);
            }

            this.parsedData = Array.prototype.concat.apply([], this.parsedData);

            if (this.parsedData.length != this.data.length) {
                this.parsedData.unshift(191);
                this.parsedData.unshift(187);
                this.parsedData.unshift(239);
            }
        }

        QR8bitByte.prototype = {
            getLength: function (buffer) {
                return this.parsedData.length;
            },
            write: function (buffer) {
                for (var i = 0, l = this.parsedData.length; i < l; i++) {
                    buffer.put(this.parsedData[i], 8);
                }
            }
        };

        function QRCodeModel(typeNumber, errorCorrectLevel) {
            this.typeNumber = typeNumber;
            this.errorCorrectLevel = errorCorrectLevel;
            this.modules = null;
            this.moduleCount = 0;
            this.dataCache = null;
            this.dataList = [];
        }

        QRCodeModel.prototype = {
            addData: function (data) {
                var newData = new QR8bitByte(data);
                this.dataList.push(newData);
                this.dataCache = null;
            }, isDark: function (row, col) {
                if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
                    throw new Error(row + "," + col);
                }
                return this.modules[row][col];
            }, getModuleCount: function () {
                return this.moduleCount;
            }, make: function () {
                this.makeImpl(false, this.getBestMaskPattern());
            }, makeImpl: function (test, maskPattern) {
                this.moduleCount = this.typeNumber * 4 + 17;
                this.modules = new Array(this.moduleCount);
                for (var row = 0; row < this.moduleCount; row++) {
                    this.modules[row] = new Array(this.moduleCount);
                    for (var col = 0; col < this.moduleCount; col++) {
                        this.modules[row][col] = null;
                    }
                }
                this.setupPositionProbePattern(0, 0);
                this.setupPositionProbePattern(this.moduleCount - 7, 0);
                this.setupPositionProbePattern(0, this.moduleCount - 7);
                this.setupPositionAdjustPattern();
                this.setupTimingPattern();
                this.setupTypeInfo(test, maskPattern);
                if (this.typeNumber >= 7) {
                    this.setupTypeNumber(test);
                }
                if (this.dataCache == null) {
                    this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
                }
                this.mapData(this.dataCache, maskPattern);
            }, setupPositionProbePattern: function (row, col) {
                for (var r = -1; r <= 7; r++) {
                    if (row + r <= -1 || this.moduleCount <= row + r) continue;
                    for (var c = -1; c <= 7; c++) {
                        if (col + c <= -1 || this.moduleCount <= col + c) continue;
                        if ((0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                            this.modules[row + r][col + c] = true;
                        } else {
                            this.modules[row + r][col + c] = false;
                        }
                    }
                }
            }, getBestMaskPattern: function () {
                var minLostPoint = 0;
                var pattern = 0;
                for (var i = 0; i < 8; i++) {
                    this.makeImpl(true, i);
                    var lostPoint = QRUtil.getLostPoint(this);
                    if (i == 0 || minLostPoint > lostPoint) {
                        minLostPoint = lostPoint;
                        pattern = i;
                    }
                }
                return pattern;
            }, createMovieClip: function (target_mc, instance_name, depth) {
                var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
                var cs = 1;
                this.make();
                for (var row = 0; row < this.modules.length; row++) {
                    var y = row * cs;
                    for (var col = 0; col < this.modules[row].length; col++) {
                        var x = col * cs;
                        var dark = this.modules[row][col];
                        if (dark) {
                            qr_mc.beginFill(0, 100);
                            qr_mc.moveTo(x, y);
                            qr_mc.lineTo(x + cs, y);
                            qr_mc.lineTo(x + cs, y + cs);
                            qr_mc.lineTo(x, y + cs);
                            qr_mc.endFill();
                        }
                    }
                }
                return qr_mc;
            }, setupTimingPattern: function () {
                for (var r = 8; r < this.moduleCount - 8; r++) {
                    if (this.modules[r][6] != null) {
                        continue;
                    }
                    this.modules[r][6] = (r % 2 == 0);
                }
                for (var c = 8; c < this.moduleCount - 8; c++) {
                    if (this.modules[6][c] != null) {
                        continue;
                    }
                    this.modules[6][c] = (c % 2 == 0);
                }
            }, setupPositionAdjustPattern: function () {
                var pos = QRUtil.getPatternPosition(this.typeNumber);
                for (var i = 0; i < pos.length; i++) {
                    for (var j = 0; j < pos.length; j++) {
                        var row = pos[i];
                        var col = pos[j];
                        if (this.modules[row][col] != null) {
                            continue;
                        }
                        for (var r = -2; r <= 2; r++) {
                            for (var c = -2; c <= 2; c++) {
                                if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
                                    this.modules[row + r][col + c] = true;
                                } else {
                                    this.modules[row + r][col + c] = false;
                                }
                            }
                        }
                    }
                }
            }, setupTypeNumber: function (test) {
                var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
                for (var i = 0; i < 18; i++) {
                    var mod = (!test && ((bits >> i) & 1) == 1);
                    this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
                }
                for (var i = 0; i < 18; i++) {
                    var mod = (!test && ((bits >> i) & 1) == 1);
                    this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
                }
            }, setupTypeInfo: function (test, maskPattern) {
                var data = (this.errorCorrectLevel << 3) | maskPattern;
                var bits = QRUtil.getBCHTypeInfo(data);
                for (var i = 0; i < 15; i++) {
                    var mod = (!test && ((bits >> i) & 1) == 1);
                    if (i < 6) {
                        this.modules[i][8] = mod;
                    } else if (i < 8) {
                        this.modules[i + 1][8] = mod;
                    } else {
                        this.modules[this.moduleCount - 15 + i][8] = mod;
                    }
                }
                for (var i = 0; i < 15; i++) {
                    var mod = (!test && ((bits >> i) & 1) == 1);
                    if (i < 8) {
                        this.modules[8][this.moduleCount - i - 1] = mod;
                    } else if (i < 9) {
                        this.modules[8][15 - i - 1 + 1] = mod;
                    } else {
                        this.modules[8][15 - i - 1] = mod;
                    }
                }
                this.modules[this.moduleCount - 8][8] = (!test);
            }, mapData: function (data, maskPattern) {
                var inc = -1;
                var row = this.moduleCount - 1;
                var bitIndex = 7;
                var byteIndex = 0;
                for (var col = this.moduleCount - 1; col > 0; col -= 2) {
                    if (col == 6) col--;
                    while (true) {
                        for (var c = 0; c < 2; c++) {
                            if (this.modules[row][col - c] == null) {
                                var dark = false;
                                if (byteIndex < data.length) {
                                    dark = (((data[byteIndex] >>> bitIndex) & 1) == 1);
                                }
                                var mask = QRUtil.getMask(maskPattern, row, col - c);
                                if (mask) {
                                    dark = !dark;
                                }
                                this.modules[row][col - c] = dark;
                                bitIndex--;
                                if (bitIndex == -1) {
                                    byteIndex++;
                                    bitIndex = 7;
                                }
                            }
                        }
                        row += inc;
                        if (row < 0 || this.moduleCount <= row) {
                            row -= inc;
                            inc = -inc;
                            break;
                        }
                    }
                }
            }
        };
        QRCodeModel.PAD0 = 0xEC;
        QRCodeModel.PAD1 = 0x11;
        QRCodeModel.createData = function (typeNumber, errorCorrectLevel, dataList) {
            var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
            var buffer = new QRBitBuffer();
            for (var i = 0; i < dataList.length; i++) {
                var data = dataList[i];
                buffer.put(data.mode, 4);
                buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
                data.write(buffer);
            }
            var totalDataCount = 0;
            for (var i = 0; i < rsBlocks.length; i++) {
                totalDataCount += rsBlocks[i].dataCount;
            }
            if (buffer.getLengthInBits() > totalDataCount * 8) {
                throw new Error("code length overflow. ("
                    + buffer.getLengthInBits()
                    + ">"
                    + totalDataCount * 8
                    + ")");
            }
            if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
                buffer.put(0, 4);
            }
            while (buffer.getLengthInBits() % 8 != 0) {
                buffer.putBit(false);
            }
            while (true) {
                if (buffer.getLengthInBits() >= totalDataCount * 8) {
                    break;
                }
                buffer.put(QRCodeModel.PAD0, 8);
                if (buffer.getLengthInBits() >= totalDataCount * 8) {
                    break;
                }
                buffer.put(QRCodeModel.PAD1, 8);
            }
            return QRCodeModel.createBytes(buffer, rsBlocks);
        };
        QRCodeModel.createBytes = function (buffer, rsBlocks) {
            var offset = 0;
            var maxDcCount = 0;
            var maxEcCount = 0;
            var dcdata = new Array(rsBlocks.length);
            var ecdata = new Array(rsBlocks.length);
            for (var r = 0; r < rsBlocks.length; r++) {
                var dcCount = rsBlocks[r].dataCount;
                var ecCount = rsBlocks[r].totalCount - dcCount;
                maxDcCount = Math.max(maxDcCount, dcCount);
                maxEcCount = Math.max(maxEcCount, ecCount);
                dcdata[r] = new Array(dcCount);
                for (var i = 0; i < dcdata[r].length; i++) {
                    dcdata[r][i] = 0xff & buffer.buffer[i + offset];
                }
                offset += dcCount;
                var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
                var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
                var modPoly = rawPoly.mod(rsPoly);
                ecdata[r] = new Array(rsPoly.getLength() - 1);
                for (var i = 0; i < ecdata[r].length; i++) {
                    var modIndex = i + modPoly.getLength() - ecdata[r].length;
                    ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
                }
            }
            var totalCodeCount = 0;
            for (var i = 0; i < rsBlocks.length; i++) {
                totalCodeCount += rsBlocks[i].totalCount;
            }
            var data = new Array(totalCodeCount);
            var index = 0;
            for (var i = 0; i < maxDcCount; i++) {
                for (var r = 0; r < rsBlocks.length; r++) {
                    if (i < dcdata[r].length) {
                        data[index++] = dcdata[r][i];
                    }
                }
            }
            for (var i = 0; i < maxEcCount; i++) {
                for (var r = 0; r < rsBlocks.length; r++) {
                    if (i < ecdata[r].length) {
                        data[index++] = ecdata[r][i];
                    }
                }
            }
            return data;
        };
        var QRMode = {MODE_NUMBER: 1 << 0, MODE_ALPHA_NUM: 1 << 1, MODE_8BIT_BYTE: 1 << 2, MODE_KANJI: 1 << 3};
        var QRErrorCorrectLevel = {L: 1, M: 0, Q: 3, H: 2};
        var QRMaskPattern = {
            PATTERN000: 0,
            PATTERN001: 1,
            PATTERN010: 2,
            PATTERN011: 3,
            PATTERN100: 4,
            PATTERN101: 5,
            PATTERN110: 6,
            PATTERN111: 7
        };
        var QRUtil = {
            PATTERN_POSITION_TABLE: [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]],
            G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
            G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
            G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
            getBCHTypeInfo: function (data) {
                var d = data << 10;
                while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
                    d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
                }
                return ((data << 10) | d) ^ QRUtil.G15_MASK;
            },
            getBCHTypeNumber: function (data) {
                var d = data << 12;
                while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
                    d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
                }
                return (data << 12) | d;
            },
            getBCHDigit: function (data) {
                var digit = 0;
                while (data != 0) {
                    digit++;
                    data >>>= 1;
                }
                return digit;
            },
            getPatternPosition: function (typeNumber) {
                return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
            },
            getMask: function (maskPattern, i, j) {
                switch (maskPattern) {
                    case QRMaskPattern.PATTERN000:
                        return (i + j) % 2 == 0;
                    case QRMaskPattern.PATTERN001:
                        return i % 2 == 0;
                    case QRMaskPattern.PATTERN010:
                        return j % 3 == 0;
                    case QRMaskPattern.PATTERN011:
                        return (i + j) % 3 == 0;
                    case QRMaskPattern.PATTERN100:
                        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
                    case QRMaskPattern.PATTERN101:
                        return (i * j) % 2 + (i * j) % 3 == 0;
                    case QRMaskPattern.PATTERN110:
                        return ((i * j) % 2 + (i * j) % 3) % 2 == 0;
                    case QRMaskPattern.PATTERN111:
                        return ((i * j) % 3 + (i + j) % 2) % 2 == 0;
                    default:
                        throw new Error("bad maskPattern:" + maskPattern);
                }
            },
            getErrorCorrectPolynomial: function (errorCorrectLength) {
                var a = new QRPolynomial([1], 0);
                for (var i = 0; i < errorCorrectLength; i++) {
                    a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
                }
                return a;
            },
            getLengthInBits: function (mode, type) {
                if (1 <= type && type < 10) {
                    switch (mode) {
                        case QRMode.MODE_NUMBER:
                            return 10;
                        case QRMode.MODE_ALPHA_NUM:
                            return 9;
                        case QRMode.MODE_8BIT_BYTE:
                            return 8;
                        case QRMode.MODE_KANJI:
                            return 8;
                        default:
                            throw new Error("mode:" + mode);
                    }
                } else if (type < 27) {
                    switch (mode) {
                        case QRMode.MODE_NUMBER:
                            return 12;
                        case QRMode.MODE_ALPHA_NUM:
                            return 11;
                        case QRMode.MODE_8BIT_BYTE:
                            return 16;
                        case QRMode.MODE_KANJI:
                            return 10;
                        default:
                            throw new Error("mode:" + mode);
                    }
                } else if (type < 41) {
                    switch (mode) {
                        case QRMode.MODE_NUMBER:
                            return 14;
                        case QRMode.MODE_ALPHA_NUM:
                            return 13;
                        case QRMode.MODE_8BIT_BYTE:
                            return 16;
                        case QRMode.MODE_KANJI:
                            return 12;
                        default:
                            throw new Error("mode:" + mode);
                    }
                } else {
                    throw new Error("type:" + type);
                }
            },
            getLostPoint: function (qrCode) {
                var moduleCount = qrCode.getModuleCount();
                var lostPoint = 0;
                for (var row = 0; row < moduleCount; row++) {
                    for (var col = 0; col < moduleCount; col++) {
                        var sameCount = 0;
                        var dark = qrCode.isDark(row, col);
                        for (var r = -1; r <= 1; r++) {
                            if (row + r < 0 || moduleCount <= row + r) {
                                continue;
                            }
                            for (var c = -1; c <= 1; c++) {
                                if (col + c < 0 || moduleCount <= col + c) {
                                    continue;
                                }
                                if (r == 0 && c == 0) {
                                    continue;
                                }
                                if (dark == qrCode.isDark(row + r, col + c)) {
                                    sameCount++;
                                }
                            }
                        }
                        if (sameCount > 5) {
                            lostPoint += (3 + sameCount - 5);
                        }
                    }
                }
                for (var row = 0; row < moduleCount - 1; row++) {
                    for (var col = 0; col < moduleCount - 1; col++) {
                        var count = 0;
                        if (qrCode.isDark(row, col)) count++;
                        if (qrCode.isDark(row + 1, col)) count++;
                        if (qrCode.isDark(row, col + 1)) count++;
                        if (qrCode.isDark(row + 1, col + 1)) count++;
                        if (count == 0 || count == 4) {
                            lostPoint += 3;
                        }
                    }
                }
                for (var row = 0; row < moduleCount; row++) {
                    for (var col = 0; col < moduleCount - 6; col++) {
                        if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) {
                            lostPoint += 40;
                        }
                    }
                }
                for (var col = 0; col < moduleCount; col++) {
                    for (var row = 0; row < moduleCount - 6; row++) {
                        if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) {
                            lostPoint += 40;
                        }
                    }
                }
                var darkCount = 0;
                for (var col = 0; col < moduleCount; col++) {
                    for (var row = 0; row < moduleCount; row++) {
                        if (qrCode.isDark(row, col)) {
                            darkCount++;
                        }
                    }
                }
                var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
                lostPoint += ratio * 10;
                return lostPoint;
            }
        };
        var QRMath = {
            glog: function (n) {
                if (n < 1) {
                    throw new Error("glog(" + n + ")");
                }
                return QRMath.LOG_TABLE[n];
            }, gexp: function (n) {
                while (n < 0) {
                    n += 255;
                }
                while (n >= 256) {
                    n -= 255;
                }
                return QRMath.EXP_TABLE[n];
            }, EXP_TABLE: new Array(256), LOG_TABLE: new Array(256)
        };
        for (var i = 0; i < 8; i++) {
            QRMath.EXP_TABLE[i] = 1 << i;
        }
        for (var i = 8; i < 256; i++) {
            QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
        }
        for (var i = 0; i < 255; i++) {
            QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
        }

        function QRPolynomial(num, shift) {
            if (num.length == undefined) {
                throw new Error(num.length + "/" + shift);
            }
            var offset = 0;
            while (offset < num.length && num[offset] == 0) {
                offset++;
            }
            this.num = new Array(num.length - offset + shift);
            for (var i = 0; i < num.length - offset; i++) {
                this.num[i] = num[i + offset];
            }
        }

        QRPolynomial.prototype = {
            get: function (index) {
                return this.num[index];
            }, getLength: function () {
                return this.num.length;
            }, multiply: function (e) {
                var num = new Array(this.getLength() + e.getLength() - 1);
                for (var i = 0; i < this.getLength(); i++) {
                    for (var j = 0; j < e.getLength(); j++) {
                        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
                    }
                }
                return new QRPolynomial(num, 0);
            }, mod: function (e) {
                if (this.getLength() - e.getLength() < 0) {
                    return this;
                }
                var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
                var num = new Array(this.getLength());
                for (var i = 0; i < this.getLength(); i++) {
                    num[i] = this.get(i);
                }
                for (var i = 0; i < e.getLength(); i++) {
                    num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
                }
                return new QRPolynomial(num, 0).mod(e);
            }
        };

        function QRRSBlock(totalCount, dataCount) {
            this.totalCount = totalCount;
            this.dataCount = dataCount;
        }

        QRRSBlock.RS_BLOCK_TABLE = [[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9], [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16], [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13], [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9], [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12], [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15], [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14], [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15], [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13], [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16], [4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13], [2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15], [4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12], [3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13], [5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12], [5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16], [1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15], [5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15], [3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14], [3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16], [4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17], [2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13], [4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16], [6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17], [8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16], [10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17], [8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16], [3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16], [7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16], [5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16], [13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16], [17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16], [17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16], [13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17], [12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16], [6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16], [17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16], [4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16], [20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16], [19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]];
        QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {
            var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
            if (rsBlock == undefined) {
                throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
            }
            var length = rsBlock.length / 3;
            var list = [];
            for (var i = 0; i < length; i++) {
                var count = rsBlock[i * 3 + 0];
                var totalCount = rsBlock[i * 3 + 1];
                var dataCount = rsBlock[i * 3 + 2];
                for (var j = 0; j < count; j++) {
                    list.push(new QRRSBlock(totalCount, dataCount));
                }
            }
            return list;
        };
        QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {
            switch (errorCorrectLevel) {
                case QRErrorCorrectLevel.L:
                    return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
                case QRErrorCorrectLevel.M:
                    return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
                case QRErrorCorrectLevel.Q:
                    return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
                case QRErrorCorrectLevel.H:
                    return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
                default:
                    return undefined;
            }
        };

        function QRBitBuffer() {
            this.buffer = [];
            this.length = 0;
        }

        QRBitBuffer.prototype = {
            get: function (index) {
                var bufIndex = Math.floor(index / 8);
                return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) == 1;
            }, put: function (num, length) {
                for (var i = 0; i < length; i++) {
                    this.putBit(((num >>> (length - i - 1)) & 1) == 1);
                }
            }, getLengthInBits: function () {
                return this.length;
            }, putBit: function (bit) {
                var bufIndex = Math.floor(this.length / 8);
                if (this.buffer.length <= bufIndex) {
                    this.buffer.push(0);
                }
                if (bit) {
                    this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
                }
                this.length++;
            }
        };
        var QRCodeLimitLength = [[17, 14, 11, 7], [32, 26, 20, 14], [53, 42, 32, 24], [78, 62, 46, 34], [106, 84, 60, 44], [134, 106, 74, 58], [154, 122, 86, 64], [192, 152, 108, 84], [230, 180, 130, 98], [271, 213, 151, 119], [321, 251, 177, 137], [367, 287, 203, 155], [425, 331, 241, 177], [458, 362, 258, 194], [520, 412, 292, 220], [586, 450, 322, 250], [644, 504, 364, 280], [718, 560, 394, 310], [792, 624, 442, 338], [858, 666, 482, 382], [929, 711, 509, 403], [1003, 779, 565, 439], [1091, 857, 611, 461], [1171, 911, 661, 511], [1273, 997, 715, 535], [1367, 1059, 751, 593], [1465, 1125, 805, 625], [1528, 1190, 868, 658], [1628, 1264, 908, 698], [1732, 1370, 982, 742], [1840, 1452, 1030, 790], [1952, 1538, 1112, 842], [2068, 1628, 1168, 898], [2188, 1722, 1228, 958], [2303, 1809, 1283, 983], [2431, 1911, 1351, 1051], [2563, 1989, 1423, 1093], [2699, 2099, 1499, 1139], [2809, 2213, 1579, 1219], [2953, 2331, 1663, 1273]];

        function _isSupportCanvas() {
            return typeof CanvasRenderingContext2D != "undefined";
        }

        // android 2.x doesn't support Data-URI spec
        function _getAndroid() {
            var android = false;
            var sAgent = navigator.userAgent;

            if (/android/i.test(sAgent)) { // android
                android = true;
                var aMat = sAgent.toString().match(/android ([0-9]\.[0-9])/i);

                if (aMat && aMat[1]) {
                    android = parseFloat(aMat[1]);
                }
            }

            return android;
        }

        var svgDrawer = (function () {

            var Drawing = function (el, htOption) {
                this._el = el;
                this._htOption = htOption;
            };

            Drawing.prototype.draw = function (oQRCode) {
                var _htOption = this._htOption;
                var _el = this._el;
                var nCount = oQRCode.getModuleCount();
                var nWidth = Math.floor(_htOption.width / nCount);
                var nHeight = Math.floor(_htOption.height / nCount);

                this.clear();

                function makeSVG(tag, attrs) {
                    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
                    for (var k in attrs)
                        if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
                    return el;
                }

                var svg = makeSVG("svg", {
                    'viewBox': '0 0 ' + String(nCount) + " " + String(nCount),
                    'width': '100%',
                    'height': '100%',
                    'fill': _htOption.colorLight
                });
                svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
                _el.appendChild(svg);

                svg.appendChild(makeSVG("rect", {"fill": _htOption.colorLight, "width": "100%", "height": "100%"}));
                svg.appendChild(makeSVG("rect", {
                    "fill": _htOption.colorDark,
                    "width": "1",
                    "height": "1",
                    "id": "template"
                }));

                for (var row = 0; row < nCount; row++) {
                    for (var col = 0; col < nCount; col++) {
                        if (oQRCode.isDark(row, col)) {
                            var child = makeSVG("use", {"x": String(col), "y": String(row)});
                            child.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#template")
                            svg.appendChild(child);
                        }
                    }
                }
            };
            Drawing.prototype.clear = function () {
                while (this._el.hasChildNodes())
                    this._el.removeChild(this._el.lastChild);
            };
            return Drawing;
        })();

        var useSVG = document.documentElement.tagName.toLowerCase() === "svg";

        // Drawing in DOM by using Table tag
        var Drawing = useSVG ? svgDrawer : !_isSupportCanvas() ? (function () {
            var Drawing = function (el, htOption) {
                this._el = el;
                this._htOption = htOption;
            };

            /**
             * Draw the QRCode
             *
             * @param {QRCode} oQRCode
             */
            Drawing.prototype.draw = function (oQRCode) {
                var _htOption = this._htOption;
                var _el = this._el;
                var nCount = oQRCode.getModuleCount();
                var nWidth = Math.floor(_htOption.width / nCount);
                var nHeight = Math.floor(_htOption.height / nCount);
                var aHTML = ['<table style="border:0;border-collapse:collapse;">'];

                for (var row = 0; row < nCount; row++) {
                    aHTML.push('<tr>');

                    for (var col = 0; col < nCount; col++) {
                        aHTML.push('<td style="border:0;border-collapse:collapse;padding:0;margin:0;width:' + nWidth + 'px;height:' + nHeight + 'px;background-color:' + (oQRCode.isDark(row, col) ? _htOption.colorDark : _htOption.colorLight) + ';"></td>');
                    }

                    aHTML.push('</tr>');
                }

                aHTML.push('</table>');
                _el.innerHTML = aHTML.join('');

                // Fix the margin values as real size.
                var elTable = _el.childNodes[0];
                var nLeftMarginTable = (_htOption.width - elTable.offsetWidth) / 2;
                var nTopMarginTable = (_htOption.height - elTable.offsetHeight) / 2;

                if (nLeftMarginTable > 0 && nTopMarginTable > 0) {
                    elTable.style.margin = nTopMarginTable + "px " + nLeftMarginTable + "px";
                }
            };

            /**
             * Clear the QRCode
             */
            Drawing.prototype.clear = function () {
                this._el.innerHTML = '';
            };

            return Drawing;
        })() : (function () { // Drawing in Canvas
            function _onMakeImage() {
                this._elImage.src = this._elCanvas.toDataURL("image/png");
                this._elImage.style.display = "block";
                this._elCanvas.style.display = "none";
            }

            // Android 2.1 bug workaround
            // http://code.google.com/p/android/issues/detail?id=5141
            if (this._android && this._android <= 2.1) {
                var factor = 1 / window.devicePixelRatio;
                var drawImage = CanvasRenderingContext2D.prototype.drawImage;
                CanvasRenderingContext2D.prototype.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
                    if (("nodeName" in image) && /img/i.test(image.nodeName)) {
                        for (var i = arguments.length - 1; i >= 1; i--) {
                            arguments[i] = arguments[i] * factor;
                        }
                    } else if (typeof dw == "undefined") {
                        arguments[1] *= factor;
                        arguments[2] *= factor;
                        arguments[3] *= factor;
                        arguments[4] *= factor;
                    }

                    drawImage.apply(this, arguments);
                };
            }

            /**
             * Check whether the user's browser supports Data URI or not
             *
             * @private
             * @param {Function} fSuccess Occurs if it supports Data URI
             * @param {Function} fFail Occurs if it doesn't support Data URI
             */
            function _safeSetDataURI(fSuccess, fFail) {
                var self = this;
                self._fFail = fFail;
                self._fSuccess = fSuccess;

                // Check it just once
                if (self._bSupportDataURI === null) {
                    var el = document.createElement("img");
                    var fOnError = function () {
                        self._bSupportDataURI = false;

                        if (self._fFail) {
                            self._fFail.call(self);
                        }
                    };
                    var fOnSuccess = function () {
                        self._bSupportDataURI = true;

                        if (self._fSuccess) {
                            self._fSuccess.call(self);
                        }
                    };

                    el.onabort = fOnError;
                    el.onerror = fOnError;
                    el.onload = fOnSuccess;
                    el.src = "data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="; // the Image contains 1px data.
                    return;
                } else if (self._bSupportDataURI === true && self._fSuccess) {
                    self._fSuccess.call(self);
                } else if (self._bSupportDataURI === false && self._fFail) {
                    self._fFail.call(self);
                }
            };

            /**
             * Drawing QRCode by using canvas
             *
             * @constructor
             * @param {HTMLElement} el
             * @param {Object} htOption QRCode Options
             */
            var Drawing = function (el, htOption) {
                this._bIsPainted = false;
                this._android = _getAndroid();

                this._htOption = htOption;
                this._elCanvas = document.createElement("canvas");
                this._elCanvas.width = htOption.width;
                this._elCanvas.height = htOption.height;
                el.appendChild(this._elCanvas);
                this._el = el;
                this._oContext = this._elCanvas.getContext("2d");
                this._bIsPainted = false;
                this._elImage = document.createElement("img");
                this._elImage.alt = "Scan me!";
                this._elImage.style.display = "none";
                this._el.appendChild(this._elImage);
                this._bSupportDataURI = null;
            };

            /**
             * Draw the QRCode
             *
             * @param {QRCode} oQRCode
             */
            Drawing.prototype.draw = function (oQRCode) {
                var _elImage = this._elImage;
                var _oContext = this._oContext;
                var _htOption = this._htOption;

                var nCount = oQRCode.getModuleCount();
                var nWidth = _htOption.width / nCount;
                var nHeight = _htOption.height / nCount;
                var nRoundedWidth = Math.round(nWidth);
                var nRoundedHeight = Math.round(nHeight);

                _elImage.style.display = "none";
                this.clear();

                for (var row = 0; row < nCount; row++) {
                    for (var col = 0; col < nCount; col++) {
                        var bIsDark = oQRCode.isDark(row, col);
                        var nLeft = col * nWidth;
                        var nTop = row * nHeight;
                        _oContext.strokeStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
                        _oContext.lineWidth = 1;
                        _oContext.fillStyle = bIsDark ? _htOption.colorDark : _htOption.colorLight;
                        _oContext.fillRect(nLeft, nTop, nWidth, nHeight);

                        // 안티 앨리어싱 방지 처리
                        _oContext.strokeRect(
                            Math.floor(nLeft) + 0.5,
                            Math.floor(nTop) + 0.5,
                            nRoundedWidth,
                            nRoundedHeight
                        );

                        _oContext.strokeRect(
                            Math.ceil(nLeft) - 0.5,
                            Math.ceil(nTop) - 0.5,
                            nRoundedWidth,
                            nRoundedHeight
                        );
                    }
                }

                this._bIsPainted = true;
            };

            /**
             * Make the image from Canvas if the browser supports Data URI.
             */
            Drawing.prototype.makeImage = function () {
                if (this._bIsPainted) {
                    _safeSetDataURI.call(this, _onMakeImage);
                }
            };

            /**
             * Return whether the QRCode is painted or not
             *
             * @return {Boolean}
             */
            Drawing.prototype.isPainted = function () {
                return this._bIsPainted;
            };

            /**
             * Clear the QRCode
             */
            Drawing.prototype.clear = function () {
                this._oContext.clearRect(0, 0, this._elCanvas.width, this._elCanvas.height);
                this._bIsPainted = false;
            };

            /**
             * @private
             * @param {Number} nNumber
             */
            Drawing.prototype.round = function (nNumber) {
                if (!nNumber) {
                    return nNumber;
                }

                return Math.floor(nNumber * 1000) / 1000;
            };

            return Drawing;
        })();

        /**
         * Get the type by string length
         *
         * @private
         * @param {String} sText
         * @param {Number} nCorrectLevel
         * @return {Number} type
         */
        function _getTypeNumber(sText, nCorrectLevel) {
            var nType = 1;
            var length = _getUTF8Length(sText);

            for (var i = 0, len = QRCodeLimitLength.length; i <= len; i++) {
                var nLimit = 0;

                switch (nCorrectLevel) {
                    case QRErrorCorrectLevel.L :
                        nLimit = QRCodeLimitLength[i][0];
                        break;
                    case QRErrorCorrectLevel.M :
                        nLimit = QRCodeLimitLength[i][1];
                        break;
                    case QRErrorCorrectLevel.Q :
                        nLimit = QRCodeLimitLength[i][2];
                        break;
                    case QRErrorCorrectLevel.H :
                        nLimit = QRCodeLimitLength[i][3];
                        break;
                }

                if (length <= nLimit) {
                    break;
                } else {
                    nType++;
                }
            }

            if (nType > QRCodeLimitLength.length) {
                throw new Error("Too long data");
            }

            return nType;
        }

        function _getUTF8Length(sText) {
            var replacedText = encodeURI(sText).toString().replace(/\%[0-9a-fA-F]{2}/g, 'a');
            return replacedText.length + (replacedText.length != sText ? 3 : 0);
        }

        /**
         * @class QRCode
         * @constructor
         * @example
         * new QRCode(document.getElementById("test"), "http://jindo.dev.naver.com/collie");
         *
         * @example
         * var oQRCode = new QRCode("test", {
         *    text : "http://naver.com",
         *    width : 128,
         *    height : 128
         * });
         *
         * oQRCode.clear(); // Clear the QRCode.
         * oQRCode.makeCode("http://map.naver.com"); // Re-create the QRCode.
         *
         * @param {HTMLElement|String} el target element or 'id' attribute of element.
         * @param {Object|String} vOption
         * @param {String} vOption.text QRCode link data
         * @param {Number} [vOption.width=256]
         * @param {Number} [vOption.height=256]
         * @param {String} [vOption.colorDark="#000000"]
         * @param {String} [vOption.colorLight="#ffffff"]
         * @param {QRCode.CorrectLevel} [vOption.correctLevel=QRCode.CorrectLevel.H] [L|M|Q|H]
         */
        QRCode = function (el, vOption) {
            this._htOption = {
                width: 256,
                height: 256,
                typeNumber: 4,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRErrorCorrectLevel.H
            };

            if (typeof vOption === 'string') {
                vOption = {
                    text: vOption
                };
            }

            // Overwrites options
            if (vOption) {
                for (var i in vOption) {
                    this._htOption[i] = vOption[i];
                }
            }

            if (typeof el == "string") {
                el = document.getElementById(el);
            }

            if (this._htOption.useSVG) {
                Drawing = svgDrawer;
            }

            this._android = _getAndroid();
            this._el = el;
            this._oQRCode = null;
            this._oDrawing = new Drawing(this._el, this._htOption);

            if (this._htOption.text) {
                this.makeCode(this._htOption.text);
            }
        };

        /**
         * Make the QRCode
         *
         * @param {String} sText link data
         */
        QRCode.prototype.makeCode = function (sText) {
            this._oQRCode = new QRCodeModel(_getTypeNumber(sText, this._htOption.correctLevel), this._htOption.correctLevel);
            this._oQRCode.addData(sText);
            this._oQRCode.make();
            this._el.title = sText;
            this._oDrawing.draw(this._oQRCode);
            this.makeImage();
        };

        /**
         * Make the Image from Canvas element
         * - It occurs automatically
         * - Android below 3 doesn't support Data-URI spec.
         *
         * @private
         */
        QRCode.prototype.makeImage = function () {
            if (typeof this._oDrawing.makeImage == "function" && (!this._android || this._android >= 3)) {
                this._oDrawing.makeImage();
            }
        };

        /**
         * Clear the QRCode
         */
        QRCode.prototype.clear = function () {
            this._oDrawing.clear();
        };

        /**
         * @name QRCode.CorrectLevel
         */
        QRCode.CorrectLevel = QRErrorCorrectLevel;
    //})();

    return QRCode;
}, name);};
app_cache["/assets/js/utilities.js"] = async (name) => { await define(['microcore', 'dayjs'], function (mc, dayjs) {
  const fmtDate = (dateStr) => {
    return dateStr.split('-').reverse().join('.');
  };

  const getPeriod = (start, end) => {
    return `${start.getFullYear()}-${
      start.getMonth() + 1 < 10
        ? '0' + (start.getMonth() + 1)
        : start.getMonth() + 1
    }-${
      start.getDate() < 10 ? '0' + start.getDate() : start.getDate()
    } - ${end.getFullYear()}-${
      end.getMonth() + 1 < 10 ? '0' + (end.getMonth() + 1) : end.getMonth() + 1
    }-${end.getDate() < 10 ? '0' + end.getDate() : end.getDate()}`;
  };

  const getFullList = async (
    name = '',
    params = {},
    offset = 0,
    limit = 100,
    array = []
  ) => {
    if (name) {
      const lists = await mc.api.call(name, { ...params, offset, limit });
      if (lists && lists?.items?.length) {
        array = [...array, ...lists.items];
        if (array.length < lists.total) {
          array = await getFullList(name, params, offset + limit, limit, array);
        }
      }
      return array;
    } else {
      console.error('Set the method');
    }
  };

  const parsePhoneOrString = (value) => {
    if (!value) {
      return {};
    }
    const [match, phone, string] = value.match(
      /^([\+]?[7|8][\s]?[(]?[\d]{0,3}[)]?[-\s]?[\d]{0,3}[-\s]?[\d]{0,2}[\s\-]?[\d]{0,2})?(.*)$/
    );
    return { match, phone, string };
  };

  const onlyDigits = (value) => {
    if (value) {
      const digits = value.replace(/[^\d]/g, '');
      if (digits.startsWith(8)) {
        return digits.replace(8, 7);
      }
      return digits;
    }
    return '';
  };

  const mask = (value, mask = '+X (XXX) XXX-XX-XX') => {
    let new_value = mask;
    let new_value_array = value.split('');
    if (new_value_array.length) {
      new_value_array.forEach((digit, i) => {
        new_value = new_value.replace('X', digit);
        if (i === new_value_array.length - 1) {
          new_value = new_value.slice(0, new_value.lastIndexOf(digit) + 1);
        }
      });
    } else {
      new_value = '';
    }
    return new_value;
  };

  const copyToBuffer = (
    value,
    elem = null,
    success = () => {},
    error = () => {}
  ) => {
    if (location.protocol != 'https:') {
      let input = $(elem).find('input');

      if (!input.length) {
        const newElement = document.createElement('input');
        newElement.style.height = 0;
        newElement.style.padding = 0;
        newElement.style.border = 0;
        newElement.style.position = 'absolute';
        $(elem).append(newElement);
        input = $(elem).find('input');
      }
      input[0].value = value;
      input[0].focus();
      input[0].select();
      try {
        document.execCommand('copy');
        success();
      } catch (err) {
        error(err);
      }
    } else {
      navigator.clipboard
        .writeText(value)
        .then(() => {
          success();
        })
        .catch((err) => {
          error(err);
        });
    }
  };

  return {
    dayjs,
    getDaysFromPeriod: (period = '') => {
      if (period.length == 23) {
        let dates = period.split(' - ');
        const date = new Date(dates[1]) - new Date(dates[0]);
        return date / (1000 * 60 * 60 * 24) || 1;
      }
      return 0;
    },
    getListDatesFromPeriod: (period, days, locales) => {
      const createDate = (year, month, day) => {
        return new Date (year, month, day)
          .toLocaleString(locales, {year:'numeric', month:'numeric', day: 'numeric'})
      }

      let list = [];
      const [periodStart, periodEnd] = period.split(' - ')
      const [year, month, day] = periodStart.split('-')

      if (days <= 9) {
        for (let i = 0; i <= days; i++) {
          list.push(createDate(year, +month-1, +day+i))
        }
      } else if (days > 9 && days < 60) {
        for (let i = 0; i <= days/7; i++) {
          list.push(createDate(year, +month-1, +day + 7 * i))
        }
      } else if (days >= 60) {
        let calcDays = 0, i = 0;

        while (calcDays <= days) {
          list.push(
            new Date (year, +month - 1 + 1 * i, day)
              .toLocaleString(locales, {year:'numeric', month:'numeric'})
          )
          i++;
          calcDays += 32 - new Date(2022, +month - 1 + 1 * i, 32).getDate()
        }
      }

      return list;
    },
    getPeriodFromString: (str, days = 7) => {
      const format = (s, e) => `${s.format('YYYY-MM-DD')} - ${e.format('YYYY-MM-DD')}`;
      const start = dayjs(str);

      if (/^\d{4}\.\d{1,2}$/.test(str) || /^\d{4}-\d{1,2}$/.test(str)) {
        return format(start, start.endOf('month'));
      } else if (str.length == 10 && days > 10) {
        return format(start, start.add(6, 'day'));
      } else {
        return format(start, start);
      }
    },
    copyToBuffer,
    parsePhoneOrString,
    onlyDigits,
    filterMask: (value) => {
      if (value) {
        const { phone, string } = parsePhoneOrString(value);
        if (phone && !string) {
          const digits = onlyDigits(phone);
          if (digits.length == 11) {
            return mask(digits);
          }
        }
        return value;
      }
      return '';
    },
    mask,
    multipleFilter: (filters) => {
      for (const name in filters) {
        if (Object.hasOwnProperty.call(filters, name)) {
          const filter = filters[name];
          if (!filter) {
            delete filters[name];
          }
        }
      }
      // multiple.forEach((name)=>{
      //   if(filters[name]){
      //       filters[name] = filters[name].split(',');
      //       if(mustBeInt.includes(name)){
      //           filters[name] = filters[name].map(i=>parseInt(i))
      //       }
      //   }
      // })
      return filters;
    },
    getStringFromI18n: (str) => {
      if (str) {
        return mc.i18n(str) || str;
      } else {
        return '';
      }
    },
    getFullList,
    isTrue: (value) => {
      return value === 'true' || value === true ? true : false;
    },
    isFalse: (value) => {
      return value === 'false' || value === false ? false : true;
    },
    htmlToElement: (html) => {
      const placeholder = document.createElement('div');
      placeholder.innerHTML = html;
      return placeholder.children.length
        ? placeholder.firstElementChild
        : undefined;
    },
    datetimeToUnixTimestamp: (dateStr) => {
      let str = dateStr.replace(" ", "-");
      str = str.replaceAll(":", "-");
      str = str.split("-");
      let date = new Date(str[0], parseInt(str[1])-1, str[2], str[3], str[4], str[5]);
      return Math.floor(date.getTime()/1000);
    },
    dateToUnixTimestamp: (dateStr) => {
      let str = dateStr.split("-");
      let date = new Date(str[0], parseInt(str[1])-1, str[2], 0, 0, 0);
      return Math.floor(date.getTime()/1000);
    },
    unixTimestampToDateTime: (timestamp) => {
      let months = [1,2,3,4,5,6,7,8,9,10,11,12];
      let date = new Date(timestamp * 1000);
      let y = date.getFullYear(),
        m = ("0" + months[date.getMonth()]).slice(-2),
        d = ("0" + date.getDate()).slice(-2),
        h = ("0" + date.getHours()).slice(-2),
        n = ("0" + date.getMinutes()).slice(-2),
        s = ("0" + date.getSeconds()).slice(-2);
      return `${y}-${m}-${d} ${h}:${n}:${s}`;
    },
    unixTimestampToDate: (timestamp) => {
      let months = [1,2,3,4,5,6,7,8,9,10,11,12];
      let date = new Date(timestamp * 1000);
      let y = date.getFullYear(),
        m = ("0" + months[date.getMonth()]).slice(-2),
        d = ("0" + date.getDate()).slice(-2);
      return `${y}-${m}-${d}`;
    },
    formatPeriod: (period) => {
      const [firstDate, lastDate] = period.split(' - ');
      return `${fmtDate(firstDate)} - ${fmtDate(lastDate)}`;
    },
    fmtDate,
    formatDateTime: (dateStr) => {
      const [date, time] = dateStr.split(' ');
      return `${fmtDate(date)} ${time}`;
    },
    formatDateFromDateTime: (dateStr) => {
      const [date] = dateStr.split(' ');
      return fmtDate(date);
    },
    setTimestamp: (value) => {
      let start = value.split(' - ')[0];
      let end = value.split(' - ')[1];
      let data = {
        start: new Date(
          start.split('-')[0],
          +start.split('-')[1] - 1,
          start.split('-')[2]
        ),
        end: new Date(
          end.split('-')[0],
          +end.split('-')[1] - 1,
          end.split('-')[2]
        ),
      };
      if (data.start.getTime() > data.end.getTime()) {
        data = {
          start: data.end,
          end: data.start,
        };
      }
      data.start.setHours(0, 0, 0);
      data.end.setHours(23, 59, 59);
      return data;
    },
    getPeriod,
    fieldError: (field, tab, text, target, pos) => {
      if (tab || tab === 0) {
        $('ul.tabs li a')[tab].click();
      }
      $(field)[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      $(field).addClass('error');
      setTimeout(() => {
        $(field).removeClass('error');
      }, 3000);

      if (text || text === '') {
        if (!$('#' + $(field)[0].error).length) {
          let id = 'error_' + Math.round(Math.random() * 1000000);
          $(field)[0].error = id;
          const error = `<error id="${id}">${
            text === '' ? mc.i18n('system.required') : text
          }</error>`;
          if (!target) {
            $(field).after(error);
          } else {
            if (pos && pos === 'before') {
              $(target).before(error);
            } else if (pos && pos === 'after') {
              $(target).after(error);
            } else if (!pos) {
              $(target).append(error);
            }
          }
        }
      }

      return false;
    },
    loading: (load) => {
      if (load) {
        $('body > .loading').addClass('is_loading');
      } else {
        $('body > .loading').removeClass('is_loading');
      }
      setTimeout(() => {
        ___mc.loading(false);
      }, 5000);
    },
    timer: () => {
      //todo timer
    },
    stringToHslColor: (str, s, l) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      let h = hash % 360;
      return 'hsl('+h+', '+s+'%, '+l+'%)';
    },
    phoneClassify: (phone) =>
      phone.toString().slice(0, 4) + '***' + phone.toString().slice(7)
  };
}, name);};
require.config({
  paths: {
    miq: '/assets/js/miq',
    microcore: '/assets/js/microcore',
    routes: '/routes',
    render: '/assets/js/render',
    common: '/assets/js/common',
    notify: '/app/modules/notify',
    popup: '/app/modules/popup',
    confirm: '/app/modules/confirm',
    'app/modules/sortable': '/app/modules/sortable',
    'app/modules/suggests': '/app/modules/suggests',
    'app/filters/time': '/app/filters/time',
    chart: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.0.2/chart.min',
    dayjs: 'https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min',
    utilities: '/assets/js/utilities',
    ckeditor: 'https://cdn.ckeditor.com/ckeditor5/40.2.0/classic/ckeditor',
    qrcode: '/assets/js/qrcode'
  },
  render: {
    path: '/app/views',
    helpers: '/app/modules',
    filters: '/app/filters',
  },
  //version: "4"
});

if (!localStorage.getItem('lang')) {
  localStorage.setItem('lang', 'en');
}

define(['miq', 'microcore', 'json!routes', 'json!config', 'common'], async (
  $,
  mc,
  routes,
  config
) => {
  let translation = await fetch(`/locale/${localStorage.getItem('lang')}.json`),
      locale = await translation.json();

  mc.storage.set('locale', locale);

  window.$ = $;

  require.config.env = config[window.location.hostname];
  require.config.env.API_URL = require.config.env.API_DOMAIN + require.config.env.API_URI;

  var link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.href = require.config.FAVICON;

  const observer = new MutationObserver((mutationRecords) => {
    $('a:not(.external)').forEach((el) => {
      let href = el.getAttribute('href');
      let target = el.hasAttribute('target');
      let download = el.hasAttribute('download');
      if (href && !(target || download) && href.substr(0, 5) !== '#tab=') {
        el.onclick = (ev) => {
          ev.preventDefault();
          mc.router.go(href);
        };
        return false;
      }
    });

    $('*[handler]:not([inited])').forEach(function ($scope) {
      $scope.setAttribute('inited', 'inited');
      require(['/app/' + $scope.getAttribute('handler')], function (handler) {
        handler($scope, $scope.dataset);
        mc.events.push('sys:page.init:' + $scope.getAttribute('handler'));
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  let currentLayout = '';

  Object.keys(routes).forEach((path) => {
    const route = routes[path];

    mc.router.add(
      path,
      (params) => {
        const user = mc.auth.get();
        if (
          route.role.indexOf(user.role) === -1 &&
          route.role.indexOf('public') === -1
        ) {
          mc.router.go('/restricted');
          return;
        }

        const layout = route.layout || 'main';
        require([
          `/app/controllers/${route.controller}`,
          `mst!layouts/${layout}`,
        ], async (controller, layoutView) => {
          const html = await controller(params);
          if (currentLayout !== layout) {
            currentLayout = layout;
            document.body.innerHTML = await layoutView({
              content: html,
              profile: user
            });
          } else {
            const holder = document.querySelector('*[data-content-holder]');
            if (holder) {
              holder.innerHTML = html;
            }
          }
          mc.events.push(`sys:page.init:${route.controller}`);
          mc.events.push('sys:route.change');

          const mainElt = document.querySelector('main');
          if (mainElt) {
            mainElt.scrollTo(0, 0);
          }
        });
      },
      route.params
    );
  });

  mc.events.on('logout', () => {
    mc.auth.logout();
    mc.router.go('/login');
  });

  if (
    mc.auth.get().role === 'public' &&
    location.pathname !== '/login' &&
    location.pathname !== '/registration' &&
    location.pathname !== '/recover'
  ) {
    mc.router.go('/login');
  }
  mc.router.dispatch(location.pathname);
});

let views_cache = [];
views_cache['/shop/cvv/best_seller.mst'] = async (ctx, h) => {let r = [];return r.join('')}
views_cache['/shop/client/edit.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h.__gv('title', ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <form action=\"\" autocomplete=\"off\"> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.product.type");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <select name=\"type\"> ");r.push(await h('each', [await h.__gv('types', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <option value=\"");r.push(await h.__gv('option', ctx));r.push("\">");r.push(await h.__gv('value', ctx));r.push("</option> ");return r.join('');}), ctx));r.push(" </select> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.product.status");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <select name=\"status\"> ");r.push(await h('each', [await h.__gv('statuses', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <option value=\"");r.push(await h.__gv('option', ctx));r.push("\">");r.push(await h.__gv('value', ctx));r.push("</option> ");return r.join('');}), ctx));r.push(" </select> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.product.name");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.product.name");return r.join('');}), ctx));r.push(" *\" name=\"name\" autocomplete=\"off\" value=\"");r.push(await h.__gv('product.name', ctx));r.push("\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.product.price");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"number\" min=\"0.01\" step=\"0.01\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.product.price");return r.join('');}), ctx));r.push(" *\" name=\"price\" autocomplete=\"off\" value=\"");r.push(await h.__gv('product.price', ctx));r.push("\"> </div> </div> </div> <div class=\"buttons\"> ");r.push(await h('if', [await h.__gv('product.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('shop.product.save', this)\" data-action=\"add\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.add");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" ");r.push(await h('unless', [await h.__gv('product.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('shop.product.save', this)\" data-action=\"update\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.update");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" </div> </form> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/shop/cvv/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> <input type=\"checkbox\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\"> </td> <td> <div class=\"card-number\"> <img src=\"/assets/cards/thumb/");r.push(await h.__gv('bin', ctx));r.push(".png\" alt=\"\">&nbsp; <span>");r.push(await h.__gv('bin', ctx));r.push("</span> </div> </td> <td>");r.push(await h.__gv('expire', ctx));r.push("</td> <td>");r.push(await h.__gv('brand', ctx));r.push("</td> <td>");r.push(await h.__gv('type', ctx));r.push("</td> <td>");r.push(await h.__gv('category', ctx));r.push("</td> <td> <div class=\"card-number\"> <img src=\"https://raw.githubusercontent.com/hampusborgos/country-flags/refs/heads/main/svg/");r.push(await h.__gv('country|lowercase', ctx));r.push(".svg\" alt=\"\"> <span>");r.push(await h.__gv('country', ctx));r.push("</span> </div> </td> <td>");r.push(await h.__gv('issuer', ctx));r.push("</td> <td>");r.push(await h.__gv('base.name', ctx));r.push("</td> <td><span class=\"price\">");r.push(await h.__gv('price|money', ctx));r.push("$</span></td> <td class=\"action\"> <button class=\"cart\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\" onclick=\"___mc.events.push('shop.cvv.cart.add', this)\"></button> </td> </tr>");return r.join('')}
views_cache['/news/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <div class=\"news-container\"> <!-- <div class=\"news-periods margin-top-sm\">--> <!-- <button>Week1</button>--> <!-- <button>Week2</button>--> <!-- <button>Week3</button>--> <!-- <button>Week4</button>--> <!-- </div>--> <div class=\"corner-left-bottom-right-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped\"></div> </div> <div class=\"news-list-container\" handler=\"controllers/news/handler\"> <!-- <select>--> <!-- <option value=\"\">Today</option>--> <!-- <option value=\"\">Tomorrow</option>--> <!-- </select>--> <div class=\"news-list\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </div> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/restricted.mst'] = async (ctx, h) => {let r = [];return r.join('')}
views_cache['/admin/users/edit.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h.__gv('title', ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <form action=\"\" autocomplete=\"off\"> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.nickname");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.nickname");return r.join('');}), ctx));r.push("\" name=\"nickname\" autocomplete=\"off\" value=\"");r.push(await h.__gv('user.nickname', ctx));r.push("\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.name");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.name");return r.join('');}), ctx));r.push("\" name=\"name\" autocomplete=\"off\" value=\"");r.push(await h.__gv('user.name', ctx));r.push("\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.role");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {min: 0, value: await h.__gv('user.role', ctx), onsuggest: await h.__gv('user_role_suggest', ctx), onchange: await h.__gv('user_role_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.status");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {min: 0, value: await h.__gv('user.status', ctx), onsuggest: await h.__gv('user_status_suggest', ctx), onchange: await h.__gv('user_status_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.edit.timezone");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"number\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.edit.timezone");return r.join('');}), ctx));r.push("\" name=\"timezone\" autocomplete=\"off\" value=\"");r.push(await h.__gv('user.settings.time_zone', ctx));r.push("\"> </div> </div> </div> <div class=\"buttons\"> ");r.push(await h('if', [await h.__gv('user.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('admin.user.save', this)\" data-action=\"add\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.add");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" ");r.push(await h('unless', [await h.__gv('user.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('admin.user.save', this)\" data-action=\"update\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.update");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" </div> </form> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/login/register.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"corner-left-bottom-right-top-clip-lg\"> <div class=\"inner\"> <div class=\"bl-top\"> <div class=\"title\"> <h1>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.title");return r.join('');}), ctx));r.push("</h1> <img src=\"/assets/img/warning-yellow.svg\" alt=\"\"> </div> <div class=\"notes col-1-2\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.notes");return r.join('');}), ctx));r.push(" </div> <div class=\"notes\"> <p class=\"bordered\"> <span>Cout de l’inscription : </span><span class=\"status\">100 €</span> <span>Statu d’inscription : </span><span class=\"status\">Open</span> </p> </div> </div> <div class=\"bl-bottom\"> <div class=\"tabs\"> <div> <a class=\"button active\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.title");return r.join('');}), ctx));r.push("</a> <a class=\"button\" href=\"/login\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.auth.title");return r.join('');}), ctx));r.push("</a> <!--<a class=\"button\">Visiter sans se connecteur</a>--> </div> <!-- <div> <a class=\"button\">Login via telegram</a> </div> --> </div> <div class=\"tab-content\"> <div class=\"row\"> <div class=\"col-1-1 corner-right-top-clip-xs\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.nickname");return r.join('');}), ctx));r.push(" (A-Z0-9_) *\" name=\"nickname\" autocomplete=\"off\"> </div> </div> <div class=\"row\"> <div class=\"col-1-2\"> <input type=\"password\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.password");return r.join('');}), ctx));r.push(" *\" name=\"password\" autocomplete=\"new-password\"> </div> <div class=\"col-1-2\"> <input type=\"password\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.password_confirm");return r.join('');}), ctx));r.push(" *\" name=\"password_confirm\" autocomplete=\"new-password\"> </div> </div> <div class=\"row\"> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.username");return r.join('');}), ctx));r.push("\" name=\"name\" autocomplete=\"off\"> </div> </div> <div class=\"row\"> <div class=\"col-1-4\"> <button id=\"captcha\" class=\"bordered\" onclick=\"___mc.events.push('auth.register.captcha', this)\">Captcha</button> </div> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"... *\" name=\"captcha\" autocomplete=\"off\"> </div> </div> </div> </div> </div> </div> <div class=\"buttons\"> <button onclick=\"___mc.events.push('auth.register')\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.signup");return r.join('');}), ctx));r.push("</button> </div>");return r.join('')}
views_cache['/layouts/components/timeplugin.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"timeplugin \" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> <div> <label>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.time.hours");return r.join('');}), ctx));r.push("</label> <input type=\"number\" class=\"timepicker-hours\" min=\"0\" max=\"23\" step=\"1\"/> </div> <div> <label>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.time.minutes");return r.join('');}), ctx));r.push("</label> <input type=\"number\" class=\"timepicker-minutes\" min=\"0\" max=\"59\" step=\"1\"/> </div> <div> <label>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.time.seconds");return r.join('');}), ctx));r.push("</label> <input type=\"number\" class=\"timepicker-seconds\" min=\"0\" max=\"59\" step=\"1\"/> </div> </div> ");return r.join('')}
views_cache['/faq/item.mst'] = async (ctx, h) => {let r = [];r.push("<li class=\"active\"> <div class=\"faq-title\"> <p> <span>0");r.push(await h.__gv('__k', ctx));r.push("</span> ");r.push(await h.__gv('question', ctx));r.push(" </p> <a onclick=\"this.closest('li').classList.toggle('active')\"> <img src=\"/assets/img/arrow-down.svg\" alt=\"\"> </a> </div> <div class=\"faq-item\"> <p>");r.push(await h.__gv('answer', ctx));r.push("</p> </div> </li>");return r.join('')}
views_cache['/support/item.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"col-1-1\"> <div class=\"support-chat-item corner-left-top-right-bottom-clip-xs col-1-2 ");r.push(await h('if', [await h.__gv('user.is_me', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("me");return r.join('');}), ctx));r.push("\"> <div class=\"title\"> <span class=\"username\"> ");r.push(await h('if', [await h.__gv('user.is_me', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("me");return r.join('');}), ctx));r.push(await h('unless', [await h.__gv('user.is_me', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(await h.__gv('user.nickname', ctx));return r.join('');}), ctx));r.push(" </span> <span class=\"datetime\">");r.push(await h.__gv('created|datetime', ctx));r.push("</span> </div> <div class=\"message\"> ");r.push(await h.__gv('{text}', ctx));r.push(" </div> </div> </div>");return r.join('')}
views_cache['/shop/client/handler/product.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> <input type=\"checkbox\"> </td> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>");r.push(await h.__gv('id', ctx));r.push("</span> </div> </td> <!-- <td> classique </td> <td> vendeur name </td> <td> us </td> --> <td> ");r.push(await h.__gv('name', ctx));r.push(" </td> <td class=\"action\"> <span class=\"price\">");r.push(await h.__gv('price', ctx));r.push("&euro;</span> </td> <td class=\"action\"> <button class=\"cart\" onclick=\"___mc.events.push('shop.products.buy', ");r.push(await h.__gv('id', ctx));r.push(")\"></button> </td> <!-- <td class=\"action\"> <a class=\"button shop\"></a> </td>--> </tr>");return r.join('')}
views_cache['/shop/cart/bulk/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> <input type=\"checkbox\" data-pos=\"");r.push(await h.__gv('id', ctx));r.push("\"> </td> <td> ");r.push(await h.__gv('info.name', ctx));r.push(" </td> <td class=\"action\"> <span class=\"price\">");r.push(await h.__gv('price|money', ctx));r.push("$</span> </td> <td class=\"action\"> <button class=\"bordered_red boridered\">");r.push(await h.__gv('info.status', ctx));r.push("</button> </td> <td class=\"action\"> <button class=\"remove red\" data-pos=\"");r.push(await h.__gv('id', ctx));r.push("\" onclick=\"___mc.events.push('shop.cart.remove', this)\"></button> </td> </tr>");return r.join('')}
views_cache['/profile/password.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"user-space-wrapper flex gap-sm deposit_page_user_space_wrapper_2\"> ");r.push(await h.include('/profile/menu', ctx, 'active=\'password\''));r.push(" <div class=\"col-3-4\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.password.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"col-1-3\"> <h2 class=\"account-edit-h2\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.info.title");return r.join('');}), ctx));r.push("</span> <img src=\"/assets/img/warning-yellow.svg\" alt=\"\"> </h2> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.info.text");return r.join('');}), ctx));r.push("</p> </div> <div class=\"account-edit\"> <form action=\"\" autocomplete=\"off\"> <div class=\"form-element col-1-1\"> <p class=\"label\">Password</p> <div class=\"wrap-container\"> <div class=\"col-1-2\"> <input type=\"password\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.password.current");return r.join('');}), ctx));r.push(" *\" name=\"password\" autocomplete=\"new-password\"> </div> <div class=\"col-1-2 flex flex-align-center\"> <div class=\"col-1-4\"> <button type=\"button\" id=\"captcha\" class=\"bordered\" style=\"height: 60px\" onclick=\"___mc.events.push('profile.password.captcha', this)\">Captcha</button> </div> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"... *\" name=\"captcha\" autocomplete=\"off\"> </div> </div> <div class=\"col-1-2\"> <input type=\"password\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.password.new");return r.join('');}), ctx));r.push(" *\" name=\"password_new\" autocomplete=\"new-password\"> </div> <div class=\"col-1-2\"> <input type=\"password\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.password.confirm");return r.join('');}), ctx));r.push(" *\" name=\"password_confirm\" autocomplete=\"new-password\"> </div> </div> </div> <div class=\"buttons\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('profile.password.update', this)\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.update");return r.join('');}), ctx));r.push("</button> </div> </form> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/news/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title manage_base_page_corner_left_top_clip_sm_title_\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'table.status', name: 'status', value: await h.__gv('filter.status', ctx), items: await h.__gv('statuses', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('admin.news.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <!-- <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> --> </div> <div class=\"contents contents_inner_manage_base_page\" handler=\"controllers/admin/news/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th>ID</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.table.date");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.table.role");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.table.lang");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.table.title");return r.join('');}), ctx));r.push("</th> <th colspan=\"2\">action</th> </tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/components/select_option.mst'] = async (ctx, h) => {let r = [];r.push("<li data-value=\"");r.push(await h.__gv('value', ctx));r.push("\" class=\"");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('selected', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("selected");return r.join('');}), ctx));r.push("\">");r.push(await h.__gv('option', ctx));r.push("</li> ");return r.join('')}
views_cache['/layouts/main.mst'] = async (ctx, h) => {let r = [];r.push("<div id=\"bg-circle\"></div> <div id=\"app\"> <div id=\"app-wrapper\"> ");r.push(await h.include('layouts/areas/aside', ctx));r.push(" <main data-content-holder> ");r.push(await h.__gv('{content}', ctx));r.push(" </main> </div> </div>");return r.join('')}
views_cache['/layouts/components/datetimepicker.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"datetimepicker ");r.push(await h.__gv('classlist', ctx));r.push("\" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> ");r.push(await h('if', [await h.__gv('label', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <label>");r.push(await h.__gv('label', ctx));r.push("</label> ");return r.join('');}), ctx));r.push(" <span class=\"mdi ");r.push(await h('if', [await h.__gv('type', ctx), 'date'], (async (ctx, prev_ctx) => {let r = [];r.push("mdi-calendar");return r.join('');}), ctx));r.push(await h('if', [await h.__gv('type', ctx), 'period'], (async (ctx, prev_ctx) => {let r = [];r.push("mdi-calendar");return r.join('');}), ctx));r.push(await h('if', [await h.__gv('type', ctx), 'time'], (async (ctx, prev_ctx) => {let r = [];r.push("mdi-clock");return r.join('');}), ctx));r.push(await h('if', [await h.__gv('type', ctx), 'datetime'], (async (ctx, prev_ctx) => {let r = [];r.push("mdi-calendar-clock");return r.join('');}), ctx));r.push("\"> <input type=\"text\" placeholder=\"");r.push(await h.__gv('placeholder', ctx));r.push("\" ");r.push(await h('if', [await h.__gv('name', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("name=\"");r.push(await h.__gv('name', ctx));r.push("\"");return r.join('');}), ctx));r.push(" value=\"");r.push(await h.__gv('value', ctx));r.push("\" ");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push(" autocomplete=\"off\"/> <span class=\"mdi mdi-close clear ");r.push(await h('unless', [await h.__gv('value', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("hide");return r.join('');}), ctx));r.push("\"></span> <div class=\"datetimepicker_container hide\"> <div class=\"datetimepicker-inner\"> ");r.push(await h('if', [await h.__gv('type', ctx), 'date'], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h('dateplugin', {type: await h.__gv('type', ctx), value: await h.__gv('value', ctx), onchange: await h.__gv('onselect', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('type', ctx), 'period'], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h('dateplugin', {type: await h.__gv('type', ctx), value: await h.__gv('value', ctx), onchange: await h.__gv('onselect', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('type', ctx), 'time'], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h('timeplugin', {type: await h.__gv('type', ctx), value: await h.__gv('value', ctx), onchange: await h.__gv('onselect', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('type', ctx), 'datetime'], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h('dateplugin', {type: await h.__gv('type', ctx), value: await h.__gv('value', ctx), onchange: await h.__gv('onselect', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" ");r.push(await h('timeplugin', {type: await h.__gv('type', ctx), value: await h.__gv('value', ctx), onchange: await h.__gv('onselect', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" <div ");r.push(await h('if', [await h.__gv('type', ctx), 'period'], (async (ctx, prev_ctx) => {let r = [];r.push("style=\"display:none\"");return r.join('');}), ctx));r.push(" class=\"datetimepicker-selector\"> <button type=\"button\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.pick");return r.join('');}), ctx));r.push("</button> </div> </div> </div> </span> </div> <div> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </div> ");return r.join('')}
views_cache['/bases/edit.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h.__gv('title', ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <form action=\"\" autocomplete=\"off\"> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.name");return r.join('');}), ctx));r.push(" *</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.name");return r.join('');}), ctx));r.push("\" name=\"name\" autocomplete=\"off\" value=\"");r.push(await h.__gv('base.name', ctx));r.push("\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.price");return r.join('');}), ctx));r.push(" *</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"number\" min=\"0.00\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.price");return r.join('');}), ctx));r.push("\" name=\"price\" autocomplete=\"off\" value=\"");r.push(await h.__gv('base.price', ctx));r.push("\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.type");return r.join('');}), ctx));r.push(" *</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {min: 0, value: await h.__gv('base.type', ctx), onsuggest: await h.__gv('base_type_suggest', ctx), onchange: await h.__gv('base_type_change', ctx), onset: await h.__gv('base_type_set', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.status");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {min: 0, value: await h.__gv('base.status', ctx), onsuggest: await h.__gv('base_status_suggest', ctx), onchange: await h.__gv('base_status_change', ctx), onset: await h.__gv('base_status_set', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"buttons\"> ");r.push(await h('if', [await h.__gv('base.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('base.save', this)\" data-action=\"add\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.add");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" ");r.push(await h('unless', [await h.__gv('base.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('base.save', this)\" data-action=\"update\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.update");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" </div> </form> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/sellers/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"admin_panel block corner-left-top-clip-sm\"> <div class=\"flex_div sellers_page_flex_div\"> <div class=\"admin_panel_cards\"> <div class=\"admin_panel_cards_2\"> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Total balance</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">2,144</span> <span class=\"measure\">usd</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>TOTAL sales</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">pcs</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>sales</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">pcs</span> </span> </div> </div> </div> </div> <div class=\"base_page_main_html\"> <div class=\"filter_text\"> <p class=\"filters_text filters_basee\">filters</p> <span></span> </div> <div class=\"admin_panel_page_caption admin_panel_page_caption_base_html corner-left-top-right-bottom-clip-xs\"> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"base\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"date\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"type\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"buttons margin-top-sm\"> <button type=\"submit\" class=\"bordered col-1-1\">Search</button> </div> </div> </div> <div class=\"responsive_offf corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"sellers_page_right\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>312</span> </div> <div class=\"block-caption block_caption\"> <h2>sellers / statisitcs</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"corner_triangle corner_triangle_sellers_page\"> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"table-container sellers_page_table_container\"> <table> <thead> <tr class=\"sellers_page_tr\"> <th>sellers</th> <th>daily</th> <th>monthly</th> <th>all</th> <th>withdraw</th> </tr> <tr class=\"\"> </tr> </thead> <tbody> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> <tr> <td> opa (50%) </td> <td> 0% of total sales $0/0 btc </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>0% of total sales $0/0 btc</span> </a> </div> </td> <td class=\"action\"> 202.00 € </td> <td class=\"withdraw_color\"> 16.00 € </td> </tr> </tbody> </table> </div> <div class=\"placeholder pagination-wrapper sellers_page_placeholder\"> <nav class=\"pagination\"> <a href=\"\" class=\"prev\"></a> <a href=\"\">1</a> <a href=\"\">2</a> <span class=\"active\">-</span> <a href=\"\">4</a> <a href=\"\">5</a> <a href=\"\" class=\"next\"></a> </nav> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/bases_/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title manage_base_page_corner_left_top_clip_sm_title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>base / manage bases</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"dashboard manage_bases_main manage_bases_page_main\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>TOTAL number of cc</p> </div> <div class=\"flex gap-sm justify-content-space-between manage_bases_page_main_pcs\"> <span class=\"value\">2,144</span> <span class=\"measure\">PCS</span> </div> </div> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>IN SELL</p> </div> <div class=\"flex gap-sm justify-content-space-between manage_bases_page_main_pcs\"> <span class=\"value\">1,250</span> <span class=\"measure\">PCS</span> </div> </div> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>SOLD CC</p> </div> <div class=\"flex gap-sm justify-content-space-between manage_bases_page_main_pcs\"> <span class=\"value\">1,250</span> <span class=\"measure\">PCS</span> </div> </div> <!-- dashboard chart --> <div class=\"dashboard-container manage_bases_dashboard dashboard_section manage_bases_dashboard_seller_page\"> <div class=\"block corner-left corner-left-top-right-bottom-clip-xs\"> <div class=\"contents\"> <div class=\"flex flex-col gap-sm\"> <div class=\"flex flex-justify-between \"> <div class=\"dashboard_page flex flex-justify-between flex-wrap col-2-3\"> <div class=\"dashboard_page_div manage_bases_page_chart \"> <div class=\"chart-donut\"> <div></div> </div> <div class=\"chart_texts\"> <p> <span class=\"dot-middle blue\"></span> Classiq . <span class=\"small-caption\">232</span> </p> <p> <span class=\"dot-middle yellow\"></span> Gold . <span class=\"small-caption\">232</span> </p> <p> <span class=\"dot-middle red\"></span> BUsiness . <span class=\"small-caption\">232</span> </p> <p> <span class=\"dot-middle green\"></span> Infinite . <span class=\"small-caption\">232</span> </p> </div> </div> </div> </div> </div> </div> </div> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"date\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"type\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"seller\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"submit\" class=\"bordered col-1-1\">Search</button> </div> </div> <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"contents contents_inner_manage_base_page\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th>BASE</th> <th>TYPE</th> <th>TYPE</th> <th>PRICE</th> <th>Date</th> <th>StatuS</th> <th colspan=\"2\">action</th> </tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_red boridered\">live</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered\">sold</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action \"> <span style=\"width: 50px;\" class=\"bordered_red remove red\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_uncheck\">pending</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_red boridered\">declined</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_uncheck\">pending</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered\">sold</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_uncheck\">pending</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_red boridered\">declined</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_uncheck\">pending</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered\">sold</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_uncheck\">pending</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_red boridered\">declined</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>user name</span> </div> </td> <td> SELLER NAME </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>CARD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00 €</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <button class=\"bordered_uncheck\">pending</button> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"button search\"></span> </td> <td class=\"action manage_base_page_yes_or_no\"> <span class=\"remove bordered red padding-sm\"></span> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped pagination-wrapper\"> <nav class=\"pagination\"> <a href=\"\" class=\"prev\"></a> <a href=\"\">1</a> <a href=\"\">2</a> <span class=\"active\">-</span> <a href=\"\">4</a> <a href=\"\" class=\"next\"></a> </nav> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/bases/cards/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> ");r.push(await h.__gv('ID', ctx));r.push(" </td> <td> <div class=\"card-number\"> <img src=\"/assets/cards/thumb/");r.push(await h.__gv('bin', ctx));r.push(".png\" alt=\"\">&nbsp; <span>");r.push(await h.__gv('bin', ctx));r.push("</span> </div> </td> <td>");r.push(await h.__gv('expire', ctx));r.push("</td> <td>");r.push(await h.__gv('brand', ctx));r.push("</td> <td>");r.push(await h.__gv('type', ctx));r.push("</td> <td>");r.push(await h.__gv('category', ctx));r.push("</td> <td> <div class=\"card-number\"> <img src=\"https://raw.githubusercontent.com/hampusborgos/country-flags/refs/heads/main/svg/");r.push(await h.__gv('country|lowercase', ctx));r.push(".svg\" alt=\"\"> <span>");r.push(await h.__gv('country', ctx));r.push("</span> </div> </td> <td>");r.push(await h.__gv('issuer', ctx));r.push("</td> <td>");r.push(await h.__gv('base.name', ctx));r.push("</td> <td><span class=\"price\">");r.push(await h.__gv('price', ctx));r.push("$</span></td> </tr>");return r.join('')}
views_cache['/layouts/components/chip.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"filter-chip\" id=\"");r.push(await h.__gv('id', ctx));r.push("\" ");r.push(await h('if', [await h.__gv('filterId', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" data-filter-id=\"");r.push(await h.__gv('filterId', ctx));r.push("\" ");return r.join('');}), ctx));r.push(" data-value=\"");r.push(await h.__gv('value', ctx));r.push("\"> <span class=\"filter-chip-text\">");r.push(await h.__gv('option', ctx));r.push("</span> ");r.push(await h('if', [await h.__gv('isCloseble', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <span class=\"mdi mdi-close\" data-type='close'></span> ");return r.join('');}), ctx));r.push(" </div> ");return r.join('')}
views_cache['/profile/deposit/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>");r.push(await h.__gv('id', ctx));r.push("</span> </div> </td> <td> <span class=\"bordered\">");r.push(await h.__gv('timestamp', ctx));r.push("</span> </td> <td> <span class=\"price\">");r.push(await h.__gv('amount|money', ctx));r.push("</span> </td> <td> ");r.push(await h.__gv('comment', ctx));r.push(" </td> </tr>");return r.join('')}
views_cache['/layouts/components/range.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"");r.push(await h.__gv('classlist', ctx));r.push("\" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> <span>");r.push(await h.__gv('value', ctx));r.push("</span> ");r.push(await h.__gv('text', ctx));r.push(" <input type=\"range\" min=\"");r.push(await h.__gv('min', ctx));r.push("\" max=\"");r.push(await h.__gv('max', ctx));r.push("\" step=\"");r.push(await h.__gv('step', ctx));r.push("\" value=\"");r.push(await h.__gv('value', ctx));r.push("\" name=\"");r.push(await h.__gv('name', ctx));r.push("\"> </div> ");return r.join('')}
views_cache['/login/auth.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"corner-left-bottom-right-top-clip-lg\"> <div class=\"inner\"> <div class=\"bl-top\"> <div class=\"title\"> <h1>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.auth.title");return r.join('');}), ctx));r.push("</h1> <img src=\"/assets/img/warning-yellow.svg\" alt=\"\"> </div> <div class=\"notes\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.auth.notes");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"bl-bottom\"> <div class=\"tabs\"> <div> <a class=\"button\" href=\"/registration\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.title");return r.join('');}), ctx));r.push("</a> <a class=\"button active\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.auth.title");return r.join('');}), ctx));r.push("</a> <!--<a class=\"button\">Visiter sans se connecteur</a>--> </div> <div> <!--<a class=\"button\">Login via telegram</a>--> </div> </div> <div class=\"tab-content\"> <div class=\"row\"> <div class=\"col-1-2\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.nickname");return r.join('');}), ctx));r.push(" *\" name=\"nickname\" autocomplete=\"off\"> </div> <div class=\"col-1-2\"> <input type=\"password\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.registration.password");return r.join('');}), ctx));r.push(" *\" name=\"password\" autocomplete=\"new-password\"> </div> </div> <div class=\"row\" style=\"display: none\"> <div class=\"col-1-1\"> <input id=\"twofa\" type=\"text\" placeholder=\"2FA\" name=\"code\" autocomplete=\"off\"> </div> </div> <div class=\"row\"> <div class=\"col-1-4\"> <button id=\"captcha\" class=\"bordered\" onclick=\"___mc.events.push('auth.login.captcha', this)\">Captcha</button> </div> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"... *\" name=\"captcha\" autocomplete=\"off\"> </div> </div> </div> </div> </div> </div> <div class=\"buttons\"> <button>Want to become our seller</button> <button onclick=\"___mc.events.push('auth.login')\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("login.auth.login");return r.join('');}), ctx));r.push("</button> </div>");return r.join('')}
views_cache['/dashboard/admin.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm dashboard_page_block\"> <div class=\"user_detail_page corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>DASHBOARD</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"hr\"></div> </div> <div class=\"dashboard_flex deposit_page_dashboard_flex\"> <div class=\"admin_panel_cards dashboard_page_admin_panel_cards\"> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Total users</p> </div> <div class=\"flex gap-sm justify-content-space-between dashboard_page_lenovo\"> <span class=\"value\">2,144</span> <span class=\"measure\">users</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>TOTAL cardes in site</p> </div> <div class=\"flex gap-sm justify-content-space-between dashboard_page_lenovo\"> <span class=\"value\">214k</span> <span class=\"measure\">pcs</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>TOTAL balance in site </p> </div> <div class=\"flex gap-sm justify-content-space-between dashboard_page_lenovo\"> <span class=\"value\">115k</span> <span class=\"measure\">usd</span> <span class=\"measure\"> <usd></usd> </span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>BALANCE CASHGEN</p> </div> <div class=\"flex gap-sm justify-content-space-between dashboard_page_lenovo\"> <span class=\"value\">115k</span> <span class=\"measure\">usd</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>BALANCE CASHGEN BULK</p> </div> <div class=\"flex gap-sm justify-content-space-between dashboard_page_lenovo\"> <span class=\"value\">115k</span> <span class=\"measure\">usd</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>USERS BALANCE TOTAL</p> </div> <div class=\"flex gap-sm justify-content-space-between dashboard_page_lenovo\"> <span class=\"value\">115k</span> <span class=\"measure\">usd</span> <span class=\"measure\"> <usd></usd> </span> </div> </div> </div> </div> <div class=\"contents dashboard_page_contents\"> <div class=\"corner-right-bottom-clip-sm space-wrapper \"> <div class=\"placeholder striped\"></div> </div> <div class=\"dashboard_page_flex dashboard_page_flex_2\"> <p class=\"p_one\">name</p> <p class=\"p_two\">value</p> </div> <div class=\"table-container dashboard_page_table_container dashboard_page_table_container_1\"> <table> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>CARTES VENDUES</span> </div> </td> <td class=\"action\"> <span class=\"price\">65,678&euro;</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>CARTES LIVE</span> </div> </td> <td class=\"action\"> <span class=\"price\">7,072&euro;</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>CARTES DEAD</span> </div> </td> <td class=\"action\"> <span class=\"price\">2,954&euro;</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>CARTES NOTCHECK</span> </div> </td> <td class=\"action\"> <span class=\"price\">5,570&euro;</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>VALID-RATE</span> </div> </td> <td class=\"action\"> <span class=\"price\">81.06&euro;</span> </td> </tr> </tbody> </table> </div> <div class=\"corner-right-bottom-clip-sm space-wrapper \"> <div class=\"placeholder striped\"></div> </div> <div class=\"dashboard_page_flex dashboard_page_flex_2\"> <p class=\"p_one\">name</p> <p class=\"p_two\">value</p> </div> <div class=\"table-container dashboard_page_table_container\"> <table> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>DEPOSITS TODAY</span> </div> </td> <td class=\"action\"> <span class=\"price\">65,678&euro;</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>DEPOSITS A WEEK</span> </div> </td> <td class=\"action\"> <span class=\"price\">7,072&euro;</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>DEPOSITS A MONTH</span> </div> </td> <td class=\"action\"> <span class=\"price\">2,954&euro;</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>DEPOSITS 3 MONTHS</span> </div> </td> <td class=\"action\"> <span class=\"price\">5,570&euro;</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>DEPOSIT TOTAL</span> </div> </td> <td class=\"action\"> <span class=\"price\">81.06&euro;</span> </td> </tr> </tbody> </table> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/404.mst'] = async (ctx, h) => {let r = [];r.push("<div id=\"bg-circle\"></div> <div id=\"app\"> <div id=\"not_found\" data-content-holder> ");r.push(await h.__gv('{content}', ctx));r.push(" </div> </div>");return r.join('')}
views_cache['/shop/bulk/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> <input type=\"checkbox\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\"> </td> <td> ");r.push(await h.__gv('name', ctx));r.push(" </td> <td class=\"action\"> <span class=\"price\">");r.push(await h.__gv('price|money', ctx));r.push("$</span> </td> <td class=\"action\"> <button class=\"bordered_red boridered\">");r.push(await h.__gv('status', ctx));r.push("</button> </td> <td class=\"action\"> <button class=\"cart\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\" onclick=\"___mc.events.push('shop.bulk.cart.add', this)\"></button> </td> </tr>");return r.join('')}
views_cache['/layouts/areas/menu.mst'] = async (ctx, h) => {let r = [];r.push("<nav class=\"primary\"> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'NE', 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"menu-item\"> <a href=\"/\"> <img src=\"/assets/img/dashboard.svg\" alt=\"\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.dashboard");return r.join('');}), ctx));r.push("</span> <!--<span class=\"arrow\"></span>--> </a> <!-- <div class=\"submenu\"> <a href=\"\"></a> </div> --> </div> ");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"menu-item\"> <a onclick=\"this.parentElement.classList.toggle('active')\"> <img src=\"/assets/img/dashboard.svg\" alt=\"\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.dashboard");return r.join('');}), ctx));r.push("</span> <span class=\"arrow\"></span> </a> <div class=\"submenu\"> <a href=\"/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.dashboard");return r.join('');}), ctx));r.push("</a> <a href=\"/bases/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.seller.items.bases");return r.join('');}), ctx));r.push("</a> </div> </div> ");return r.join('');}), ctx));r.push(" <div class=\"menu-item\"> <a href=\"/\"> <a href=\"/news/\"> <img src=\"/assets/img/news.svg\" alt=\"\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.news");return r.join('');}), ctx));r.push("</span> </a> </a> </div> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'IN', 'client', 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"menu-item\"> <a onclick=\"this.parentElement.classList.toggle('active')\"> <img src=\"/assets/img/shop.svg\" alt=\"\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.shop._");return r.join('');}), ctx));r.push("</span> <span class=\"arrow\"></span> </a> <div class=\"submenu\"> <a href=\"/shop/cvv/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.shop.cvv");return r.join('');}), ctx));r.push("</a> <a href=\"/shop/bulk/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.shop.bulk");return r.join('');}), ctx));r.push("</a> </div> </div> ");return r.join('');}), ctx));r.push(" <!--div class=\"menu-item\"> <a onclick=\"this.parentElement.classList.toggle('active')\"> <img src=\"/assets/img/exit.svg\" alt=\"\"> <span>Mini games</span> <span class=\"arrow\"></span> </a> <div class=\"submenu\"> <a href=\"\"></a> </div> </div--> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'IN', 'admin', 'support'], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"menu-item\"> <a onclick=\"this.parentElement.classList.toggle('active')\"> <img src=\"/assets/img/shop.svg\" alt=\"\"> <span>Site</span> <span class=\"arrow\"></span> </a> <div class=\"submenu\"> <a href=\"/admin/faq/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.title");return r.join('');}), ctx));r.push("</a> <a href=\"/admin/news/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.news");return r.join('');}), ctx));r.push("</a> <a href=\"/admin/users/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.users");return r.join('');}), ctx));r.push("</a> <a href=\"/admin/bases/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.title");return r.join('');}), ctx));r.push("</a> <a href=\"/admin/orders/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("orders.title");return r.join('');}), ctx));r.push("</a> <a href=\"----\">------------------</a> <a href=\"/admin/users_/\">Users</a> <a href=\"/admin/bases_/\">Bases</a> <a href=\"/admin/deposits/\">Deposits</a> <a href=\"/admin/overview/\">Overview</a> <a href=\"/admin/sales/\">Sales</a> <a href=\"/admin/sellers/\">Sellers</a> <a href=\"/admin/withdrawal/\">Withdrawal Requests</a> <a href=\"/admin/withdrawalcvv/\">Withdrawal cvv</a> </div> </div> ");return r.join('');}), ctx));r.push(" <div class=\"menu-item\"> <a onclick=\"this.parentElement.classList.toggle('active')\"> <img src=\"/assets/img/box.svg\" alt=\"\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.utils._");return r.join('');}), ctx));r.push("</span> <span class=\"arrow\"></span> </a> <div class=\"submenu\"> <a href=\"/utilities/checker-bin/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.utils.checker_bin");return r.join('');}), ctx));r.push("</a> <a href=\"/utilities/checker-cc/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("menu.utils.checker_cc");return r.join('');}), ctx));r.push("</a> </div> </div> </nav> <nav class=\"secondary\"> <!-- <div class=\"menu-item\">--> <!-- <p class=\"title\">Admin:</p>--> <!-- <a href=\"\">Panel admin</a>--> <!-- <div></div>--> <!-- </div>--> <!-- <div class=\"menu-item\">--> <!-- <p class=\"title\">Support:</p>--> <!-- <a href=\"\">Panel support</a>--> <!-- <div></div>--> <!-- </div>--> <!-- <div class=\"menu-item\">--> <!-- <p class=\"title\">Seller:</p>--> <!-- <a href=\"\">Panel seller</a>--> <!-- <div></div>--> <!-- </div>--> </nav>");return r.join('')}
views_cache['/shop/cvv/filters.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"col-1-5\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> <div class=\"filters-column corner-left-top-clip-sm cvv_page_input_title\"> <form action=\"\" autocomplete=\"off\"> <div class=\"col-1-1\"> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.bin");return r.join('');}), ctx));r.push("\" name=\"bins\" value=\"");r.push(await h.__gv('filter.bins', ctx));r.push("\" onchange=\"___mc.events.push('shop.cvv.filter.bin.change', this)\" autocomplete=\"off\"> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'date', placeholder: 'shop.cvv.table.expire', onchange: 'shop.cvv.filter.expire.change', value: await h.__gv('filter.date', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" <!-- <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.expire");return r.join('');}), ctx));r.push("\" name=\"expire\" value=\"");r.push(await h.__gv('filter.expire', ctx));r.push("\" onchange=\"___mc.events.push('shop.cvv.filter.expire.change', this)\" autocomplete=\"off\"> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> --> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'shop.cvv.table.brand', name: 'brand', onsuggest: 'shop.brands.suggest', value: await h.__gv('filter.brand', ctx), onset: await h.__gv('brand_set', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'shop.cvv.table.type', name: 'type', onsuggest: 'shop.types.suggest', value: await h.__gv('filter.type', ctx), onset: await h.__gv('type_set', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'shop.cvv.table.category', name: 'category', onsuggest: 'shop.categories.suggest', value: await h.__gv('filter.category', ctx), onset: await h.__gv('category_set', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'shop.cvv.table.country', name: 'country', onsuggest: 'shop.countries.suggest', value: await h.__gv('filter.country', ctx), onset: await h.__gv('country_set', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'shop.cvv.table.base', name: 'base_id', onsuggest: 'shop.bases.suggest', value: await h.__gv('filter.base_id', ctx), onset: await h.__gv('base_set', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'shop.seller', name: 'seller', onsuggest: 'sellers.suggest', value: await h.__gv('filter.seller', ctx), onset: await h.__gv('seller_set', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <!-- <div class=\"form-element cvv_page_text\"> <p class=\"label libel\">Price</p> <div class=\"progress-container captions yellow\"> <div class=\"progress-number\"> <span>0</span> <span>16&euro;</span> </div> <div class=\"progress-indicator\"> <div class=\"progress-percent\" style=\"width: 55.5%\"></div> </div> </div> </div> --> </div> <div class=\"buttons margin-top-sm\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('shop.cvv.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </form> </div> </div>");return r.join('')}
views_cache['/layouts/components/popup.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"popup-wrapper \"> <div class=\"overlay\"></div> <div class=\"popup block\" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> <span class=\"mdi mdi-close popup-close\"></span> ");r.push(await h.__gv('{content}', ctx));r.push(" </div> </div> ");return r.join('')}
views_cache['/admin/faq/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> ");r.push(await h.__gv('id', ctx));r.push(" </td> <td> ");r.push(await h.__gv('created|datetime', ctx));r.push(" </td> <td> ");r.push(await h.__gv('language', ctx));r.push(" </td> <td> ");r.push(await h.__gv('question', ctx));r.push(" </td> <td> ");r.push(await h.__gv('status', ctx));r.push(" </td> <td class=\"action\"> <a href=\"/admin/faq/edit/");r.push(await h.__gv('id', ctx));r.push("\" class=\"button pencil bordered\"></a> </td> <td class=\"action\"> ");r.push(await h('if', [await h.__gv('status', ctx), 'active'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button class=\"button remove red bordered\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\" onclick=\"___mc.events.push('admin.faq.archive', {id: ");r.push(await h.__gv('id', ctx));r.push(", question:'");r.push(await h.__gv('question|escape_html', ctx));r.push("' })\"></button> ");return r.join('');}), ctx));r.push(" </td> </tr>");return r.join('')}
views_cache['/layouts/maintenance.mst'] = async (ctx, h) => {let r = [];r.push("<div id=\"bg-circle\"></div> <div id=\"app\"> <div id=\"maintenance\" data-content-holder> ");r.push(await h.__gv('{content}', ctx));r.push(" </div> </div>");return r.join('')}
views_cache['/dashboard/seller.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section class=\"panel-seller\"> <div class=\"container panel_seller_page_row\"> <ul class=\"ul-section-top\"> <li> <a href=\"./panel-seller.html\" class=\"active\">Dashboard</a> </li> <li> <a href=\"./manage-base.html\">Manage base</a> </li> <li> <a href=\"./upload-base.html\">Upload base</a> </li> </ul> <div class=\"row\"> <div class=\"block corner-left-top-clip-sm panel_seller_page_row_corner_left_top_clip_sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>My rank and progress</h2> <a href=\"\"> <img src=\"/front/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"ul panel_seller_page_row_corner_left_top_clip_sm_ul\"> <div class=\"panel_seller_border_span\"> <span> <p>Rank</p> <img src=\"../img/arrow-right.svg\" alt=\"\"> </span> <span class=\"border_span\"> <p>Silver</p> <img src=\"../img/silver.svg\" alt=\"\"> </span> </div> <div class=\"panel_seller_border_span_1\"> <span class=\"panel_seller_border_span_1\"> <p>Rank</p> <img src=\"../img/arrow-right.svg\" alt=\"\"> </span> <span class=\"border_span panel_seller_border_span_1\"> <p>Silver</p> <img src=\"../img/silver.svg\" alt=\"\"> </span> </div> <div class=\"loading-bar\"> <div class=\"loading\"> </div> </div> <div class=\"panel_seller_border_span panel_seller_border_span_22\"> <span> <p>Rank</p> <img src=\"../img/arrow-right.svg\" alt=\"\"> </span> <span class=\"border_span\"> <p>gold</p> <img src=\"../img/gold.svg\" alt=\"\"> </span> </div> <div class=\"panel_seller_border_span_1\"> <span> <p>Rank</p> <img src=\"../img/arrow-right.svg\" alt=\"\"> </span> <span class=\"border_span\"> <p>gold</p> <img src=\"../img/gold.svg\" alt=\"\"> </span> </div> </div> <div class=\"center_percentage\"> <h3>50.16%</h3> <span>Sur</span> <h3>100%</h3> </div> <div class=\"left_bottom panel_seller_sales_stats_left_bottom\"> <div class=\"silver_left_btm\"> <p>Current rank.</p> <h2> <span>Silver</span> <img src=\"../img/silver.svg\" alt=\"\"> </h2> <div class=\"bg media_responsive_off\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"silver_right_btm silver_right_btm_li_containers\"> <h4>Calculated based on <br> total cc sales</h4> <div class=\"li_container\"> <li> <svg width=\"15\" height=\"11\" viewBox=\"0 0 15 11\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"> <path d=\"M14.2046 0.934958C14.1116 0.84123 14.001 0.766836 13.8792 0.716067C13.7573 0.665298 13.6266 0.63916 13.4946 0.63916C13.3626 0.63916 13.2319 0.665298 13.11 0.716067C12.9881 0.766836 12.8775 0.84123 12.7846 0.934958L5.33458 8.39496L2.20458 5.25496C2.10806 5.16172 1.99412 5.08841 1.86926 5.0392C1.74441 4.99 1.61108 4.96587 1.4769 4.96819C1.34272 4.97051 1.21031 4.99924 1.08723 5.05273C0.964154 5.10623 0.852817 5.18344 0.759579 5.27996C0.66634 5.37648 0.593026 5.49042 0.543822 5.61528C0.494618 5.74013 0.470488 5.87346 0.472809 6.00764C0.475131 6.14182 0.503858 6.27423 0.557352 6.3973C0.610845 6.52038 0.688057 6.63172 0.784579 6.72496L4.62458 10.565C4.71754 10.6587 4.82814 10.7331 4.95 10.7838C5.07186 10.8346 5.20257 10.8608 5.33458 10.8608C5.46659 10.8608 5.5973 10.8346 5.71916 10.7838C5.84101 10.7331 5.95162 10.6587 6.04458 10.565L14.2046 2.40496C14.3061 2.31132 14.3871 2.19766 14.4425 2.07117C14.4979 1.94467 14.5265 1.80806 14.5265 1.66996C14.5265 1.53186 14.4979 1.39525 14.4425 1.26875C14.3871 1.14225 14.3061 1.0286 14.2046 0.934958Z\" fill=\"#0BF1FF\" fill-opacity=\"0.5\" /> </svg> <span>Conscient de l'importance d'un accès</span> </li> </div> <div class=\"li_container\"> <li> <svg width=\"15\" height=\"11\" viewBox=\"0 0 15 11\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"> <path d=\"M14.2046 0.934958C14.1116 0.84123 14.001 0.766836 13.8792 0.716067C13.7573 0.665298 13.6266 0.63916 13.4946 0.63916C13.3626 0.63916 13.2319 0.665298 13.11 0.716067C12.9881 0.766836 12.8775 0.84123 12.7846 0.934958L5.33458 8.39496L2.20458 5.25496C2.10806 5.16172 1.99412 5.08841 1.86926 5.0392C1.74441 4.99 1.61108 4.96587 1.4769 4.96819C1.34272 4.97051 1.21031 4.99924 1.08723 5.05273C0.964154 5.10623 0.852817 5.18344 0.759579 5.27996C0.66634 5.37648 0.593026 5.49042 0.543822 5.61528C0.494618 5.74013 0.470488 5.87346 0.472809 6.00764C0.475131 6.14182 0.503858 6.27423 0.557352 6.3973C0.610845 6.52038 0.688057 6.63172 0.784579 6.72496L4.62458 10.565C4.71754 10.6587 4.82814 10.7331 4.95 10.7838C5.07186 10.8346 5.20257 10.8608 5.33458 10.8608C5.46659 10.8608 5.5973 10.8346 5.71916 10.7838C5.84101 10.7331 5.95162 10.6587 6.04458 10.565L14.2046 2.40496C14.3061 2.31132 14.3871 2.19766 14.4425 2.07117C14.4979 1.94467 14.5265 1.80806 14.5265 1.66996C14.5265 1.53186 14.4979 1.39525 14.4425 1.26875C14.3871 1.14225 14.3061 1.0286 14.2046 0.934958Z\" fill=\"#0BF1FF\" fill-opacity=\"0.5\" /> </svg> <span>Conscient de l'importance</span> </li> </div> <div class=\"li_container\"> <li> <svg width=\"15\" height=\"11\" viewBox=\"0 0 15 11\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"> <path d=\"M14.2046 0.934958C14.1116 0.84123 14.001 0.766836 13.8792 0.716067C13.7573 0.665298 13.6266 0.63916 13.4946 0.63916C13.3626 0.63916 13.2319 0.665298 13.11 0.716067C12.9881 0.766836 12.8775 0.84123 12.7846 0.934958L5.33458 8.39496L2.20458 5.25496C2.10806 5.16172 1.99412 5.08841 1.86926 5.0392C1.74441 4.99 1.61108 4.96587 1.4769 4.96819C1.34272 4.97051 1.21031 4.99924 1.08723 5.05273C0.964154 5.10623 0.852817 5.18344 0.759579 5.27996C0.66634 5.37648 0.593026 5.49042 0.543822 5.61528C0.494618 5.74013 0.470488 5.87346 0.472809 6.00764C0.475131 6.14182 0.503858 6.27423 0.557352 6.3973C0.610845 6.52038 0.688057 6.63172 0.784579 6.72496L4.62458 10.565C4.71754 10.6587 4.82814 10.7331 4.95 10.7838C5.07186 10.8346 5.20257 10.8608 5.33458 10.8608C5.46659 10.8608 5.5973 10.8346 5.71916 10.7838C5.84101 10.7331 5.95162 10.6587 6.04458 10.565L14.2046 2.40496C14.3061 2.31132 14.3871 2.19766 14.4425 2.07117C14.4979 1.94467 14.5265 1.80806 14.5265 1.66996C14.5265 1.53186 14.4979 1.39525 14.4425 1.26875C14.3871 1.14225 14.3061 1.0286 14.2046 0.934958Z\" fill=\"#0BF1FF\" fill-opacity=\"0.5\" /> </svg> <span>Conscl'importance d'un accès</span> </li> </div> </div> </div> </div> <div class=\"block corner-right-top-clip-sm media_responsive_off\"> <div class=\"placeholder striped\"></div> </div> <div class=\"block corner-left-top-clip-sm three_block panel_seller_width_full\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>04</span> </div> <div class=\"block-caption block_caption \"> <h2>Sales / stats</h2> <a href=\"\"> <img src=\"/front/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"sales_stats panel_seller_sales_stats panel_seller_width_full_panel_seller_sales_stats\"> <div class=\"currently_on_sale\"> <p>currently on sale.</p> <div class=\"currently_on_sale_big\"> <h1>183</h1> <span>unit</span> </div> </div> <div class=\"currently_on_sale\"> <p>total sales.</p> <div class=\"currently_on_sale_big\"> <h1>583</h1> <span>unit</span> </div> </div> <div class=\"currently_on_sale_null panel_seller_page_corner_bg\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"stats panel_seller_stats_\"> <div class=\"hr_chiziq\"></div> <p class=\"stats_title\">Stats.</p> <div class=\"tables\"> <div class=\"table\"> <div class=\"box\"> <p>8.000 +</p> </div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> </div> <div class=\"table\"> <div class=\"box\"> <p>4.000 +</p> </div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> </div> <div class=\"table\"> <div class=\"box\"> <p>2.000 +</p> </div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> </div> <div class=\"table\"> <div class=\"box\"> <p>1.000 +</p> </div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> </div> <div class=\"table\"> <div class=\"box\"> <p>500 +</p> </div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> </div> <div class=\"table\"> <div class=\"box\"> <p>50 +</p> </div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> <div class=\"box\"></div> </div> <div class=\"table panel_seller_boxes\"> <div class=\"box\"> </div> <div class=\"box\"> <p>Month</p> </div> <div class=\"box\"> <p>Month</p> </div> <div class=\"box\"> <p>Month</p> </div> <div class=\"box\"> <p>Month</p> </div> <div class=\"box\"> <p>Month</p> </div> </div> </div> </div> </div> <div class=\"block corner-left-top-clip-sm three_block panel_siyaler_corner_left_top_clip_sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>05</span> </div> <div class=\"block-caption block_caption\"> <h2>my results</h2> <a href=\"\"> <img src=\"/front/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"sales_stats panel_seller_sales_stats \"> <div class=\"currently_on_sale\"> <p>gross total income.</p> <div class=\"currently_on_sale_big\"> <h1>1.000</h1> <span>USD</span> </div> </div> <div class=\"currently_on_sale\"> <p>total net income.</p> <div class=\"currently_on_sale_big\"> <h1>850</h1> <span>USD</span> </div> </div> </div> <div class=\"derniere panel_seller_html_derniere\"> <div class=\"hr_chiziq\"></div> <p>Dernière ventes.</p> <div class=\"bg corner-right-top-clip-sm space-wrapper panel_seller_corner_bg_2\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"table-container panel_seller_page_table_container\"> <table> <thead> <tr> <th>?</th> <th>buyer's name</th> <th>Level</th> <th>amount</th> </tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span>416549</span> </div> </td> <td>thay_2811</td> <td>Classique</td> <td class=\"action\"> <span class=\"price\">5.00 €</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>416549</span> </div> </td> <td>thay_2811</td> <td>Classique</td> <td class=\"action\"> <span class=\"price\">5.00 €</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>416549</span> </div> </td> <td>thay_2811</td> <td>Classique</td> <td class=\"action\"> <span class=\"price\">5.00 €</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>416549</span> </div> </td> <td>thay_2811</td> <td>Classique</td> <td class=\"action\"> <span class=\"price\">5.00 €</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>416549</span> </div> </td> <td>thay_2811</td> <td>Classique</td> <td class=\"action\"> <span class=\"price\">5.00 €</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>416549</span> </div> </td> <td>thay_2811</td> <td>Classique</td> <td class=\"action\"> <span class=\"price\">5.00 €</span> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>416549</span> </div> </td> <td>thay_2811</td> <td>Classique</td> <td class=\"action\"> <span class=\"price\">5.00 €</span> </td> </tr> </tbody> </table> </div> <div class=\"table_bottom\"> <div class=\"nv\"> <div class=\"line\"></div> <svg width=\"10\" height=\"6\" viewBox=\"0 0 10 6\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"> <path d=\"M5 0.25L9.5 5.25H0.5L5 0.25Z\" fill=\"#0BF1FF\" fill-opacity=\"0.5\" /> </svg> <div class=\"line\"></div> </div> <div class=\"bg corner-right-top-clip-sm space-wrapper panel_seller_corner_bg_\"> <div class=\"placeholder striped\"></div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/dashboard/support.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"dashboard-container\"> <h1>Welcome</h1> </div> </div> </section>");return r.join('')}
views_cache['/admin/bases/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title \"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\" style=\"border: none; padding: 0\"> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'admin.bases.filter.created.start.change', value: await h.__gv('filter.period_s', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'admin.bases.filter.created.end.change', value: await h.__gv('filter.period_e', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'bases.table.type', name: 'type', value: await h.__gv('filter.type', ctx), onset: await h.__gv('type_set', ctx), onsuggest: await h.__gv('type_suggest', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'true', placeholder: 'bases.table.status', name: 'status', value: await h.__gv('filter.status', ctx), onset: await h.__gv('status_set', ctx), onsuggest: await h.__gv('status_suggest', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'shop.seller', name: 'user_id', onsuggest: 'sellers.suggest', value: await h.__gv('filter.user_id', ctx), onset: await h.__gv('seller_set', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('admin.bases.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"contents contents_inner_manage_base_page\" handler=\"controllers/admin/bases/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th>ID</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.created");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.name");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.price");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.type");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.status");return r.join('');}), ctx));r.push("</th> <th colspan=\"3\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/withdrawalcvv/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"dashboard referral_page withdrawal_requests_cvv_dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Total balance</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">2,144</span> <span class=\"measure\">usd</span> </div> </div> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>WAITING FOR WITHDRAW</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">usd</span> </div> </div> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>ALL TIME WITHDRAWAL</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">usd</span> </div> </div> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>REQUESTS</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <!-- <span class=\"measure\">users</span> --> </div> </div> </div> <div class=\"withdrawal_texts withdrawal_requests_cvv_dashboard_texts\"> <div class=\"meyn_div withdrawal_requests_cvv_dashboard_meyn_div\"> <div class=\"title\"> <div class=\"block-caption block_caption\"> <h2>DATE</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block-caption block_caption\"> <h2>AMOUNT</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block-caption block_caption\"> <h2>STATUS</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"buttons\"> <button type=\"submit\" class=\"bordered col-1-1\">Search</button> </div> </div> <div class=\"col-1-5 withdrawal_requests_cvv_dashboard_1_5\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"contents\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container\"> <table> <thead> <tr> <th>request ID</th> <th>rank</th> <th>amount</th> <th>CREATED </th> <th>UPDATED</th> <th>StatuS</th> <th colspan=\"2\">action</th> </tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <span class=\"bordered\">21.12.2024</span> </td> <td> <span class=\"bordered\">12.05.23</span> </td> <td> <button class=\"bordered\">APPROVED</button> </td> <td class=\"action withdrawal_page_check_icon\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <span class=\"bordered\">21.12.2024</span> </td> <td> <span class=\"bordered\">12.05.23</span> </td> <td> <button class=\"bordered_red\">declined</button> </td> <td class=\"action withdrawal_page_check_icon\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <span class=\"bordered\">21.12.2024</span> </td> <td> <span class=\"bordered\">12.05.23</span> </td> <td> <button class=\"bordered\">APPROVED</button> </td> <td class=\"action withdrawal_page_check_icon\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <span class=\"bordered\">21.12.2024</span> </td> <td> <span class=\"bordered\">12.05.23</span> </td> <td> <button class=\"bordered_red\">declined</button> </td> <td class=\"action withdrawal_page_check_icon\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <span class=\"bordered\">21.12.2024</span> </td> <td> <span class=\"bordered\">12.05.23</span> </td> <td> <button class=\"bordered\">APPROVED</button> </td> <td class=\"action withdrawal_page_check_icon\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <span class=\"bordered\">21.12.2024</span> </td> <td> <span class=\"bordered\">12.05.23</span> </td> <td> <button class=\"bordered_red\">declined</button> </td> <td class=\"action withdrawal_page_check_icon\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <span class=\"bordered\">21.12.2024</span> </td> <td> <span class=\"bordered\">12.05.23</span> </td> <td> <button class=\"bordered\">APPROVED</button> </td> <td class=\"action withdrawal_page_check_icon\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <span class=\"bordered\">21.12.2024</span> </td> <td> <span class=\"bordered\">12.05.23</span> </td> <td> <button class=\"bordered_red\">declined</button> </td> <td class=\"action withdrawal_page_check_icon\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <span class=\"bordered\">21.12.2024</span> </td> <td> <span class=\"bordered\">12.05.23</span> </td> <td> <button class=\"bordered\">APPROVED</button> </td> <td class=\"action withdrawal_page_check_icon\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped pagination-wrapper\"> <nav class=\"pagination\"> <a href=\"\" class=\"prev\"></a> <a href=\"\">1</a> <a href=\"\">2</a> <span class=\"active\">-</span> <a href=\"\">4</a> <a href=\"\" class=\"next\"></a> </nav> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/shop/cart/cvv/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> <input type=\"checkbox\" data-pos=\"");r.push(await h.__gv('id', ctx));r.push("\"> </td> <td> <div class=\"card-number\"> <img src=\"/assets/cards/thumb/");r.push(await h.__gv('info.bin', ctx));r.push(".png\" alt=\"\">&nbsp; <span>");r.push(await h.__gv('info.bin', ctx));r.push("</span> </div> </td> <!--<td>");r.push(await h.__gv('info.expire', ctx));r.push("</td>--> <td>");r.push(await h.__gv('info.brand', ctx));r.push("</td> <td>");r.push(await h.__gv('info.type', ctx));r.push("</td> <td>");r.push(await h.__gv('info.category', ctx));r.push("</td> <!-- <td> <div class=\"card-number\"> <img src=\"https://raw.githubusercontent.com/hampusborgos/country-flags/refs/heads/main/svg/");r.push(await h.__gv('info.country|lowercase', ctx));r.push(".svg\" alt=\"\"> <span>");r.push(await h.__gv('info.country', ctx));r.push("</span> </div> </td> <td>");r.push(await h.__gv('info.issuer', ctx));r.push("</td> <td>");r.push(await h.__gv('info.base.name', ctx));r.push("</td> --> <td><span class=\"price\">");r.push(await h.__gv('price|money', ctx));r.push("$</span></td> <td class=\"action\"> <button class=\"remove red\" data-pos=\"");r.push(await h.__gv('id', ctx));r.push("\" onclick=\"___mc.events.push('shop.cart.remove', this)\"></button> </td> </tr>");return r.join('')}
views_cache['/profile/referral/item.mst'] = async (ctx, h) => {let r = [];return r.join('')}
views_cache['/admin/orders/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> ");r.push(await h.__gv('id', ctx));r.push(" </td> <td> ");r.push(await h.__gv('created|datetime', ctx));r.push(" </td> <td> <span class=\"price\">");r.push(await h.__gv('amount|money', ctx));r.push("$</span> </td> <td class=\"action\"> <button class=\"bordered_red boridered\">");r.push(await h.__gv('status', ctx));r.push("</button> </td> <td> ");r.push(await h.__gv('items|count', ctx));r.push(" </td> <td class=\"action\"> <a href=\"/admin/orders/details/");r.push(await h.__gv('id', ctx));r.push("\" class=\"button eye bordered\"></a> </td> </tr>");return r.join('')}
views_cache['/shop/bulk/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title \"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.bulk.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\" style=\"border: none; padding: 0\"> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'shop.bulk.table.created', onchange: 'shop.bulk.filter.created.start.change', value: await h.__gv('filter.period_s', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'shop.bulk.table.created', onchange: 'shop.bulk.filter.created.end.change', value: await h.__gv('filter.period_e', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'shop.seller', name: 'seller', onsuggest: 'sellers.suggest', value: await h.__gv('filter.seller', ctx), onset: await h.__gv('seller_set', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.bulk.table.base_name");return r.join('');}), ctx));r.push("\" name=\"q\" value=\"");r.push(await h.__gv('filter.q', ctx));r.push("\" onchange=\"___mc.events.push('shop.bulk.filter.q.change', this)\" autocomplete=\"off\"> </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('shop.bulk.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"contents contents_inner_manage_base_page\" handler=\"controllers/shop/bulk/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th><input type=\"checkbox\" onchange=\"___mc.events.push('shop.bulk.checkbox.all.toggle', this)\"></th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.bulk.table.name");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.bulk.table.price");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.bulk.table.status");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/bases/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> <input type=\"checkbox\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\"> </td> <td> ");r.push(await h.__gv('created|datetime', ctx));r.push(" </td> <td> ");r.push(await h.__gv('name', ctx));r.push(" </td> <td> <span class=\"price\">");r.push(await h.__gv('price|money', ctx));r.push("$</span> </td> <td class=\"action\"> <button class=\"bordered_red boridered\">");r.push(await h.__gv('status', ctx));r.push("</button> </td> <td class=\"action\"> <a href=\"/bases/edit/");r.push(await h.__gv('id', ctx));r.push("\" class=\"button pencil bordered\"></a> </td> <td class=\"action\"> <a href=\"/bases/");r.push(await h.__gv('id', ctx));r.push("/cards/\" class=\"button eye bordered\"></a> </td> <td class=\"action\"> ");r.push(await h('if', [await h.__gv('status', ctx), 'active'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button class=\"button remove red bordered\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\" onclick=\"___mc.events.push('bases.archive', {id: ");r.push(await h.__gv('id', ctx));r.push(", name:'");r.push(await h.__gv('name|escape_html', ctx));r.push("' })\"></button> ");return r.join('');}), ctx));r.push(" </td> </tr>");return r.join('')}
views_cache['/layouts/components/pagination.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"placeholder striped pagination-wrapper\"> <nav class=\"pagination\"> ");r.push(await h('if', [await h.__gv('total_pages', ctx), '>', 1], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h('if', [await h.__gv('prev', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <a class=\"prev\" href=\"");r.push(await h.__gv('prev', ctx));r.push("\"></a> ");return r.join('');}), ctx));r.push(" ");r.push(await h('each', [await h.__gv('pages', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h('if', [await h.__gv('page', ctx), await h.__gv('../current', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <span class=\"active\">-</span> ");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('page', ctx), 'NE', await h.__gv('../current', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <a ");r.push(await h('if', [await h.__gv('uri', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("href=\"");r.push(await h.__gv('uri', ctx));r.push("\"");return r.join('');}), ctx));r.push(">");r.push(await h.__gv('page', ctx));r.push("</a> ");return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('next', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <a class=\"next\" href=\"");r.push(await h.__gv('next', ctx));r.push("\"></a> ");return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" </nav> </div>");return r.join('')}
views_cache['/admin/news/edit.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h.__gv('title', ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <form action=\"\" autocomplete=\"off\"> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.edit.title");return r.join('');}), ctx));r.push(" *</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.edit.title");return r.join('');}), ctx));r.push("\" name=\"title\" autocomplete=\"off\" value=\"");r.push(await h.__gv('news.title', ctx));r.push("\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.table.lang");return r.join('');}), ctx));r.push(" *</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {min: 0, value: await h.__gv('news.lang', ctx), onsuggest: await h.__gv('news_lang_suggest', ctx), onchange: await h.__gv('news_lang_change', ctx), onset: await h.__gv('news_lang_set', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.table.role");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {min: 0, value: await h.__gv('news.role', ctx), onsuggest: await h.__gv('news_role_suggest', ctx), onchange: await h.__gv('news_role_change', ctx), onset: await h.__gv('news_role_set', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.table.status");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {min: 0, value: await h.__gv('news.status', ctx), onsuggest: await h.__gv('news_status_suggest', ctx), onchange: await h.__gv('news_status_change', ctx), onset: await h.__gv('news_status_set', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.table.date");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('datetimepicker', {type: 'date', placeholder: 'news.table.date', onchange: 'admin.news.date.change', value: await h.__gv('news.date', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.edit.description");return r.join('');}), ctx));r.push("</p> <textarea placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.edit.description");return r.join('');}), ctx));r.push("\" name=\"description\" autocomplete=\"off\">");r.push(await h.__gv('news.description', ctx));r.push("</textarea> <p class=\"notes\">20 ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("info.characters_minimum");return r.join('');}), ctx));r.push("</p> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.edit.text");return r.join('');}), ctx));r.push("</p> <div id=\"html-editor-description\">");r.push(await h.__gv('{news.text}', ctx));r.push("</div> </div> <div class=\"buttons\"> ");r.push(await h('if', [await h.__gv('news.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('admin.news.save', this)\" data-action=\"create\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.add");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" ");r.push(await h('unless', [await h.__gv('news.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('admin.news.save', this)\" data-action=\"update\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.update");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" </div> </form> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/areas/header.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"media_on\"> <div class=\"hamburger_menu\" onclick=\"document.querySelector('.responsive_toggle_menu').classList.toggle('show'); document.querySelector('.responsive_toggle_m').classList.toggle('active')\"> <img src=\"/assets/img/menu.svg\" alt=\"\"> </div> <div class=\"bl-panel\"> <div class=\"balance oddiy\"> <a href=\"/profile/deposit/\" class=\"flex flex-align-center\"> <span>+ ");r.push(await h.__gv('profile.balance|money', ctx));r.push("</span> <img src=\"/assets/img/usd.svg\" alt=\"\"> </a> <a onclick=\"document.querySelector('main .blurred-cover').classList.toggle('active'); document.querySelector('.head-context-menu').classList.add('active'); document.querySelector('.head-currency-menu').classList.remove('active')\"> <img class=\"arrow-down-2\" style=\"width: 12px;\" src=\"/assets/img/arrow-down.svg\" alt=\"\"> </a> </div> </div> </div> <div class=\"blurred-cover\" onclick=\"this.classList.remove('active');\"> <div class=\"context-menu\"> <div class=\"wrapper head-context-menu\"> <div class=\"corner-right-top-clip-xs flex flex-col\"> <div class=\"bordered text-right\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("header.my_profile");return r.join('');}), ctx));r.push("</p> </div> <nav class=\"flex flex-col flex-align-flex-end margin-top-sm\"> <a href=\"/profile/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("header.settings");return r.join('');}), ctx));r.push("</a> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'IN', 'client', 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <a href=\"/shop/cart/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cart.title");return r.join('');}), ctx));r.push("</a> ");return r.join('');}), ctx));r.push(" </nav> </div> <div class=\"corner-left-bottom-clip-xs flex flex-col\"> <div class=\"bordered text-right\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("header.more");return r.join('');}), ctx));r.push("</p> </div> <nav class=\"flex flex-col flex-align-flex-end margin-top-sm\"> <a href=\"/support/\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("header.support");return r.join('');}), ctx));r.push("</a> <a onclick=\"___mc.auth.logout()\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("header.log_out");return r.join('');}), ctx));r.push("</a> </nav> </div> </div> <div class=\"wrapper head-currency-menu\"> <div class=\"corner-left-top-clip-xs search\"> <img src=\"/assets/img/search.svg\" alt=\"\"> <p>Search currencies</p> </div> <div class=\"items\"> <div> <span class=\"title\">0.00</span> <img src=\"/assets/img/btc.svg\" alt=\"\"> <span class=\"caption\">BTC</span> <button> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </button> </div> <div> <span class=\"title\">0.00</span> <img src=\"/assets/img/btc.svg\" alt=\"\"> <span class=\"caption\">BTC</span> <button> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </button> </div> <div> <span class=\"title\">0.00</span> <img src=\"/assets/img/btc.svg\" alt=\"\"> <span class=\"caption\">BTC</span> <button> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </button> </div> <div> <span class=\"title\">0.00</span> <img src=\"/assets/img/btc.svg\" alt=\"\"> <span class=\"caption\">BTC</span> <button> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </button> </div> </div> <div class=\"corner-right-bottom-clip-xs buttons\"> <div class=\"border\"></div> <button>See my wallet</button> </div> </div> </div> </div> <header> <div class=\"container\"> <div class=\"bl-top account_page_media media_off\"> <div class=\"navi-path\"> <h1>");r.push(await h.__gv('header.title', ctx));r.push("</h1> ");r.push(await h('each', [await h.__gv('header.breadcrumbs', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <p><span>");r.push(await h.__gv('url', ctx));r.push("</span>");r.push(await h.__gv('name', ctx));r.push("</p> ");return r.join('');}), ctx));r.push(" </div> <div class=\"info-panel\"> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"bl-panel\"> <a class=\"rank\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.rank.title");return r.join('');}), ctx));r.push("</span> <span class=\"arrow arrow-right\"></span> </a> <a class=\"button bordered\"> <span>");r.push(await h.__gv('profile.rank.name', ctx));r.push("</span> </a> <a> <img src=\"/assets/img/");r.push(await h.__gv('profile.rank.name', ctx));r.push(".svg\" alt=\"\"> </a> </div> ");return r.join('');}), ctx));r.push(" <div class=\"index_html_show_profile\"> <div class=\"bl-panel \"> <div class=\"balance\"> <a href=\"/profile/deposit/\"> <span>+ ");r.push(await h.__gv('profile.balance|money', ctx));r.push("</span> <img src=\"/assets/img/usd.svg\" alt=\"\"> </a> <a class=\"hide\" onclick=\"document.querySelector('main .blurred-cover').classList.toggle('active'); document.querySelector('.head-context-menu').classList.add('active'); document.querySelector('.head-currency-menu').classList.remove('active')\"> <img class=\"arrow-down-2\" style=\"width: 12px;\" src=\"/assets/img/arrow-down.svg\" alt=\"\"> </a> </div> </div> </div> <div class=\"bl-panel\"> <div class=\"index_html_show_profile2\"> <div> <a href=\"/profile/\"> <span>");r.push(await h.__gv('profile.nickname', ctx));r.push("</span> </a> </div> <!-- <div class=\"login\"> <a href=\"/profile/\"> <img src=\"/assets/img/login.svg\" alt=\"\"> </a> </div> --> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'IN', 'client', 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"cart\"> <a href=\"/shop/cart/\"> <img src=\"/assets/img/cart.svg\" alt=\"\"> </a> </div> ");return r.join('');}), ctx));r.push(" </div> <div class=\"flex\"> <a class=\"header-menu\" onclick=\"document.querySelector('main .blurred-cover').classList.toggle('active'); document.querySelector('.head-context-menu').classList.add('active'); document.querySelector('.head-currency-menu').classList.remove('active')\"> <span class=\"menu-dots\"> <span class=\"menu-dot\"></span> <span class=\"menu-dot\"></span> <span class=\"menu-dot\"></span> </span> </a> </div> </div> </div> </div> <div class=\"bl-bottom responsiveNone\"> <div> ");r.push(await h('each', [await h.__gv('header.actions', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <!-- <button>Buy individually</button> <button>Buy in bulk</button> --> ");r.push(await h.__gv('{.}', ctx));r.push(" ");return r.join('');}), ctx));r.push(" </div> <div> ");r.push(await h('each', [await h.__gv('header.notes', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <!-- <p>text block</p> <p>.<span class=\"el-count red\">001</span></p> --> ");r.push(await h.__gv('{.}', ctx));r.push(" ");return r.join('');}), ctx));r.push(" </div> <div> ");r.push(await h('each', [await h.__gv('header.counters', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <!-- <a>acheter la selection <span class=\"el-count\">(5)</span></a> <a>goto cart <span class=\"el-count\">(7)</span></a> <a>all filters</a> --> ");r.push(await h.__gv('{.}', ctx));r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"index_page_main context-menu active\"> <div class=\"wrapper index_page_wrapper2\"> <div class=\"corner-left-top-clip-xs search\"> <img src=\"/assets/img/search.svg\" alt=\"\"> <input style=\"background: transparent !important;\" placeholder=\"Search currencies\" type=\"text\"> </div> <div class=\"items\"> <div> <span class=\"title\">0.00</span> <img src=\"/assets/img/btc.svg\" alt=\"\"> <span class=\"caption\">BTC</span> <button> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </button> </div> <div> <span class=\"title\">0.00</span> <img src=\"/assets/img/btc.svg\" alt=\"\"> <span class=\"caption\">BTC</span> <button> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </button> </div> <div> <span class=\"title\">0.00</span> <img src=\"/assets/img/btc.svg\" alt=\"\"> <span class=\"caption\">BTC</span> <button> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </button> </div> <div> <span class=\"title\">0.00</span> <img src=\"/assets/img/btc.svg\" alt=\"\"> <span class=\"caption\">BTC</span> <button> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </button> </div> </div> <div class=\"corner-right-bottom-clip-xs buttons\"> <div class=\"border\"></div> <button>See my wallet</button> </div> </div> <div class=\"wrapper index_page_wrapper\"> <div class=\"corner-right-top-clip-xs flex flex-col\"> <div class=\"bordered text-right\"> <p>My Profile</p> </div> <nav class=\"flex flex-col flex-align-flex-end margin-top-sm\"> <a href=\"/profile/\">Settings</a> </nav> </div> <div class=\"corner-left-bottom-clip-xs flex flex-col\"> <div class=\"bordered text-right\"> <p>More</p> </div> <nav class=\"flex flex-col flex-align-flex-end margin-top-sm\"> <a href=\"/support/\">Support</a> <a href=\"#\">Log out</a> </nav> </div> </div> </div> </header>");return r.join('')}
views_cache['/layouts/components/loader.mst'] = async (ctx, h) => {let r = [];return r.join('')}
views_cache['/profile/referral/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"dashboard referral_page\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Total number</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">2,144</span> <span class=\"measure\">users</span> </div> </div> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Joined from you</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">users</span> </div> </div> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Joined from your friends</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">users</span> </div> </div> <div class=\"col-1-4 referral_page_col_1\"> <div class=\"cornered-text-block corner-left-top-right-bottom-clip-xs margin-bottom-xs referral-link\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> <p>Your referral link | Copy link</p> </div> <div class=\"referral-url\"> <a href=\"\" class=\"button gap-xs\"> <span>focusedstudio.com/referral-link</span> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </a> </div> </div> </div> <div class=\"contents\" handler=\"controllers/profile/referral/handler\"> <div class=\"contents-inner\"> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped\"></div> </div> <div class=\"table-container\"> <table> <thead> <tr> <th>user id</th> <th>username</th> <th>rank</th> <th>your earning</th> <th>date</th> <th>status</th> <th colspan=\"2\">action</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/maintenance.mst'] = async (ctx, h) => {let r = [];return r.join('')}
views_cache['/layouts/components/dateplugin.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"dateplugin \" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> ");r.push(await h('if', [await h.__gv('years', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"controls ");r.push(await h('if', [await h.__gv('type', ctx), 'NE', 'period'], (async (ctx, prev_ctx) => {let r = [];r.push("hide");return r.join('');}), ctx));r.push(" calendar-list\"> <span class=\"btn round today\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.controls.today");return r.join('');}), ctx));r.push("</span> <span class=\"btn round yesterday\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.controls.yesterday");return r.join('');}), ctx));r.push("</span> <span class=\"btn round sevendays\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.controls.sevendays");return r.join('');}), ctx));r.push("</span> <span class=\"btn round currentmonth\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.controls.currentmonth");return r.join('');}), ctx));r.push("</span> <span class=\"btn round currentyear\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.controls.currentyear");return r.join('');}), ctx));r.push("</span> </div> <ul class=\"years calendar-list\"> ");r.push(await h('each', [await h.__gv('years', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <li");r.push(await h('if', [await h.__gv('selected', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" class=\"selected\"");return r.join('');}), ctx));r.push(">");r.push(await h.__gv('year', ctx));r.push(" </li> ");return r.join('');}), ctx));r.push(" </ul> <ul class=\"months calendar-list\"> ");r.push(await h('each', [await h.__gv('months', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <li");r.push(await h('if', [await h.__gv('selected', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" class=\"selected\"");return r.join('');}), ctx));r.push(" data-month=\"");r.push(await h.__gv('ordinal', ctx));r.push("\">");r.push(await h.__gv('month', ctx));r.push(" </li> ");return r.join('');}), ctx));r.push(" </ul> <ul class=\"weekdays calendar-list\"> <li>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.weekdays.mon");return r.join('');}), ctx));r.push("</li> <li>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.weekdays.tue");return r.join('');}), ctx));r.push("</li> <li>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.weekdays.wed");return r.join('');}), ctx));r.push("</li> <li>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.weekdays.thu");return r.join('');}), ctx));r.push("</li> <li>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.weekdays.fri");return r.join('');}), ctx));r.push("</li> <li>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.weekdays.sat");return r.join('');}), ctx));r.push("</li> <li>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("calendar.weekdays.sun");return r.join('');}), ctx));r.push("</li> </ul> <ul class=\"days calendar-list\"> ");r.push(await h('each', [await h.__gv('days', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <li");r.push(await h('if', [await h.__gv('selected', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" class=\"selected\"");return r.join('');}), ctx));r.push(" data-day=\"");r.push(await h.__gv('day', ctx));r.push("\">");r.push(await h.__gv('day', ctx));r.push(" </li> ");return r.join('');}), ctx));r.push(" </ul> ");return r.join('');}), ctx));r.push(" </div> ");return r.join('')}
views_cache['/shop/cvv/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"flex gap-sm cvv_page\"> ");r.push(await h.include('shop/cvv/filters', ctx));r.push(" <div class=\"col-4-5 cvv_page_col_4_5\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>312</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"corner-right-top-clip-sm space-wrapper margin-top media_off\"> <div class=\"placeholder striped\"></div> </div> <div class=\"table-container cvv_page_container\" handler=\"controllers/shop/cvv/handler\"> <table> <thead> <tr> <th><input type=\"checkbox\" onchange=\"___mc.events.push('shop.cvv.checkbox.all.toggle', this)\"></th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.bin");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.expire");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.brand");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.type");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.category");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.country");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.issuer");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.base");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.price");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <td colspan=\"11\"> <div class=\"loader\"> <span></span> <span></span> <span></span> <span></span> </div> </td> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/components/confirm.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"confirm\"> <div> <div class=\"block conf\"> <h2>");r.push(await h.__gv('title', ctx));r.push("</h2> <p>");r.push(await h.__gv('{text}', ctx));r.push("</p> <div style=\"text-align: center\"> <a data-answer=\"false\" class=\"button bordered\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.cancel");return r.join('');}), ctx));r.push("</a> <a data-answer=\"true\" class=\"button bordered green\">OK</a> </div> </div> </div> </div> ");return r.join('')}
views_cache['/layouts/components/filter_autocomplete.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"filter_autocomplete ");r.push(await h.__gv('classlist', ctx));r.push(" ");r.push(await h('unless', [await h.__gv('autocomplete', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("input");return r.join('');}), ctx));r.push("\" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> ");r.push(await h('if', [await h.__gv('label', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <label class=\"mt-0\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push(await h.__gv('label', ctx));return r.join('');}), ctx));r.push("</label> ");return r.join('');}), ctx));r.push(" <div class=\"filter_autocomplete_input\"> <div class=\"filter_autocomplete_tags\"></div> <input data-type=\"filter_autocomplete\" type=\"text\" placeholder=\"");r.push(await h.__gv('placeholder', ctx));r.push("\" ");r.push(await h('if', [await h.__gv('name', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("name=\"");r.push(await h.__gv('name', ctx));r.push("\"");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push(" autocomplete=\"off\"/> </div> <ul class=\"options ");r.push(await h('if', [await h.__gv('multiple', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("multiple");return r.join('');}), ctx));r.push("\"> <li class=\"empty\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.empty");return r.join('');}), ctx));r.push("</li> </ul> </div> <div> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </div> ");return r.join('')}
views_cache['/utilities/checker/bin/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> <img src=\"/assets/cards/thumb/");r.push(await h.__gv('BIN', ctx));r.push(".png\" alt=\"\">&nbsp; ");r.push(await h.__gv('BIN', ctx));r.push(" - ");r.push(await h.__gv('Brand', ctx));r.push(" </td> <td> ");r.push(await h('unless', [await h.__gv('IssuerUrl', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(await h.__gv('Issuer', ctx));return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('IssuerUrl', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("<a href=\"");r.push(await h.__gv('IssuerUrl', ctx));r.push("\" target=\"_blank\">");r.push(await h.__gv('Issuer', ctx));r.push("</a>");return r.join('');}), ctx));r.push(" </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>");r.push(await h.__gv('CountryName', ctx));r.push("</span> </a> <a href=\"\" class=\"button\"> <img src=\"https://flagcdn.com/w20/");r.push(await h.__gv('isoCode2|lowercase', ctx));r.push(".png\" alt=\"\" > </a> </div> </td> <td> ");r.push(await h.__gv('Type', ctx));r.push(" </td> </tr>");return r.join('')}
views_cache['/utilities/checker/cc.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"flex gap-sm checker-wrapper_\"> <div class=\"col-1-2\"> <div class=\"block corner-left-top-clip-sm checker_bin_page\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.cc.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <p style=\"text-align: center; margin: 25vh 0; color: var(--color__light_blue_50)\">Coming soon...</p> <!-- <form action=\"\" autocomplete=\"off\"> <div class=\"col-1-1\"> <div class=\"form-element\"> <p class=\"label\">Number of card</p> <input type=\"text\" class=\"main_input\" placeholder=\"1234 5678 1234 5678\"> <p class=\"notes\"> numeric character (12 characterss) </p> </div> <div class=\"form-element\"> <p class=\"label\">Name on card</p> <input type=\"text\" class=\"main_input\" placeholder=\"Enter name on card\"> </div> <div class=\"form-element\"> <p class=\"label\">CVV</p> <input class=\"main_input\" type=\"text\" placeholder=\"421\"> <p class=\"notes\"> numeric character (3 characters) </p> </div> </div> <div class=\"buttons\"> <button type=\"button\" class=\"bordered col-1-1\">Start checking</button> </div> </form> --> </div> </div> <div class=\"corner-right-bottom-clip-sm space-wrapper margin-top checker_cc_page_block_corner\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"col-1-2 corner-left-top-clip-sm\"> <div class=\"table-container\"> <p style=\"text-align: center; margin: 25vh 0; color: var(--color__light_blue_50)\">Coming soon...</p> <!-- <div class=\"table-filters\"> <div class=\"select_option_search\"> <select class=\"padding-sm\"> <option value=\"\">Yor checked cards</option> <option value=\"\">Yor checked cards</option> <option value=\"\">Yor checked cards</option> </select> </div> <div class=\"corner-right-top-clip-xs space-wrapper col-1-3\"> <div class=\"placeholder striped\"></div> </div> <div class=\"search-input media_off\"> <input class=\"padding-sm\" type=\"search\" placeholder=\"Search\"> <span class=\"search-input-img\"></span> </div> <div class=\"search_icon media_onn\"> <i class=\"bi bi-search\"></i> </div> </div> <table> <thead> <tr> <th>card</th> <th>type</th> <th>level</th> <th>result</th> <th>action</th> </tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> <button class=\"red\">declined</button> </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> <button class=\"red\">declined</button> </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> <button class=\"red\">declined</button> </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> <button class=\"red\">declined</button> </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> <button class=\"red\">declined</button> </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> <button class=\"red\">declined</button> </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> <button class=\"red\">declined</button> </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> <button class=\"red\">declined</button> </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> <button class=\"green bordered\">approved</button> </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> <tr> <td> <div class=\"card-number\"> <span>4165492141654921</span>| <span>01/01</span>| <span>907</span> </div> </td> <td> debit </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td> declined </td> <td class=\"action\"> <a class=\"button refresh\"></a> </td> </tr> </tbody> </table> --> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/utilities/index.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>Sender ID</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <div class=\"outils\"> <form action=\"\"> <div class=\"col-1-1\"> <div class=\"form-element\"> <p class=\"label\">sender</p> <input type=\"text\" placeholder=\"Enter the requested information\"> <p class=\"notes\"> alphanumeric character (3 - 11 character) </p> </div> <div class=\"form-element\"> <p class=\"label\">recipient</p> <input type=\"text\" placeholder=\"Enter the requested information\"> </div> <div class=\"form-element\"> <p class=\"label\">message</p> <textarea placeholder=\"Enter the requested information\"></textarea> <p class=\"notes\"> 160 characters minimum </p> </div> </div> <div class=\"buttons\"> <p>price per text <span>0.10&euro;</span></p> <button type=\"submit\" class=\"bordered\">Send the text message</button> </div> </form> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/profile/menu.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"col-1-4\"> <div class=\"block corner-right-top-clip-sm\"> <div class=\"menu-container\"> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'IN', 'client', 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"menu-container-item\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.menu.info_title");return r.join('');}), ctx));r.push("</h2> <div class=\"flex flex-col flex-align-flex-start\"> <a href=\"/profile/deposit/\" class=\"button");r.push(await h('if', [await h.__gv('active', ctx), 'deposit'], (async (ctx, prev_ctx) => {let r = [];r.push(" active");return r.join('');}), ctx));r.push("\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.menu.deposit");return r.join('');}), ctx));r.push("</a> <a href=\"/profile/orders/\" class=\"button");r.push(await h('if', [await h.__gv('active', ctx), 'orders'], (async (ctx, prev_ctx) => {let r = [];r.push(" active");return r.join('');}), ctx));r.push("\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.menu.history");return r.join('');}), ctx));r.push("</a> <a href=\"/profile/referral/\" class=\"button hide");r.push(await h('if', [await h.__gv('active', ctx), 'referral'], (async (ctx, prev_ctx) => {let r = [];r.push(" active");return r.join('');}), ctx));r.push("\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.menu.referral");return r.join('');}), ctx));r.push("</a> </div> </div> ");return r.join('');}), ctx));r.push(" <div class=\"menu-container-item\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.menu.setting_title");return r.join('');}), ctx));r.push("</h2> <a href=\"/profile/\" class=\"button");r.push(await h('if', [await h.__gv('active', ctx), 'index'], (async (ctx, prev_ctx) => {let r = [];r.push(" active");return r.join('');}), ctx));r.push("\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.menu.index");return r.join('');}), ctx));r.push(" </a> <a href=\"/profile/password/\" class=\"button");r.push(await h('if', [await h.__gv('active', ctx), 'password'], (async (ctx, prev_ctx) => {let r = [];r.push(" active");return r.join('');}), ctx));r.push("\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.menu.password");return r.join('');}), ctx));r.push(" </a> <a href=\"/profile/telegram/\" class=\"button");r.push(await h('if', [await h.__gv('active', ctx), 'telegram'], (async (ctx, prev_ctx) => {let r = [];r.push(" active");return r.join('');}), ctx));r.push("\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.menu.telegram");return r.join('');}), ctx));r.push(" </a> </div> </div> </div> </div>");return r.join('')}
views_cache['/404.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"bg-caption top\">Error 404</div> <div class=\"bg-caption bottom\">Error 404</div> <div class=\"caption\"> <h1>404</h1> <a href=\"/\" class=\"button\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.back_home");return r.join('');}), ctx));r.push("</a> </div>");return r.join('')}
views_cache['/profile/index.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"user-space-wrapper flex gap-sm deposit_page_user_space_wrapper_2\"> ");r.push(await h.include('/profile/menu', ctx, 'active=\'index\''));r.push(" <div class=\"col-3-4\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.account.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div> <h2 class=\"account-edit-h2\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.info.title");return r.join('');}), ctx));r.push("</span> <img src=\"/assets/img/warning-yellow.svg\" alt=\"\"> </h2> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.info.text");return r.join('');}), ctx));r.push("</p> </div> <div class=\"account-edit\"> <form action=\"\" autocomplete=\"off\"> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.account.nickname");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.account.nickname");return r.join('');}), ctx));r.push(" *\" name=\"nickname\" autocomplete=\"off\" value=\"");r.push(await h.__gv('profile.nickname', ctx));r.push("\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.account.name");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.account.name");return r.join('');}), ctx));r.push("\" name=\"name\" autocomplete=\"off\" value=\"");r.push(await h.__gv('profile.name', ctx));r.push("\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">Bio</p> <textarea placeholder=\"text block\"></textarea> <p class=\"notes\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.bio.notes");return r.join('');}), ctx));r.push(" </p> </div> <div class=\"buttons\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('profile.update', this)\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.update");return r.join('');}), ctx));r.push("</button> </div> </form> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/components/checkbox.mst'] = async (ctx, h) => {let r = [];r.push("<label id=\"");r.push(await h.__gv('id', ctx));r.push("\" class=\"d-flex align-center gap-8 mt-0\"> <input type=\"checkbox\" class=\"default\" name=\"");r.push(await h.__gv('name', ctx));r.push("\" ");r.push(await h('if', [await h.__gv('value', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("checked");return r.join('');}), ctx));r.push("/> ");r.push(await h('if', [await h.__gv('label', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push(await h.__gv('label', ctx));return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" </label> ");return r.join('')}
views_cache['/news/item.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"news-item col-1-1 corner-left-top-right-bottom-clip-xs\"> <div class=\"bl-top\"> <h2>");r.push(await h.__gv('title', ctx));r.push("</h2> <span>");r.push(await h.__gv('created|datetime', ctx));r.push("</span> </div> <div class=\"bl-middle\"> <div class=\"space-wrapper col-1-2 media_off\"> <div class=\"placeholder striped\"></div> </div> <div class=\"news-text\"> ");r.push(await h.__gv('{text}', ctx));r.push(" </div> </div> </div>");return r.join('')}
views_cache['/admin/news/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> ");r.push(await h.__gv('id', ctx));r.push(" </td> <td> ");r.push(await h.__gv('created|datetime', ctx));r.push(" </td> <td> ");r.push(await h.__gv('role', ctx));r.push(" </td> <td> ");r.push(await h.__gv('lang', ctx));r.push(" </td> <td> ");r.push(await h.__gv('title', ctx));r.push(" </td> <td class=\"action\"> <a href=\"/admin/news/edit/");r.push(await h.__gv('id', ctx));r.push("\" class=\"button pencil bordered\"></a> </td> <td class=\"action\"> ");r.push(await h('if', [await h.__gv('status', ctx), 'active'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button class=\"button remove red bordered\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\" onclick=\"___mc.events.push('admin.news.archive', {id: ");r.push(await h.__gv('id', ctx));r.push(", title:'");r.push(await h.__gv('title|escape_html', ctx));r.push("' })\"></button> ");return r.join('');}), ctx));r.push(" </td> </tr>");return r.join('')}
views_cache['/admin/base/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"admin_panel base_page block corner-left-top-clip-sm\"> <div class=\"flex_div simple_base_page_\"> <div class=\"admin_panel_cards sales_page_clip base_panel_main\"> <div class=\"base_page_dashboard_divs\"> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Total users</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">2,144</span> <span class=\"measure\">users</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>TOTAL balance of users</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">usd</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>TOTAL balance of users</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">usd</span> </div> </div> </div> </div> <div class=\"base_page_main_html\"> <div class=\"filter_text\"> <p class=\"filters_text filters_basee\">filters</p> <span></span> </div> <div class=\"admin_panel_page_caption admin_panel_page_caption_base_html corner-left-top-right-bottom-clip-xs\"> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"base\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"date\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"type\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"seller\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"buttons margin-top-sm\"> <button type=\"submit\" class=\"bordered col-1-1\">Search</button> </div> </div> </div> </div> <div class=\"sales_page_ corner-left-top-right-bottom-clip-xs\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>312</span> </div> <div class=\"block-caption block_caption\"> <h2>base / manage bases</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"table-container deposits_page_table_container\"> <table> <thead> <tr> <th>base</th> <th>seller</th> <th>type</th> <th>date</th> <th>price</th> <th colspan=\"3\">action</th> </tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action none_image\"> <img src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action trash\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> </tbody> </table> </div> <div class=\"placeholder pagination-wrapper\"> <nav class=\"pagination\"> <a href=\"\" class=\"prev\"></a> <a href=\"\">1</a> <a href=\"\">2</a> <span class=\"active\">-</span> <a href=\"\">4</a> <a href=\"\" class=\"next\"></a> </nav> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/orders/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title \"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("orders.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\" style=\"border: none; padding: 0\"> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'admin.orders.filter.created.start.change', value: await h.__gv('filter.period_s', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'admin.orders.filter.created.end.change', value: await h.__gv('filter.period_e', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <!-- <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'bases.table.type', name: 'type', value: await h.__gv('filter.type', ctx), onset: await h.__gv('type_set', ctx), onsuggest: await h.__gv('type_suggest', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> --> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'true', placeholder: 'bases.table.status', name: 'status', value: await h.__gv('filter.status', ctx), onset: await h.__gv('status_set', ctx), onsuggest: await h.__gv('status_suggest', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'shop.user', name: 'user_id', onsuggest: 'clients_sellers.suggest', value: await h.__gv('filter.user_id', ctx), onset: await h.__gv('user_set', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('admin.orders.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"contents contents_inner_manage_base_page\" handler=\"controllers/admin/orders/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th>ID</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.created");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("orders.table.amount");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.status");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("orders.table.count");return r.join('');}), ctx));r.push("</th> <th colspan=\"1\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/withdrawal/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"admin_panel block corner-left-top-clip-sm withdrawal_requests_page_admin_panel\"> <div class=\"dashboard referral_page responsive_card_div\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Total users</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">2,144</span> <span class=\"measure\">users</span> </div> </div> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>total balance</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">usd</span> </div> </div> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>requested</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">users</span> </div> </div> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>tickets</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <!-- <span class=\"measure\">users</span> --> </div> </div> </div> <div class=\"hr\"></div> <div> <div class=\"corner_triangle\"> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"table-container \"> <table> <thead> <tr> <th>user id</th> <th>username</th> <th>rank</th> <th>balance</th> <th>to pay</th> <th>status</th> <th colspan=\"2\">action</th> </tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered\">APPROvED</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered_uncheck\">PENDING</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered_red\">CANCELED</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered_uncheck\">PENDING</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered\">APPROvED</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered_red\">CANCELED</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered_uncheck\">PENDING</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered_red\">CANCELED</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered\">APPROvED</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td> <span class=\"bordered\">$241</span> </td> <td> <span class=\"bordered_red\">CANCELED</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped pagination-wrapper\"> <nav class=\"pagination\"> <a href=\"\" class=\"prev\"></a> <a href=\"\">1</a> <a href=\"\">2</a> <span class=\"active\">-</span> <a href=\"\">4</a> <a href=\"\" class=\"next\"></a> </nav> </div> </div> </div> </div> <div class=\"block corner-left-top-clip-sm withdrawal_requests_background\"> <div class=\"user_detail_page corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>12</span> </div> <div class=\"block-caption block_caption\"> <h2>SELLERS</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"hr\"></div> </div> <div class=\"withdrawal_requests_page_flex\"> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped pagination-wrapper\"></div> </div> <div class=\"user_detail_page\"> <div class=\"title\"> <div class=\"block-caption block_caption\"> <h2>USERNAME</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> </div> <div> <div class=\"buttons\"> <button type=\"submit\" class=\"bordered col-1-1\">SEARCH</button> </div> </div> </div> <div class=\"table-container withdrawal_requests_table_container\"> <table> <thead> <tr> <th>user id</th> <th>percentage</th> <th>balance</th> <th colspan=\"2\">action</th> </tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> </thead> <tbody> <tr> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span class=\"bordered\">50%</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span class=\"bordered\">50%</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span class=\"bordered\">50%</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span class=\"bordered\">50%</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td> <span class=\"price\">16.00 €</span> </td> <td class=\"action\"> <img class=\"ok_img\" src=\"/assets/img/ok.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"cancel_bordered remove bordered red padding-sm\"></button> </td> </tr> </tbody> </table> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/user/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"user_detail_page block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>details user</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"hr\"></div> </div> <div class=\"details_user details_page_user_main_divv\"> <div class=\"details_user_title details_page_userrr_tittle\"> <div class=\"details_user_title_flex_div details_user_title_flex_div_1\"> <h1>Focusedstudio</h1> <p class=\"responsive_off_text\">no role</p> </div> <div class=\"details_user_title_flex_div details_user_title_flex_div_2\"> <p class=\"responsive_off_text\">RANK</p> <img class=\"details_user_title_flex_div_2_img responsive_off_text\" src=\"/assets/img/arrow-right.svg\" alt=\"\"> <p class=\"bordered\">GOLD</p> <img class=\"details_user_page_image_2\" src=\"/assets/img/gold.svg\" alt=\"\"> </div> </div> <div class=\"details_user_page_flex_div details__page_flex__div\"> <div class=\"details_user_left_content\"> <div class=\"hr\"></div> <div class=\"details_user_page_little_flex\"> <div> <div class=\"details_user_page_little_div\"> <p>Total buy</p> <p>.</p> <span>$123k</span> </div> <div class=\"details_user_page_little_div\"> <p>current balance</p> <p>.</p> <span>$234k</span> </div> </div> <div class=\"details_user_page_little_div\"> <p>account</p> <p>.</p> <span>actived</span> </div> </div> <div class=\"hr\"></div> <div class=\"details_user_page_little_flex_2\"> <div class=\"details_user_page_little_div\"> <p>Total spent</p> <p>.</p> <span>$200k</span> </div> <div class=\"details_user_page_little_div\"> <p>history balance</p> <p>.</p> <span>$400k</span> </div> </div> </div> <div class=\"details_user_right_content\"> <div> <p>Add role :</p> <div class=\"hr\"></div> <div class=\"input_radion_and_button\"> <div class=\"role_select\"> <div> <input type=\"checkbox\"> <p>Support</p> </div> <div> <input type=\"checkbox\"> <p>Admin</p> </div> <div> <input type=\"checkbox\"> <p>Seller</p> </div> </div> <div class=\"buttons margin-top-sm\"> <button type=\"submit\" class=\"bordered col-1-1\">SAVE</button> </div> </div> </div> </div> </div> </div> <div class=\"details_user_page_some_text\"> <p>user history.</p> </div> <div class=\"div_flex div_flex_buttons\"> <div class=\"details_user_page_some_text\"> <button class=\"active\">individual cc history</button> </div> <div class=\"details_user_page_some_text\"> <button>Bulk history</button> </div> </div> <div class=\"corner_triangle\"> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"table-container details_page_table\"> <table> <thead> <tr> <th>Bin</th> <th>vendeur</th> <th>Base</th> <th>Prix d’achat</th> <th>Date</th> <th>Status</th> <th colspan=\"2\">action</th> </tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_red\">DEAD</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>SILVER</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_red\">DEAD</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered\">Live</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_uncheck\">Uncheck</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>gold</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_uncheck\">Uncheck</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_red\">DEAD</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>SILVER</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered\">Live</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>gold</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered\">Live</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>SILVER</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_uncheck\">Uncheck</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_red\">DEAD</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped pagination-wrapper\"></div> </div> </div> </section>");return r.join('')}
views_cache['/reglement/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"flex gap-sm reglaments_page\"> <div class=\"flex flex-col\"> <div class=\"block corner-left-top-right-bottom-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>Les qualités</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <button class=\"bordered margin-bottom-sm\">Déposer des fonds</button> <div class=\"col-1-1\"> <p>Conscient de l'importance d'un accès rapide et organisé aux fonctionnalités essentielles, le menu situé en haut à droite de notre maquette est un élément clé du design.</p> </div> </div> </div> </div> <div class=\"corner-right-top-clip-sm space-wrapper media_off\"> <div class=\"placeholder striped\" style=\"height: 55vh\"></div> </div> </div> <div class=\"flex flex-col gap-sm\"> <div class=\"corner-right-bottom-clip-sm space-wrapper media_off\"> <div class=\"placeholder striped\" style=\"height: 55vh\"></div> </div> <div class=\"block corner-left-top-right-bottom-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>02</span> </div> <div class=\"block-caption block_caption\"> <h2>Les règles à suivre</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <div class=\"col-1-1\"> <button class=\"bordered margin-bottom-sm\">Déposer des fonds</button> <p></p> <p>Conscient de l'importance d'un accès rapide et organisé aux fonctionnalités essentielles, le menu situé en haut à droite de notre maquette est un élément clé du design.</p> </div> </div> </div> </div> </div> <div class=\"flex flex-col\"> <div class=\"block corner-left-top-right-bottom-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>03</span> </div> <div class=\"block-caption block_caption\"> <h2>Contacter le support</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <div class=\"col-1-1\"> <button class=\"bordered margin-bottom-sm\">Déposer des fonds</button> <p></p> <p>Conscient de l'importance d'un accès rapide et organisé aux fonctionnalités essentielles, le menu situé en haut à droite de notre maquette est un élément clé du design.</p> <p></p> <a href=\"\" class=\"button margin-top-sm\">Contacter le support</a> </div> </div> </div> </div> <div class=\"corner-right-top-clip-sm space-wrapper media_off\"> <div class=\"placeholder striped\" style=\"height: 55vh\"></div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/faq/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title manage_base_page_corner_left_top_clip_sm_title_\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'table.status', name: 'status', value: await h.__gv('filter.status', ctx), items: await h.__gv('statuses', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'faq.table.lang', name: 'language', value: await h.__gv('filter.language', ctx), items: await h.__gv('languages', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('admin.faq.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <!-- <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> --> </div> <div class=\"contents contents_inner_manage_base_page\" handler=\"controllers/admin/faq/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th>ID</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.date");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.lang");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.question");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.status");return r.join('');}), ctx));r.push("</th> <th colspan=\"2\">action</th> </tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/areas/aside.mst'] = async (ctx, h) => {let r = [];r.push(" <aside> <div class=\"bl-top\"> <img src=\"/assets/img/logo.svg\" alt=\"logo\"> </div> <div style=\"flex-grow: 1\"> ");r.push(await h.include('layouts/areas/menu', ctx));r.push(" </div> <div class=\"bl-bottom\"> <nav> <a href=\"/faq/\"> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> <span>FAQ</span> </a> <a href=\"/support/\"> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> <span>Support</span> </a> <a href=\"/seller/\"> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> <span>Become seller</span> </a> </nav> </div> </aside> <div class=\"responsive_toggle_menu\"> <div class=\"bl-top\"> <img src=\"/assets/img/logo.svg\" alt=\"logo\"> </div> <div> ");r.push(await h.include('layouts/areas/menu', ctx));r.push(" </div> <div class=\"bl-bottom\"> <nav> <a href=\"/faq/\"> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> <span>FAQ</span> </a> <a href=\"/support/\"> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> <span>Support</span> </a> <a href=\"/seller/\"> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> <span>Become seller</span> </a> </nav> </div> </div> <div class=\"responsive_toggle_m\" onclick=\"document.querySelector('.responsive_toggle_menu').classList.toggle('show'); document.querySelector('.responsive_toggle_m').classList.toggle('active')\"></div>");return r.join('')}
views_cache['/admin/overview/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"admin_panel overview_page_hr block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>overview user</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"hr\"></div> <div class=\"flex_div overview_section_flex_div\"> <div class=\"admin_panel_cards admin_panel_card_main__\"> <div class=\"overview_paage_main\"> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Total users</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">2,144</span> <span class=\"measure\">users</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>TOTAL balance of users</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">214k</span> <span class=\"measure\">usd</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>TOTAL balance spent</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">115k</span> <span class=\"measure\">usd</span> <span class=\"measure\"> <usd></usd> </span> </div> </div> </div> </div> <div class=\"admin_panel_page_caption overview_page_kla\"> <div class=\"title\"> <div class=\"block-caption block_caption\"> <h2>User Id</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block-caption block_caption\"> <h2>NAME</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block-caption block_caption\"> <h2>RANK</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block-caption block_caption\"> <h2>ROLE</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"buttons margin-top-sm\"> <button type=\"submit\" class=\"bordered col-1-1\">Search</button> </div> </div> </div> <div class=\"overview_page_right_content\"> <div class=\"corner_triangle off\"> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"table-container overview_page_table_container\"> <table> <thead> <tr> <th>user id</th> <th>username</th> <th>rank</th> <th>your earning</th> <th>date</th> <th>TOPUP/SPEND</th> <th colspan=\"2\">action</th> </tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/bronze.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>BRONZE</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>SILVER</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>GOLD</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/bronze.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>BRONZE</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>gold</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/bronze.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>BRONZE</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>SILVER</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>gold</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>SILVER</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> user name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/bronze.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>bronze</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped pagination-wrapper\"> <nav class=\"pagination\"> <a href=\"\" class=\"prev\"></a> <a href=\"\">1</a> <a href=\"\">2</a> <span class=\"active\">-</span> <a href=\"\">4</a> <a href=\"\" class=\"next\"></a> </nav> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/support/index.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'IN', 'client', 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"block support_page_block corner-left-top-right-bottom-clip-sm\"> <div class=\"title support_page\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.new_ticket");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <div class=\"col-1-3\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.info");return r.join('');}), ctx));r.push("</p> </div> <div class=\"\"> <form action=\"\" autocomplete=\"off\"> <div class=\"col-1-1\"> <div class=\"form-element\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.subject");return r.join('');}), ctx));r.push("</p> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.subject");return r.join('');}), ctx));r.push(" *\" name=\"title\" autocomplete=\"off\"> </div> <div class=\"form-element\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.message");return r.join('');}), ctx));r.push("</p> <textarea placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.message");return r.join('');}), ctx));r.push(" *\" name=\"text\" autocomplete=\"off\"></textarea> <p class=\"notes\"> 20 ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("info.characters_minimum");return r.join('');}), ctx));r.push(" </p> </div> <div> <button type=\"button\" class=\"bordered col-1-1 padding-sm\" style=\"padding: 10px 0\" onclick=\"this.disabled=true;___mc.events.push('support.ticket.add', this)\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.send");return r.join('');}), ctx));r.push("</button> </div> </div> </form> </div> </div> </div> </div> ");return r.join('');}), ctx));r.push(" <div class=\"block corner-left-top-clip-sm\" handler=\"controllers/support/handler\" data-status=\"");r.push(await h.__gv('status', ctx));r.push("\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>02</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.manage");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"support-container\"> <div class=\"col-1-3\"> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> <div class=\"buttons\"> <a class=\"button ");r.push(await h('if', [await h.__gv('status', ctx), 'active'], (async (ctx, prev_ctx) => {let r = [];r.push("active");return r.join('');}), ctx));r.push("\" href=\"/support/active\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.statuses.active");return r.join('');}), ctx));r.push(" </a> <div class=\"separator\"></div> <a class=\"button ");r.push(await h('if', [await h.__gv('status', ctx), 'closed'], (async (ctx, prev_ctx) => {let r = [];r.push("active");return r.join('');}), ctx));r.push("\" href=\"/support/closed\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.statuses.closed");return r.join('');}), ctx));r.push(" </a> <div class=\"separator\"></div> <a class=\"button ");r.push(await h('if', [await h.__gv('status', ctx), 'archived'], (async (ctx, prev_ctx) => {let r = [];r.push("active");return r.join('');}), ctx));r.push("\" href=\"/support/archived\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.statuses.archived");return r.join('');}), ctx));r.push(" </a> </div> <div> <div class=\"table-container\"> <table> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"margin-top-sm\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"col-2-3\"> <div class=\"support-chat-container\"> <div class=\"bl-top\"> <img src=\"/assets/img/pencil.svg\" alt=\"\"> <div class=\"separator\"></div> <div id=\"chat-title\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.subject");return r.join('');}), ctx));r.push("</div> </div> <div class=\"bl-middle\"> </div> <div class=\"bl-bottom\"> <textarea class=\"text-answer\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("support.message");return r.join('');}), ctx));r.push(" *\" name=\"text\" autocomplete=\"off\"></textarea> <button class=\"arrow-right-top bordered btn-answer\" onclick=\"this.disabled=true;___mc.events.push('support.answer', this)\"> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </button> </div> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/deposits/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"admin_panel base_page block corner-left-top-clip-sm\"> <div class=\"flex_div simple_base_page_\"> <div class=\" sales_page_clip base_panel_main\"> <div class=\"base_page_dashboard_divs\"> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Total money deposited</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1.000</span> <span class=\"measure\">usd</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>total users balance</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1.000</span> <span class=\"measure\">usd</span> </div> </div> </div> <div class=\"corner_triangle\"> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"base_page_main_html\"> <div class=\"filter_text\"> <p class=\"filters_text filters_basee\">filters</p> <span></span> </div> <div class=\"admin_panel_page_caption admin_panel_page_caption_base_html corner-left-top-right-bottom-clip-xs\"> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"base\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"date\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"type\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"seller\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"buttons margin-top-sm\"> <button type=\"submit\" class=\"bordered col-1-1\">Search</button> </div> </div> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"sales_page_ corner-left-top-right-bottom-clip-xs\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>312</span> </div> <div class=\"block-caption block_caption\"> <h2>deposits</h2> <a href=\"\"> <img src=\"/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"deposit_page_corner\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"table-container deposits_page_table_container\"> <table> <thead> <tr> <th>base</th> <th>seller</th> <th>type</th> <th>date</th> <th>price</th> <th colspan=\"3\">action</th> </tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action none_image\"> <img src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action trash\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>spotify_mail</span> </div> </td> <td> client name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>card</span> </a> </div> </td> <td> <button class=\"bordered\">21/06/2024 15:44:42</button> </td> <td> <span class=\"price\">16.00&euro;</span> </td> <td class=\"action eye_image\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"none_image\" src=\"/assets/img/no.svg\" alt=\"\"> </td> <td class=\"action\"> <img class=\"trash_image\" src=\"/assets/img/trash.svg\" alt=\"\"> </td> </tr> </tbody> </table> </div> <div class=\"placeholder pagination-wrapper\"> <nav class=\"pagination\"> <a href=\"\" class=\"prev\"></a> <a href=\"\">1</a> <a href=\"\">2</a> <span class=\"active\">-</span> <a href=\"\">4</a> <a href=\"\" class=\"next\"></a> </nav> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/users_/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container manage_user_container corner-left-top-clip-sm\"> <div class=\"user_detail_page manage_user_page_detail_hr block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>manage users</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"search_user_input\"> <img src=\"/assets/img/search.svg\" alt=\"\"> <input placeholder=\"Search user\" type=\"text\"> </div> <div class=\"hr\"></div> </div> <div class=\"details_user manage_users\"> <div class=\"details_user_page_flex_div responsive_details_user_page_flex_div\"> <div class=\"details_user_right_content\"> <div> <p>User info :</p> <div class=\"hr\"></div> <div class=\"input_radion_and_button\"> <div class=\"role_select\"> <div> <p>Pseudo</p> = <span> 001 </span> </div> <div> <p>Type</p> = <span> 001 </span> </div> <div> <p>Rank</p> = <span> 001 </span> </div> </div> </div> </div> </div> <div class=\"details_user_right_content manage_users_right_content\"> <div> <p>Add role :</p> <p style=\"opacity: 0;\">Add role :</p> <div class=\"hr\"></div> <div class=\"input_radion_and_button\"> <div class=\"role_select\"> <div> <input type=\"checkbox\"> <p>Support</p> </div> <div> <input type=\"checkbox\"> <p>Admin</p> </div> <div> <input type=\"checkbox\"> <p>Seller</p> </div> </div> <div class=\"role_select\"> <div> <input type=\"checkbox\"> <p>BAN</p> </div> <div> <input type=\"checkbox\"> <p>FREEZE</p> </div> </div> </div> </div> </div> </div> <div class=\"manage_users_page_flex manage_user_page_responsive\"> <div class=\"manage_users_page_checkbox_ manage_user_page_responsive_checkbox\"> <div> <h2>Activer la licence</h2> </div> <label class=\"switch\"> <input type=\"checkbox\"> <span class=\"slider\"></span> </label> </div> <div class=\"manage_users_page_text_ manage_user_page_responsive_checkbox_text\"> Supprimer le compte </div> </div> </div> <div class=\"some_padding\"> <div class=\"hr\"></div> <div class=\"details_user_page_some_text\"> <p>user history.</p> </div> <div class=\"div_flex\"> <div class=\"details_user_page_some_text\"> <button class=\"active\">individual cc history</button> </div> <div class=\"details_user_page_some_text\"> <button>bulk history</button> </div> </div> <div class=\"corner_triangle\"> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"table-container details_page_table\"> <table> <thead> <tr> <th>Bin</th> <th>vendeur</th> <th>Base</th> <th>Prix d’achat</th> <th>Date</th> <th>Statu</th> <th colspan=\"2\">action</th> </tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> </thead> <tbody> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_red\">dead</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered\">live</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered\">live</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_red\">dead</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered\">live</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_red\">dead</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_red\">dead</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered\">live</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered_red\">dead</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> Vendeur name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Base name</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">12.05.23</button> </td> <td> <span class=\"bordered\">live</span> </td> <td class=\"action\"> <a class=\"button search\"></a> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped pagination-wrapper\"></div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/users/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title manage_base_page_corner_left_top_clip_sm_title_\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\" style=\"border: none; padding: 0\"> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'admin.users.filter.created.start.change', value: await h.__gv('filter.period_s', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'admin.users.filter.created.end.change', value: await h.__gv('filter.period_e', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'table.status', name: 'status', value: await h.__gv('filter.status', ctx), items: await h.__gv('statuses', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'table.role', name: 'role', value: await h.__gv('filter.role', ctx), items: await h.__gv('roles', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('admin.users.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <!-- <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> --> </div> <div class=\"contents contents_inner_manage_base_page\" handler=\"controllers/admin/users/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th>ID</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.date");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.nickname");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.role");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.status");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("users.table.balance");return r.join('');}), ctx));r.push("</th> <th colspan=\"3\">action</th> </tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> <tr></tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/bases/cards/upload.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.upload.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <form action=\"\" autocomplete=\"off\"> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.upload.base");return r.join('');}), ctx));r.push(" *</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {onsuggest: 'upload.bases.suggest', min: 0, onchange: await h.__gv('upload_base_change', ctx), onset: await h.__gv('upload_base_set', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.upload.price");return r.join('');}), ctx));r.push(" *</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"number\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.upload.price");return r.join('');}), ctx));r.push("\" name=\"price\" autocomplete=\"off\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.upload.dump");return r.join('');}), ctx));r.push("</p> <textarea placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.upload.dump");return r.join('');}), ctx));r.push("\" name=\"data\" autocomplete=\"off\"></textarea> <p class=\"notes\"></p> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.upload.file");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1 flex flex-justify-around flex-align-center\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.upload.file");return r.join('');}), ctx));r.push("\" name=\"file\" autocomplete=\"off\"> <input type=\"file\" id=\"dump_file\" onchange=\"___mc.events.push('cards.upload.file.read', this)\" style=\"width: 1px; height: 1px; padding: 0; margin: 0\" readonly> <button type=\"button\" class=\"button bordered\" style=\"height: 61px; margin-left: 10px\" onclick=\"___mc.events.push('cards.upload.file.select', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.upload.choose");return r.join('');}), ctx));r.push(" </button> </div> </div> </div> <div class=\"buttons\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('cards.upload.save', this)\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.upload");return r.join('');}), ctx));r.push("</button> </div> </form> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/profile/deposit/index.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"user-space-wrapper flex gap-sm deposit_page_user_space_wrapper_2\"> ");r.push(await h.include('/profile/menu', ctx, 'active=\'deposit\''));r.push(" <div class=\"col-3-4\"> <div class=\"block corner-left-top-right-bottom-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.subtitle");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"balance-container deposit_page_container\"> <div class=\"info col-1-1\"> <div class=\"cornered-text-block cornered_text_block corner-right-top-clip-xs\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.balance.title");return r.join('');}), ctx));r.push("</p> </div> <p class=\"flex gap-sm margin-top-sm margin-bottom-sm\"> <span class=\"total-balance\">");r.push(await h.__gv('profile.balance|money', ctx));r.push("</span> <span class=\"total-balance-currency\">USD</span> </p> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.balance.text");return r.join('');}), ctx));r.push("</p> <div class=\"deposit-block margin-top-sm margin-bottom-sm padding-sm\"> <div class=\"cornered-text-block cornered_text_block corner-right-top-clip-xs\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.funds.title");return r.join('');}), ctx));r.push("</p> </div> <p></p> <div class=\"flex gap-sm\"> <div id=\"qr-code\" style=\"min-width:128px;padding:4px;background:#fff\" class=\"flex margin-top-sm margin-bottom-sm\"></div> <div class=\"margin-top-sm\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.funds.caption");return r.join('');}), ctx));r.push("</p> <div class=\"flex gap-xs flex-align-center\"> <img src=\"/assets/img/warning-yellow.svg\" alt=\"\" style=\"width: 36px\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.funds.notice");return r.join('');}), ctx));r.push("</p> </div> <button type=\"button\" class=\"button bordered margin-top-lg\" onclick=\"___mc.events.push('deposit.address.show', this)\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.funds.show");return r.join('');}), ctx));r.push("</button> <div id=\"address-container\" class=\"margin-top-lg hide\"> <p style=\"color:var(--color__green_50)\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.funds.address");return r.join('');}), ctx));r.push(": <span id=\"btc-address\" onclick=\"___mc.events.push('deposit.address.copy', this)\" style=\"cursor: pointer; text-transform: none\"> </span> </p> </div> </div> </div> </div> <div class=\"corner-right-top-clip-xs space-wrapper deposit_page_space_wrapper \"> <div class=\"placeholder striped\" style=\"height: 64px\"></div> </div> </div> <div class=\"chiziq\"></div> <div class=\"info col-2-3\"> <div class=\"cornered-text-block cornered_text_block corner-right-top-clip-xs\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.history.title");return r.join('');}), ctx));r.push("</p> </div> <div class=\"table-container history_page_table_container\" handler=\"controllers/profile/deposit/handler\"> <table> <thead> <tr> <th>ID</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.date");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.total");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("deposit.comment");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> </div> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/login.mst'] = async (ctx, h) => {let r = [];r.push("<div id=\"bg-circle\"></div> <div id=\"app\"> <div id=\"login-wrapper\"> <div id=\"login-container\" data-content-holder> ");r.push(await h.__gv('{content}', ctx));r.push(" </div> </div> </div>");return r.join('')}
views_cache['/dashboard/blocks/rank.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"contents_1\"> <div class=\"flex flex-justify-between flex-align-center margin-top-sm block_div\"> <div class=\"flex\"> <a class=\"button\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.rank.title");return r.join('');}), ctx));r.push("</span> <img class=\"arrow_red\" src=\"/assets/img/arrow-right.svg\" alt=\"\"> </a> <a class=\"button bordered\"> <span>");r.push(await h.__gv('profile.rank.name', ctx));r.push("</span> </a> <img src=\"/assets/img/");r.push(await h.__gv('profile.rank.name', ctx));r.push(".svg\" alt=\"\"> </div> <div class=\"col-2-3\"> <div class=\"progress-container padding-xs blue\"> <div class=\"progress-indicator percent_indicator\"> <div class=\"progress-percent\" style=\"width: ");r.push(await h.__gv('profile.rank.progress', ctx));r.push("%\"></div> </div> </div> </div> <div class=\"flex\"> <a class=\"button\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.rank.title");return r.join('');}), ctx));r.push("</span> <img class=\"arrow_red\" src=\"/assets/img/arrow-right.svg\" alt=\"\"> </a> <a class=\"button bordered\"> <span>");r.push(await h.__gv('profile.rank.next', ctx));r.push("</span> </a> <img src=\"/assets/img/");r.push(await h.__gv('profile.rank.next', ctx));r.push(".svg\" alt=\"\"> </div> </div> <div class=\"block width_full\"> <div class=\"col-1-1 flex flex-justify-center margin-top-lg dashboard_page_percent mid_caption_red\"> <p> <span class=\"mid-caption\">");r.push(await h.__gv('profile.rank.progress', ctx));r.push("%</span> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.rank.of");return r.join('');}), ctx));r.push("</span> <span class=\"mid-caption\">100%</span> </p> </div> </div> </div> <div class=\"contents_2\"> <div class=\"col-1-2 corner-right-bottom-clip-sm padding-lg margin-top-sm\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.rank.my_progress");return r.join('');}), ctx));r.push("</p> </div> <div class=\"corner-right-bottom-clip-sm media_off space-wrapper margin-top\"> <div class=\"placeholder striped \"></div> </div> </div>");return r.join('')}
views_cache['/admin/sales/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"admin_panel block corner-left-top-clip-sm\"> <div class=\"flex_div seles_page_flex_div\"> <div class=\"admin_panel_cards sales_page_clip main_page_sales_page\"> <div class=\"sales_page_mayin\"> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>Total purchases</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">2,144</span> <span class=\"measure\">pcs</span> </div> </div> </div> <div class=\"dashboard\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>successful</p> </div> <div class=\"flex gap-sm justify-content-space-between\"> <span class=\"value\">1,250</span> <span class=\"measure\">pcs</span> </div> </div> </div> </div> <div class=\"responsive_off_corner\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"saless_pagee\"> <div class=\"filter_text\"> <p class=\"filters_text filters_text_text filtercha\">filters</p> <span></span> </div> <div class=\"admin_panel_page_caption sal corner-left-top-right-bottom-clip-xs\"> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"date\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"date\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"date\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> <input type=\"text\" placeholder=\"date\" name=\"\" id=\"\"> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"buttons margin-top-sm\"> <button type=\"submit\" class=\"bordered col-1-1\">Search</button> </div> </div> </div> <div class=\"responsive_off_corner\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"sales_page_ corner-left-top-right-bottom-clip-xs main_seles_page\"> <div class=\"title sales_page_main_title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>2.2k</span> </div> <div class=\"block-caption block_caption\"> <h2>sales</h2> <a href=\"\"> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </a> </div> </div> <div class=\"hr\"></div> <div class=\"\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> <div class=\"table-container taybel_container\"> <table> <thead> <tr> <th class=\"media_responsive_off\">sale id</th> <th class=\"media_responsive_off\">client name</th> <th class=\"media_responsive_off\">seller name</th> <th class=\"media_responsive_off\">payment gateway</th> <th class=\"media_responsive_off\">prices</th> <th class=\"media_responsive_off\">date</th> <th class=\"media_responsive_off\">PRODUCT</th> <th class=\"media_responsive_off\">status</th> <th class=\"media_responsive_off\" colspan=\"2\">action</th> <th class=\"media_responsive_on\">username</th> <th class=\"media_responsive_on\">PRODUCT</th> <th class=\"media_responsive_on\">more</th> </tr> </thead> <tbody> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/btc.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>BTC</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered_red\">CARDS</span> </td> <td> <span class=\"bordered_red\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/eth.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>LTC</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered_uncheck\">CARDS</span> </td> <td> <span class=\"bordered_uncheck\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img class=\"eth_image\" src=\"/assets/img/eth.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>ETH</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered_red\">CARDS</span> </td> <td> <span class=\"bordered_red\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/btc.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>BTC</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered\">CARDS</span> </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img class=\"eth_image\" src=\"/assets/img/eth.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>ETH</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered_uncheck\">CARDS</span> </td> <td> <span class=\"bordered_uncheck\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/btc.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>BTC</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered\">CARDS</span> </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/eth.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>LTC</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered\">CARDS</span> </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img class=\"eth_image\" src=\"/assets/img/eth.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>ETH</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered_red\">CARDS</span> </td> <td> <span class=\"bordered_red\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/eth.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>LTC</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered_uncheck\">CARDS</span> </td> <td> <span class=\"bordered_uncheck\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_off\"> <td> <div class=\"card-number\"> <span class=\"masked\"></span> <span>416549</span> </div> </td> <td> client name </td> <td> seller name </td> <td> <div class=\"flex\"> <a href=\"\" class=\"button\"> <img src=\"/assets/img/btc.svg\" alt=\"\"> </a> <a href=\"\" class=\"button\"> <span>BTC</span> </a> </div> </td> <td class=\"action\"> <span class=\"price\">16.00&euro;</span> </td> <td> <button class=\"bordered\">21/06/2024 16:21:23</button> </td> <td> <span class=\"bordered\">CARDS</span> </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action sales_page_table_eye_svg\"> <img src=\"/assets/img/eye.svg\" alt=\"\"> </td> <td class=\"action\"> <button class=\"remove bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_on\"> <td> username </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action\"> <button class=\"search bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_on\"> <td> username </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action\"> <button class=\"search bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_on\"> <td> username </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action\"> <button class=\"search bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_on\"> <td> username </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action\"> <button class=\"search bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_on\"> <td> username </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action\"> <button class=\"search bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_on\"> <td> username </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action\"> <button class=\"search bordered red padding-sm\"></button> </td> </tr> <tr class=\"media_responsive_on\"> <td> username </td> <td> <span class=\"bordered\">CARDS</span> </td> <td class=\"action\"> <button class=\"search bordered red padding-sm\"></button> </td> </tr> </tbody> </table> </div> <div class=\"placeholder pagination-wrapper\"> <nav class=\"pagination\"> <a href=\"\" class=\"prev\"></a> <a href=\"\">1</a> <a href=\"\">2</a> <span class=\"active\">-</span> <a href=\"\">4</a> <a href=\"\" class=\"next\"></a> </nav> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/dashboard/index.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm dashboard_page_cornered_titles\" handler=\"controllers/dashboard/tiles\"> <div class=\"dashboard referral_page\"> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.tiles.total.deposit");return r.join('');}), ctx));r.push("</p> </div> <div class=\"flex gap-sm justify-content-space-between stat_deposit\"> <span class=\"value\">0</span> <span class=\"measure\">usd</span> </div> </div> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.tiles.total.orders");return r.join('');}), ctx));r.push("</p> </div> <div class=\"flex gap-sm justify-content-space-between stat_orders\"> <span class=\"value\">0</span> <span class=\"measure\">pcs</span> </div> </div> <div class=\"indicator-panel col-1-4 the_first corner-left-top-right-bottom-clip-xs\"> <div class=\"cornered-text-block corner-left-top-clip-xs referral_page_main_text\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.tiles.total.spend");return r.join('');}), ctx));r.push("</p> </div> <div class=\"flex gap-sm justify-content-space-between stat_spend\"> <span class=\"value\">0</span> <span class=\"measure\">usd</span> </div> </div> <div class=\"col-1-4 referral_page_col_1\"> <div class=\"cornered-text-block corner-left-top-right-bottom-clip-xs margin-bottom-xs referral-link\"> <img src=\"/assets/img/ok.svg\" alt=\"\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.tiles.referral.copy");return r.join('');}), ctx));r.push("</p> </div> <div class=\"referral-url\"> <a href=\"#\" class=\"button gap-xs\"> <span></span> <img src=\"/assets/img/arrow-top-right.svg\" alt=\"\"> </a> </div> </div> </div> </div> <div class=\"dashboard-container dashboard_section dashboard_page_section\"> <div class=\"block corner-left-top-right-bottom-clip-sm dashboard-left-top \"> <div class=\"title_and_contents\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents right_connect\" handler=\"controllers/dashboard/cards\"> <div class=\"loader\" style=\"margin: 20vh auto\"> <span></span> <span></span> <span></span> </div> </div> </div> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"block width_full connect_dashboard_page_titltess bg-red\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>03</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.rank.title");return r.join('');}), ctx));r.push("</h2> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </div> </div> <div class=\"connect_dashboard_page_title\" handler=\"controllers/dashboard/rank\"> <div class=\"loader\" style=\"margin: 20vh auto\"> <span></span> <span></span> <span></span> </div> </div> </div> ");return r.join('');}), ctx));r.push(" </div> <div class=\"block corner-left-top-clip-sm dashboard-right-top\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>02</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.activity.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"flex flex-col gap-sm margin-top-sm\" handler=\"controllers/dashboard/activity\"> <div class=\"loader\" style=\"margin: 20vh auto\"> <span></span> <span></span> <span></span> </div> </div> </div> </div> </div> <div class=\"add_texts\"> <div> <h1>add your ad here</h1> </div> <div> <h1>add your ad here</h1> </div> </div> </div> </section>");return r.join('')}
views_cache['/support/row.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td class=\"action\"> <button class=\"eye\" onclick=\"___mc.events.push('support.ticket.get', ");r.push(await h.__gv('id', ctx));r.push(")\"></button> </td> ");r.push(await h('if', [await h.__gv('filter.status', ctx), 'active'], (async (ctx, prev_ctx) => {let r = [];r.push(" <td class=\"action\"> <button class=\"remove red\" onclick=\"___mc.events.push('support.ticket.close', ");r.push(await h.__gv('id', ctx));r.push(")\"></button> </td> ");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('filter.status', ctx), 'closed'], (async (ctx, prev_ctx) => {let r = [];r.push(" <td class=\"action\"> <button class=\"pencil\" onclick=\"___mc.events.push('support.ticket.reopen', ");r.push(await h.__gv('id', ctx));r.push(")\"></button> </td> ");r.push(await h('if', [await h.__gv('profile.role', ctx), 'IN', 'client', 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <td class=\"action\"> <button class=\"trash\" onclick=\"___mc.events.push('support.ticket.archive', ");r.push(await h.__gv('id', ctx));r.push(")\"></button> </td> ");return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" <td> <p class=\"title\">");r.push(await h.__gv('title', ctx));r.push("</p> <p class=\"description\">");r.push(await h.__gv('created|datetime', ctx));r.push("</p> </td> </tr>");return r.join('')}
views_cache['/faq/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.heading");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <div class=\"col-2-3\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.notice");return r.join('');}), ctx));r.push("</p> </div> <div class=\"faq-container\"> <div class=\"faq-inner col-1-2\"> <ul class=\"faq-list\"> ");r.push(await h('each', [await h.__gv('faq.items', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h.include('faq/item', ctx));r.push(" ");return r.join('');}), ctx));r.push(" </ul> </div> <div class=\"col-1-2 media_off_2\"> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/bases/cards/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> <input type=\"checkbox\" data-id=\"");r.push(await h.__gv('card_number', ctx));r.push("\"> </td> <td> <div class=\"card-number\"> <img src=\"/assets/cards/thumb/");r.push(await h.__gv('bin', ctx));r.push(".png\" alt=\"\">&nbsp; <span>");r.push(await h.__gv('bin', ctx));r.push("</span> </div> </td> <td>");r.push(await h.__gv('expire', ctx));r.push("</td> <td>");r.push(await h.__gv('brand', ctx));r.push("</td> <td>");r.push(await h.__gv('type', ctx));r.push("</td> <td>");r.push(await h.__gv('category', ctx));r.push("</td> <td> <div class=\"card-number\"> <img src=\"https://raw.githubusercontent.com/hampusborgos/country-flags/refs/heads/main/svg/");r.push(await h.__gv('country|lowercase', ctx));r.push(".svg\" alt=\"\"> <span>");r.push(await h.__gv('country', ctx));r.push("</span> </div> </td> <td>");r.push(await h.__gv('issuer', ctx));r.push("</td> <td>");r.push(await h.__gv('base.name', ctx));r.push("</td> <td><span class=\"price\">");r.push(await h.__gv('price', ctx));r.push("$</span></td> <td class=\"action\"> <button class=\"cart\" data-id=\"");r.push(await h.__gv('card_number', ctx));r.push("\"></button> </td> </tr>");return r.join('')}
views_cache['/layouts/components/multiple_input.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"multiple-input ");r.push(await h.__gv('classlist', ctx));r.push("\" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> ");r.push(await h('if', [await h.__gv('label', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <label class=\"mt-0 pointer\">");r.push(await h.__gv('label', ctx));r.push("</label> ");return r.join('');}), ctx));r.push(" <div class=\"d-flex\"> <input name=\"");r.push(await h.__gv('name', ctx));r.push("\" type=\"");r.push(await h.__gv('type', ctx));r.push("\" placeholder=\"");r.push(await h.__gv('placeholder', ctx));r.push("\" autocomplete=\"off\" ");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push(" //> <div class=\"multiple-input__actions d-flex\"> <button class=\" ml-2 icon ");r.push(await h('unless', [await h.__gv('multiple', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("hide");return r.join('');}), ctx));r.push(" \" ");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push(" data-type=\"add\"> <span class=\"mdi mdi-plus-thick\"></span> </button> <button class=\" ml-2 icon ");r.push(await h('unless', [await h.__gv('delete', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("hide");return r.join('');}), ctx));r.push(" \" ");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push(" data-type=\"delete\"> <span class=\"mdi mdi-delete\"></span> </button> </div> </div> <div class=\"multiple-input__errors hide\"></div> </div> ");return r.join('')}
views_cache['/bases/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title \"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\" style=\"border: none; padding: 0\"> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'bases.filter.created.start.change', value: await h.__gv('filter.period_s', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'bases.filter.created.end.change', value: await h.__gv('filter.period_e', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'false', placeholder: 'bases.table.type', name: 'type', value: await h.__gv('filter.type', ctx), onset: await h.__gv('type_set', ctx), onsuggest: await h.__gv('type_suggest', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'true', placeholder: 'bases.table.status', name: 'status', value: await h.__gv('filter.status', ctx), onset: await h.__gv('status_set', ctx), onsuggest: await h.__gv('status_suggest', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('bases.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"contents contents_inner_manage_base_page\" handler=\"controllers/bases/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th>ID</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.created");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.name");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.price");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.status");return r.join('');}), ctx));r.push("</th> <th colspan=\"3\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/shop/cart/index.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cart.cvv.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div id=\"cvv\"> <div class=\"table-container\"> <table> <thead> <tr> <th><input type=\"checkbox\" onchange=\"___mc.events.push('shop.cart.checkbox.toggle.all', this)\"></th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.bin");return r.join('');}), ctx));r.push("</th> <!--<th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.expire");return r.join('');}), ctx));r.push("</th>--> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.brand");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.type");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.category");return r.join('');}), ctx));r.push("</th> <!--<th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.country");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.issuer");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.base");return r.join('');}), ctx));r.push("</th>--> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.price");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> </div> </div> </div> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> <div class=\"block\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>02</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cart.bulk.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div id=\"bulk\"> <div class=\"table-container\"> <table> <thead> <tr> <th><input type=\"checkbox\" onchange=\"___mc.events.push('shop.cart.checkbox.toggle.all', this)\"></th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.bulk.table.name");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.bulk.table.price");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.bulk.table.status");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> </div> </div> </div> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/components/select.mst'] = async (ctx, h) => {let r = [];r.push("<div data-id=\"");r.push(await h.__gv('dataId', ctx));r.push("\" class=\"select ");r.push(await h.__gv('classlist', ctx));r.push(" ");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push("\" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> <div class=\"option\" data-value=\"");r.push(await h.__gv('value', ctx));r.push("\"> <span data-name=");r.push(await h.__gv('name', ctx));r.push(">");r.push(await h.__gv('option', ctx));r.push("</span> <ul class=\"options\"> ");r.push(await h('each', [await h.__gv('options', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <li data-value=\"");r.push(await h.__gv('value', ctx));r.push("\" class=\"");r.push(await h('if', [await h.__gv('value', ctx), await h.__gv('../value', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("selected");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push("\"> ");r.push(await h.__gv('option', ctx));r.push(" </li> ");return r.join('');}), ctx));r.push(" ");r.push(await h('unless', [await h.__gv('options', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h.__gv('{content}', ctx));r.push(" ");return r.join('');}), ctx));r.push(" </ul> </div> </div> ");return r.join('')}
views_cache['/profile/telegram.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"user-space-wrapper flex gap-sm deposit_page_user_space_wrapper_2\"> ");r.push(await h.include('/profile/menu', ctx, 'active=\'telegram\''));r.push(" <div class=\"col-3-4\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.telegram.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"col-1-3\"> <h2 class=\"account-edit-h2\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.info.title");return r.join('');}), ctx));r.push("</span> <img src=\"/assets/img/warning-yellow.svg\" alt=\"\"> </h2> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.info.text");return r.join('');}), ctx));r.push("</p> </div> <div class=\"account-edit\"> <form action=\"\" autocomplete=\"off\"> <div class=\"form-element col-1-1\"> <p class=\"label\">Status</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <p> ");r.push(await h('if', [await h.__gv('profile.telegram_id', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.telegram.status.linked");return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" ");r.push(await h('unless', [await h.__gv('profile.telegram_id', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("profile.telegram.status.not_linked");return r.join('');}), ctx));r.push(" ");return r.join('');}), ctx));r.push(" </p> </div> </div> </div> <div class=\"buttons\"> ");r.push(await h('unless', [await h.__gv('profile.telegram_id', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('profile.link_tg', this)\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.link_tg");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" </div> </form> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/dashboard/client.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"dashboard-container dashboard_section\"> <div class=\"block corner-left-top-right-bottom-clip-sm dashboard-left-top\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>Carte</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"flex flex-col gap-sm margin-top-sm\"> <div class=\"flex flex-justify-between flex-wrap\"> <div class=\"dashboard_page flex flex-justify-between col-2-3 left_dashboard_chart\"> <div class=\"flex flex-col\"> <div class=\"cornered-text-block corner-right-top-clip-xs dashboard_page_cornered\"> <p>Stock / News</p> </div> <div> <p class=\"big-caption\">1358</p> </div> <div> <p class=\"mid-caption flex flex-align-center gap-xs dashboard_page_mid_caption\"> <img class=\"col-1-8\" src=\"/assets/img/arrow-up.svg\" alt=\"\"> <span>10%</span> <span class=\"indicator-horizontal yellow\"> <span></span> <span></span> <span></span> </span> </p> </div> </div> <div class=\"dashboard_page_div\"> <div class=\"chart-donut\"> <div></div> </div> <div> <p> <span class=\"dot-middle blue\"></span> Classiq . <span class=\"small-caption\">232</span> </p> <p> <span class=\"dot-middle yellow\"></span> Gold . <span class=\"small-caption\">232</span> </p> <p> <span class=\"dot-middle red\"></span> BUsiness . <span class=\"small-caption\">232</span> </p> <p> <span class=\"dot-middle green\"></span> Infinite . <span class=\"small-caption\">232</span> </p> </div> </div> </div> <div class=\"media_off corner-left-bottom-right-top-clip-xs space-wrapper shadow_dashboard_left\"> <div class=\"placeholder striped\" style=\"min-height: 220px\"></div> </div> </div> <div class=\"flex flex-justify-between dashboard_page_flex_div\"> <div class=\"col-2-3\"> <div class=\"table-container fixed-layout dashboard_page_table_container\"> <table> <tbody> <tr> <td> +&nbsp;<span class=\"price\">350</span> </td> <td><button class=\"bordered dashboard_page_bordered\">Fresh</button> </td> <td>Thay_2811</td> <td><button class=\"bordered dashboard_page_bordered\">24.08</button> </td> </tr> <tr> <td> +&nbsp;<span class=\"price\">350</span> </td> <td><button class=\"bordered dashboard_page_bordered\">Fresh</button> </td> <td>Thay_2811</td> <td><button class=\"bordered dashboard_page_bordered\">24.08</button> </td> </tr> <tr> <td> +&nbsp;<span class=\"price\">350</span> </td> <td><button class=\"bordered dashboard_page_bordered\">Fresh</button> </td> <td>Thay_2811</td> <td><button class=\"bordered dashboard_page_bordered\">24.08</button> </td> </tr> </tbody> </table> </div> </div> <div class=\"dashboard_page_col_1_3 col-1-3 flex flex-col flex-justify-around text-right chart_bottom_right\"> <h2 class=\"margin-bottom-xs\">Infos</h2> <p>Restock every week</p> <div class=\"corner-right-bottom-clip-xs visitor padding-sm\"> <p>Visiter le shop</p> </div> </div> </div> </div> </div> </div> <div class=\"block corner-left-top-clip-sm dashboard-right-top\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>02</span> </div> <div class=\"block-caption block_caption\"> <h2>Activite</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"flex flex-col gap-sm margin-top-sm\"> <div class=\"col-1-2\"> <div class=\"cornered-text-block corner-right-top-clip-xs\"> <p>Utilisateurs</p> </div> <div class=\"flex flex-align-center flex-justify-between\"> <div> <p class=\"big-caption\">850</p> </div> <div> <p class=\"mid-caption flex flex-align-center gap-xs \"> <img class=\"col-1-8\" src=\"/assets/img/arrow-up.svg\" alt=\"\"> <span>5%</span> <span class=\"indicator-horizontal yellow\"> <span></span> <span></span> <span></span> </span> </p> </div> </div> </div> <div class=\"margin-top-sm\"> <div class=\"cornered-text-block corner-right-top-clip-xs main_padding\"> <p>Avis annonces</p> </div> <div class=\"flex gap-sm margin-top-sm\"> <div class=\"corner-left-bottom-right-top-clip-xs padding-sm col-1-2 bg-blue\"> <div class=\"flex flex-align-center flex-justify-between\"> <button class=\"bordered dashboard_page_bordered\">Top qualitte</button> <button class=\"bordered dashboard_page_bordered\">24.08</button> </div> <div class=\"margin-top-xs\"> <p class=\"small-caption\">* * * *</p> <p class=\"margin-top-sm\">Consitent de l'impor...</p> </div> </div> <div class=\"corner-left-bottom-right-top-clip-xs padding-sm col-1-2 bg-blue\"> <div class=\"flex flex-align-center flex-justify-between\"> <button class=\"bordered dashboard_page_bordered\">Top qualitte</button> <button class=\"bordered dashboard_page_bordered\">24.08</button> </div> <div class=\"margin-top-xs\"> <p class=\"small-caption\">* * * *</p> <p class=\"margin-top-sm\">Consitent de l'impor...</p> </div> </div> </div> </div> <div class=\"corner-left-bottom-clip-sm bg-blue margin-top-sm padding-lg\"> <div class=\"flex flex-align-center flex-justify-between gap-sm\"> <h2>News</h2> <span>+&nbsp;<span class=\"small-caption\">5</span></span> </div> <div class=\"flex_wrap_div flex flex-align-center gap-sm margin-top-sm\"> <div class=\"corner-right-bottom-clip-xs col-1-4 padding-sm bg-blue\"> <p>5 min age</p> <p class=\"small-caption margin-top-xs\">Subject</p> </div> <div class=\"corner-right-bottom-clip-xs col-1-4 padding-sm bg-blue\"> <p>5 min age</p> <p class=\"small-caption margin-top-xs\">Subject</p> </div> <div class=\"corner-right-bottom-clip-xs col-1-4 padding-sm bg-blue\"> <p>5 min age</p> <p class=\"small-caption margin-top-xs\">Subject</p> </div> <div class=\"corner-right-bottom-clip-xs col-1-4 padding-sm bg-blue\"> <p>5 min age</p> <p class=\"small-caption margin-top-xs\">Subject</p> </div> </div> </div> </div> </div> </div> <div class=\"bg_red_area_responsive_onnn\"> <div class=\"block col-3-4 width_full bg-red\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>03</span> </div> <div class=\"block-caption block_caption\"> <h2>Rank clients</h2> <p class=\"not_connected_text\">Non connecté</p> </div> </div> <div class=\"contents\"> <div class=\"flex flex-justify-between flex-align-center margin-top-sm block_div\"> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Rank</span> <img class=\"arrow_red\" src=\"/assets/img/arrow.svg\" alt=\"\"> </a> <a href=\"\" class=\"button bordered\"> <span>none</span> </a> </div> <div class=\"col-2-3\"> <div class=\"progress-container padding-xs blue\"> <div class=\"progress-indicator percent_indicator\"> <div class=\"progress-percent\" style=\"width: 50%\"></div> </div> </div> </div> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Rank</span> <img class=\"arrow_red\" src=\"/assets/img/arrow.svg\" alt=\"\"> </a> <a href=\"\" class=\"button bordered\"> <span>none</span> </a> </div> </div> <div class=\"col-1-1 flex flex-justify-center margin-top-lg dashboard_page_percent mid_caption_red\"> <p> <span class=\"mid-caption red\">0.00%</span> <span>sur</span> <span class=\"mid-caption\">100%</span> </p> </div> </div> </div> <div class=\"block col-1-4 bg-red width_full\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>04</span> </div> <div class=\"block-caption block_caption\"> <h2>Mini jeux</h2> <p class=\"not_connected_text\">Bientôt disponible</p> </div> </div> <div class=\"contents\"> <div class=\"col-1-2 corner-right-bottom-clip-sm padding-lg bg-red margin-top-sm\"> <p>Découvrir le casino</p> </div> </div> </div> </div> <div class=\"block width_full bg-red bg_red_area_responsive_offf bg_red_left\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>03</span> </div> <div class=\"block-caption block_caption\"> <h2>Rank clients</h2> <p class=\"not_connected_text\">Non connecté</p> </div> </div> <div class=\"contents\"> <div class=\"flex flex-justify-between flex-align-center margin-top-sm block_div\"> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Rank</span> <img class=\"arrow_red\" src=\"/assets/img/arrow.svg\" alt=\"\"> </a> <a href=\"\" class=\"button bordered\"> <span>none</span> </a> </div> <div class=\"col-2-3\"> <div class=\"progress-container padding-xs blue\"> <div class=\"progress-indicator percent_indicator\"> <div class=\"progress-percent\" style=\"width: 50%\"></div> </div> </div> </div> <div class=\"flex\"> <a href=\"\" class=\"button\"> <span>Rank</span> <img class=\"arrow_red\" src=\"/assets/img/arrow.svg\" alt=\"\"> </a> <a href=\"\" class=\"button bordered\"> <span>none</span> </a> </div> </div> <div class=\"col-1-1 flex flex-justify-center margin-top-lg dashboard_page_percent mid_caption_red\"> <p> <span class=\"mid-caption\">00.00%</span> <span>sur</span> <span class=\"mid-caption\">100%</span> </p> </div> </div> </div> <div class=\"block bg-red width_full bg_red_area_responsive_offf bg_red_right\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>04</span> </div> <div class=\"block-caption block_caption\"> <h2>Mini jeux</h2> <p class=\"not_connected_text\">Bientôt disponible</p> </div> </div> <div class=\"contents\"> <div class=\"col-1-2 corner-right-bottom-clip-sm padding-lg bg-red margin-top-sm\"> <p>Découvrir le casino</p> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/bases/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> ");r.push(await h.__gv('id', ctx));r.push(" </td> <td> ");r.push(await h.__gv('created|datetime', ctx));r.push(" </td> <td> ");r.push(await h.__gv('name', ctx));r.push(" </td> <td> <span class=\"price\">");r.push(await h.__gv('price|money', ctx));r.push("$</span> </td> <td> ");r.push(await h.__gv('type', ctx));r.push(" </td> <td class=\"action\"> <button class=\"bordered_red boridered\">");r.push(await h.__gv('status', ctx));r.push("</button> </td> <td class=\"action\"> <a href=\"/admin/bases/");r.push(await h.__gv('id', ctx));r.push("/cards/\" class=\"button eye bordered\"></a> </td> </tr>");return r.join('')}
views_cache['/admin/faq/edit.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h.__gv('title', ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"contents-inner\"> <form action=\"\" autocomplete=\"off\"> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.question");return r.join('');}), ctx));r.push(" *</p> <div class=\"wrap-container\"> <div class=\"col-1-1\"> <input type=\"text\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.question");return r.join('');}), ctx));r.push("\" name=\"question\" autocomplete=\"off\" value=\"");r.push(await h.__gv('faq.question', ctx));r.push("\"> </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.lang");return r.join('');}), ctx));r.push(" *</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {min: 0, value: await h.__gv('faq.language', ctx), items: await h.__gv('languages', ctx), onchange: await h.__gv('faq_lang_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.status");return r.join('');}), ctx));r.push("</p> <div class=\"wrap-container\"> <div class=\"col-1-1 block_caption\"> ");r.push(await h('autocomplete', {min: 0, value: await h.__gv('faq.status', ctx), items: await h.__gv('statuses', ctx), onchange: await h.__gv('faq_status_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <div class=\"form-element col-1-1\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.answer");return r.join('');}), ctx));r.push(" *</p> <textarea placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("faq.table.answer");return r.join('');}), ctx));r.push("\" name=\"answer\" autocomplete=\"off\">");r.push(await h.__gv('faq.answer', ctx));r.push("</textarea> <p class=\"notes\">10 ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("info.characters_minimum");return r.join('');}), ctx));r.push("</p> </div> <div class=\"buttons\"> ");r.push(await h('if', [await h.__gv('faq.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('admin.faq.save', this)\" data-action=\"create\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.add");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" ");r.push(await h('unless', [await h.__gv('faq.id', ctx), 'new'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('admin.faq.save', this)\" data-action=\"update\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.update");return r.join('');}), ctx));r.push("</button> ");return r.join('');}), ctx));r.push(" </div> </form> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/components/info.mst'] = async (ctx, h) => {let r = [];r.push("<div id=\"");r.push(await h.__gv('id', ctx));r.push("\" class=\"relative\"> <span class=\"mdi mdi-");r.push(await h.__gv('icon', ctx));r.push(" pointer f-s-");r.push(await h.__gv('icon_size', ctx));r.push(" ");r.push(await h.__gv('color', ctx));r.push("\"></span> <div class=\"hide info-wrapper\" style=\"width:");r.push(await h.__gv('width', ctx));r.push("px;margin-left:");r.push(await h.__gv('left', ctx));r.push("px;");r.push(await h('if', [await h.__gv('top', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("top:0px;bottom:auto;");return r.join('');}), ctx));r.push("\"> ");r.push(await h.__gv('comment', ctx));r.push(" </div> </div> ");return r.join('')}
views_cache['/admin/users/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> ");r.push(await h.__gv('id', ctx));r.push(" </td> <td> ");r.push(await h.__gv('created|datetime', ctx));r.push(" </td> <td> ");r.push(await h.__gv('nickname', ctx));r.push(" </td> <td> ");r.push(await h.__gv('role', ctx));r.push(" </td> <td class=\"action\"> <button class=\"");r.push(await h('if', [await h.__gv('status', ctx), 'blocked'], (async (ctx, prev_ctx) => {let r = [];r.push("red");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('status', ctx), 'active'], (async (ctx, prev_ctx) => {let r = [];r.push("green");return r.join('');}), ctx));r.push("\">");r.push(await h.__gv('status', ctx));r.push("</button> </td> <td> ");r.push(await h.__gv('balance|money', ctx));r.push("$ </td> <td class=\"action\"> <a href=\"/admin/users/edit/");r.push(await h.__gv('id', ctx));r.push("\" class=\"button pencil\"></a> </td> <!-- <td class=\"action\"> <a href=\"/admin/users/\" class=\"button eye\"></a> </td> --> <td class=\"action\"> ");r.push(await h('if', [await h.__gv('status', ctx), 'active'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"button remove red\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\" onclick=\"___mc.events.push('admin.users.archive', {id: ");r.push(await h.__gv('id', ctx));r.push(", name:'");r.push(await h.__gv('nickname', ctx));r.push("' })\"></button> ");return r.join('');}), ctx));r.push(" </td> <td class=\"action\"> ");r.push(await h('if', [await h.__gv('status', ctx), 'NE', 'seller'], (async (ctx, prev_ctx) => {let r = [];r.push(" <button type=\"button\" class=\"button shop\" data-id=\"");r.push(await h.__gv('id', ctx));r.push("\" onclick=\"___mc.events.push('admin.users.seller.set', {id: ");r.push(await h.__gv('id', ctx));r.push(", name:'");r.push(await h.__gv('nickname', ctx));r.push("' })\"></button> ");return r.join('');}), ctx));r.push(" </td> </tr>");return r.join('')}
views_cache['/layouts/components/seload.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"select ");r.push(await h.__gv('classlist', ctx));r.push("\" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> <div class=\"option\" data-value=\"");r.push(await h.__gv('value', ctx));r.push("\"> <span>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("select.default");return r.join('');}), ctx));r.push("</span> <ul class=\"options\"> </ul> </div> </div> ");return r.join('')}
views_cache['/dashboard/blocks/cards.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"flex flex-col gap-sm margin-top-sm\"> <div class=\"flex flex-justify-between flex-wrap\"> <div class=\"dashboard_page flex flex-justify-between left_dashboard_chart\"> <div class=\"flex flex-col\"> <div class=\"cornered-text-block corner-right-top-clip-xs dashboard_page_cornered\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.title");return r.join('');}), ctx));r.push(" / ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.title");return r.join('');}), ctx));r.push("</p> </div> <div> <p class=\"big-caption connect_dashboard_page_1358\">");r.push(await h.__gv('current.total', ctx));r.push("</p> </div> <div> <p class=\"mid-caption flex flex-align-center gap-xs dashboard_page_mid_caption\"> <img class=\"col-1-8\" src=\"/assets/img/arrow-up.svg\" alt=\"\"> <span>");r.push(await h.__gv('change', ctx));r.push("%</span> <span class=\"indicator-horizontal yellow\"> <span></span> <span></span> <span></span> </span> </p> </div> </div> <div class=\"dashboard_page_div\"> <div class=\"chart-donut\" style=\"");r.push(await h.__gv('chart.style', ctx));r.push("\"> <div></div> </div> <div> ");r.push(await h('each', [await h.__gv('current.items', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <p> <span class=\"dot-middle ");r.push(await h.__gv('class', ctx));r.push("\"></span> ");r.push(await h.__gv('brand', ctx));r.push(" . <span class=\"small-caption\">");r.push(await h.__gv('count', ctx));r.push("</span> </p> ");return r.join('');}), ctx));r.push(" <!-- <p> <span class=\"dot-middle blue\"></span> Classique . <span class=\"small-caption\">232</span> </p> <p> <span class=\"dot-middle yellow\"></span> Gold . <span class=\"small-caption\">232</span> </p> <p> <span class=\"dot-middle red\"></span> BUsiness . <span class=\"small-caption\">232</span> </p> <p> <span class=\"dot-middle green\"></span> Infinite . <span class=\"small-caption\">232</span> </p> --> </div> </div> </div> </div> </div>");return r.join('')}
views_cache['/bases/cards/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title \"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.caption");return r.join('');}), ctx));r.push(" ");r.push(await h.__gv('filter.base_id', ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'true', placeholder: 'bases.table.status', name: 'status', value: await h.__gv('filter.status', ctx), onset: await h.__gv('status_set', ctx), onsuggest: await h.__gv('status_suggest', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('bases.cards.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"contents contents_inner_manage_base_page\" data-base-id=\"");r.push(await h.__gv('filter.base_id', ctx));r.push("\" handler=\"controllers/bases/cards/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th><input type=\"checkbox\" onchange=\"___mc.events.push('shop.cvv.checkbox.all.toggle', this)\"></th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.bin");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.expire");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.brand");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.type");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.category");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.country");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.issuer");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.base");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.price");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <td colspan=\"11\"> <div class=\"loader\"> <span></span> <span></span> <span></span> <span></span> </div> </td> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/layouts/components/notify.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"notify ");r.push(await h.__gv('level', ctx));r.push("\" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> <div class=\"notify-inner\"> <header> <h2>");r.push(await h.__gv('title', ctx));r.push("</h2> </header> ");r.push(await h('if', [await h.__gv('text', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <p>");r.push(await h.__gv('text', ctx));r.push("</p> ");return r.join('');}), ctx));r.push(" </div> </div>");return r.join('')}
views_cache['/layouts/components/autocomplete.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"autocomplete ");r.push(await h.__gv('classlist', ctx));r.push("\" id=\"");r.push(await h.__gv('id', ctx));r.push("\"> ");r.push(await h('if', [await h.__gv('label', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <label>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push(await h.__gv('label', ctx));return r.join('');}), ctx));r.push("</label> ");return r.join('');}), ctx));r.push(" <input type=\"text\" placeholder=\"");r.push(await h.__gv('placeholder', ctx));r.push("\" ");r.push(await h('if', [await h.__gv('name', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("name=\"");r.push(await h.__gv('name', ctx));r.push("\"");return r.join('');}), ctx));r.push(" value=\"");r.push(await h.__gv('value', ctx));r.push("\" ");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push(" autocomplete=\"off\"/> <span class=\"mdi mdi-close ");r.push(await h('unless', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("clear");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('disabled', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push("disabled");return r.join('');}), ctx));r.push("\"></span> <ul class=\"options\"> <li class=\"empty\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.empty");return r.join('');}), ctx));r.push("</li> </ul> </div> <div> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </div> ");return r.join('')}
views_cache['/layouts/components/lang.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"dropdown lang\"> <div class=\"title\"> <a class=\"mdi mdi-web\"></a>");r.push(await h.__gv('lang', ctx));r.push(" </div> <div class=\"content\"> ");r.push(await h('if', [await h.__gv('lang', ctx), 'ru'], (async (ctx, prev_ctx) => {let r = [];r.push(" <a class=\"link\" onclick=\"___mc.events.push('lang.change', 'en')\">En</a> ");return r.join('');}), ctx));r.push(" ");r.push(await h('if', [await h.__gv('lang', ctx), 'en'], (async (ctx, prev_ctx) => {let r = [];r.push(" <a class=\"link\" onclick=\"___mc.events.push('lang.change', 'ru')\">Ru</a> ");return r.join('');}), ctx));r.push(" </div> </div> ");return r.join('')}
views_cache['/dashboard/blocks/activity.mst'] = async (ctx, h) => {let r = [];r.push("<div class=\"connect_dashboard_page_title_15\"> <div> <p class=\"cornered-text-block\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.activity.products");return r.join('');}), ctx));r.push("</p> <h1>");r.push(await h.__gv('products', ctx));r.push("</h1> </div> <div class=\"connect_dashboard_page_title_15_second_div\"> <a href=\"/shop/cart/\" class=\"flex flex-align-center flex-justify-between w-100\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.activity.cart");return r.join('');}), ctx));r.push("</p> <img src=\"/assets/img/arrow-right-up.svg\" alt=\"\"> </a> </div> </div> <div class=\"connect_page_dashboard_end_section\"> <div class=\"cornered-text-block corner-right-top-clip-xs main_padding\"> <p>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.activity.latest");return r.join('');}), ctx));r.push("</p> </div> <div class=\"flex gap-sm margin-top-sm connect_page_dashboard_end_section_c\"> ");r.push(await h('each', [await h.__gv('orders.items', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"corner-left-bottom-right-top-clip-xs padding-sm col-1-2 bg-blue cornered_connect_dashboard\"> <div class=\"flex flex-align-center flex-justify-between\"> <button class=\"bordered dashboard_page_bordered\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.activity.date");return r.join('');}), ctx));r.push(" </button> <button class=\"bordered dashboard_page_bordered\">");r.push(await h.__gv('created|date', ctx));r.push("</button> </div> <div class=\"flex flex-align-center flex-justify-between\"> <button class=\" dashboard_page_bordered\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.activity.amount");return r.join('');}), ctx));r.push(" </button> <button class=\"price dashboard_page_bordered\">");r.push(await h.__gv('amount|money', ctx));r.push("$</button> </div> <div class=\"check_now_button_\"> <a href=\"/profile/orders/\" class=\"button dashboard_page_bordered\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("dashboard.activity.check");return r.join('');}), ctx));r.push(" </a> </div> </div> ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"corner-left-bottom-clip-sm bg-blue margin-top-sm padding-lg\"> <div class=\"flex flex-align-center flex-justify-between gap-sm\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("news.title");return r.join('');}), ctx));r.push("</h2> <!--<span>+&nbsp;<span class=\"small-caption\">5</span></span>--> </div> <div class=\"flex_wrap_div flex flex-align-center gap-sm margin-top-sm\"> ");r.push(await h('each', [await h.__gv('news.items', ctx)], (async (ctx, prev_ctx) => {let r = [];r.push(" <div class=\"corner-right-bottom-clip-xs col-1-4 padding-sm bg-blue open_modal_1\"> <p>");r.push(await h.__gv('created|datetime', ctx));r.push("</p> <a href=\"/news/\"> <p class=\"small-caption margin-top-xs\">");r.push(await h.__gv('title', ctx));r.push("</p> </a> </div> ");return r.join('');}), ctx));r.push(" </div> </div>");return r.join('')}
views_cache['/shop/client/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>Best seller</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"seller-cards\"> <div class=\"best-seller-card corner-left-top-right-bottom-clip-sm col-1-3\"> <div class=\"bl-top\"> <h2>Seller7789 <span>top: 1</span></h2> <div class=\"bl-panel\"> <a href=\"\" class=\"button rank\"> <span>Rank</span> <span class=\"arrow arrow-right\"></span> </a> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </div> <div class=\"bl-middle\"> <div> <p>Total cc sold <span>.</span> <span>001</span></p> <p>CC currently on the shop <span>.</span> <span>001</span></p> </div> <div> <label> <input type=\"checkbox\"> <span>show cc</span> </label> </div> </div> <div class=\"bl-bottom\"> <div> <p>Validrate</p> </div> <div class=\"progress-container\"> <div class=\"progress-number\">75.5%</div> <div class=\"progress-indicator\"> <div class=\"progress-percent\" style=\"width: 75.5%\"></div> </div> </div> </div> </div> <div class=\"best-seller-card corner-left-top-right-bottom-clip-sm col-2-3\"> <div class=\"bl-top\"> <h2>Seller7789 <span>top: 1</span></h2> <div class=\"bl-panel\"> <a href=\"\" class=\"button rank\"> <span>Rank</span> <span class=\"arrow arrow-right\"></span> </a> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </div> <div class=\"bl-middle\"> <div> <p>Total cc sold <span>.</span> <span>001</span></p> <p>CC currently on the shop <span>.</span> <span>001</span></p> </div> <div> <label> <input type=\"checkbox\"> <span>show cc</span> </label> </div> </div> <div class=\"bl-bottom\"> <div> <p>Validrate</p> </div> <div class=\"progress-container orange\"> <div class=\"progress-number\">55.5%</div> <div class=\"progress-indicator\"> <div class=\"progress-percent\" style=\"width: 55.5%\"></div> </div> </div> </div> </div> <div class=\"best-seller-card corner-left-top-right-bottom-clip-sm col-2-3\"> <div class=\"bl-top\"> <h2>Seller7789 <span>top: 1</span></h2> <div class=\"bl-panel\"> <a href=\"\" class=\"button rank\"> <span>Rank</span> <span class=\"arrow arrow-right\"></span> </a> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </div> <div class=\"bl-middle\"> <div> <p>Total cc sold <span>.</span> <span>001</span></p> <p>CC currently on the shop <span>.</span> <span>001</span></p> </div> <div> <label> <input type=\"checkbox\"> <span>show cc</span> </label> </div> </div> <div class=\"bl-bottom\"> <div> <p>Validrate</p> </div> <div class=\"progress-container\"> <div class=\"progress-number\">75.5%</div> <div class=\"progress-indicator\"> <div class=\"progress-percent\" style=\"width: 75.5%\"></div> </div> </div> </div> </div> <div class=\"best-seller-card corner-left-top-right-bottom-clip-sm col-1-3\"> <div class=\"bl-top\"> <h2>Seller7789 <span>top: 1</span></h2> <div class=\"bl-panel\"> <a href=\"\" class=\"button rank\"> <span>Rank</span> <span class=\"arrow arrow-right\"></span> </a> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </div> <div class=\"bl-middle\"> <div> <p>Total cc sold <span>.</span> <span>001</span></p> <p>CC currently on the shop <span>.</span> <span>001</span></p> </div> <div> <label> <input type=\"checkbox\"> <span>show cc</span> </label> </div> </div> <div class=\"bl-bottom\"> <div> <p>Validrate</p> </div> <div class=\"progress-container red\"> <div class=\"progress-number\">35.2%</div> <div class=\"progress-indicator\"> <div class=\"progress-percent\" style=\"width: 35.2%\"></div> </div> </div> </div> </div> </div> <div class=\"buttons\"> <button class=\"bordered col-1-1\">Voir tous les vendeurs</button> </div> </div> </div> <div class=\"block\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>All seller</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <div class=\"table-container\"> <table> <thead> <tr> <th>Seller name</th> <th>Seller rank</th> <th>Blacklist</th> </tr> </thead> <tbody> <tr> <td>XMR</td> <td> <div class=\"bl-panel\"> <a href=\"\" class=\"button rank\"> <span>Rank</span> <span class=\"arrow arrow-right\"></span> </a> <a href=\"\" class=\"button bordered\"> <span>silver</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/silver.svg\" alt=\"\"> </a> </div> </td> <td class=\"action text-right\"> <button class=\"eye\"></button> </td> </tr> <tr> <td>thay_2811</td> <td> <div class=\"bl-panel\"> <a href=\"\" class=\"button rank\"> <span>Rank</span> <span class=\"arrow arrow-right\"></span> </a> <a href=\"\" class=\"button bordered\"> <span>none</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/none.svg\" alt=\"\"> </a> </div> </td> <td class=\"action text-right\"> <button class=\"eye\"></button> </td> </tr> <tr> <td>Etherueum</td> <td> <div class=\"bl-panel\"> <a href=\"\" class=\"button rank\"> <span>Rank</span> <span class=\"arrow arrow-right\"></span> </a> <a href=\"\" class=\"button bordered\"> <span>gold</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/gold.svg\" alt=\"\"> </a> </div> </td> <td class=\"action text-right\"> <button class=\"eye\"></button> </td> </tr> <tr> <td>DOGcoin</td> <td> <div class=\"bl-panel\"> <a href=\"\" class=\"button rank\"> <span>Rank</span> <span class=\"arrow arrow-right\"></span> </a> <a href=\"\" class=\"button bordered\"> <span>bronze</span> </a> <a href=\"\" class=\"button\"> <img src=\"/assets/img/bronze.svg\" alt=\"\"> </a> </div> </td> <td class=\"action text-right\"> <button class=\"eye\"></button> </td> </tr> </tbody> </table> </div> <div class=\"buttons\"> <button class=\"bordered col-1-1\">Fermer</button> </div> </div> </div> <div class=\"corner-right-top-clip-sm space-wrapper\"> <div class=\"placeholder striped\"></div> </div> <div handler=\"controllers/shop/client/handler/products\"> <div class=\"table-container\"> <table> <thead> <tr> <th><input type=\"checkbox\"></th> <th>id</th> <!-- <th>level</th> <th>vendeur</th> <th>pays</th> --> <th>name</th> <th>price</th> <th colspan=\"1\">action</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/utilities/checker/bin.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"flex gap-sm checker-wrapper_\"> <div class=\"col-1-2\"> <div class=\"block corner-left-top-clip-sm checker_bin_page\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.bin.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"contents\"> <form action=\"\"> <div class=\"col-1-1\"> <div class=\"form-element\"> <p class=\"label\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.bin.label");return r.join('');}), ctx));r.push("</p> <input class=\"main_input_el\" type=\"number\" placeholder=\"1234 5678 1234 5678\" name=\"bin\"> <p class=\"notes\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.bin.notes");return r.join('');}), ctx));r.push(" </p> </div> </div> <div class=\"buttons\"> <button type=\"submit\" class=\"bordered col-1-1\" onclick=\"this.disabled=true;___mc.events.push('utils.bin_checker.submit', this)\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.bin.button");return r.join('');}), ctx));r.push("</button> </div> </form> </div> </div> <div class=\"corner-right-bottom-clip-sm media_off space-wrapper margin-top checker_bin_page_corner\"> <div class=\"placeholder striped \"></div> </div> </div> <div id=\"bins-list\" class=\"col-1-2 corner-left-top-clip-sm\" handler=\"controllers/utilities/checker/bin/handler\"> <div class=\"table-container\"> <div class=\"table-filters\"> <div class=\"corner-right-top-clip-xs space-wrapper col-2-3\"> <div class=\"placeholder striped\"></div> </div> <div class=\"search-input media_off\"> <input class=\"padding-sm\" type=\"search\" placeholder=\"");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.bin.table.search");return r.join('');}), ctx));r.push("\"> <span class=\"search-input-img\"></span> </div> <div class=\"search_icon media_onn\"> <i class=\"bi bi-search\"></i> </div> </div> <table> <thead> <tr> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.bin.table.bin");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.bin.table.bank");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.bin.table.country");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("utilities.checker.bin.table.type");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/profile/orders/item.mst'] = async (ctx, h) => {let r = [];r.push("<tr> <td> ");r.push(await h.__gv('id', ctx));r.push(" </td> <td> ");r.push(await h.__gv('created|datetime', ctx));r.push(" </td> <td> <span class=\"price\">");r.push(await h.__gv('amount|money', ctx));r.push("$</span> </td> <td class=\"action\"> <button class=\"bordered_red boridered\">");r.push(await h.__gv('status', ctx));r.push("</button> </td> <td> ");r.push(await h.__gv('items|count', ctx));r.push(" </td> <td class=\"action\"> <a href=\"/orders/details/");r.push(await h.__gv('id', ctx));r.push("\" class=\"button eye bordered\"></a> </td> </tr>");return r.join('')}
views_cache['/profile/orders/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"user-space-wrapper flex gap-sm deposit_page_user_space_wrapper_2\"> ");r.push(await h.include('/profile/menu', ctx, 'active=\'orders\''));r.push(" <div class=\"col-3-4\"> <div class=\"block corner-left-top-clip-sm\"> <div class=\"title\"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("orders.title");return r.join('');}), ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\" style=\"border: none; padding: 0\"> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'orders.filter.created.start.change', value: await h.__gv('filter.period_s', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> <div class=\"block_caption\"> ");r.push(await h('datetimepicker', {type: 'datetime', placeholder: 'bases.table.created', onchange: 'orders.filter.created.end.change', value: await h.__gv('filter.period_e', ctx)}, (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> <!-- <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'true', placeholder: 'bases.table.status', name: 'status', value: await h.__gv('filter.status', ctx), onset: await h.__gv('status_set', ctx), onsuggest: await h.__gv('status_suggest', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> --> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('orders.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"contents contents_inner_manage_base_page\" handler=\"controllers/profile/orders/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th>ID</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.created");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("orders.table.amount");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("bases.table.status");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("orders.table.count");return r.join('');}), ctx));r.push("</th> <th colspan=\"1\">");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <tr> <td colspan=\"100%\"> <div class=\"loader\"> <span></span> <span></span> <span></span> </div> </td> </tr> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
views_cache['/admin/bases/cards/list.mst'] = async (ctx, h) => {let r = [];r.push(await h.include('layouts/areas/header', ctx));r.push(" <section> <div class=\"container\"> <div class=\"block corner-left-top-clip-sm manage_base_page_corner_left_top_clip_sm\"> <div class=\"title \"> <div class=\"block-number corner-left-top-right-bottom-clip-xs\"> <span>01</span> </div> <div class=\"block-caption block_caption panel_seller_h2\"> <h2>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("cards.caption");return r.join('');}), ctx));r.push(" ");r.push(await h.__gv('filter.base_id', ctx));r.push("</h2> <span> <img src=\"/assets/img/box-arrow-right-top.svg\" alt=\"\"> </span> </div> </div> <div class=\"withdrawal_texts manage_bases_html manage_base_section_meyn_div manage_base_section_meyn_div_res\"> <div class=\"meyn_div\"> <div class=\"title\"> <div class=\"block_caption\"> ");r.push(await h('filter_autocomplete', {multiple: 'true', placeholder: 'bases.table.status', name: 'status', value: await h.__gv('filter.status', ctx), onset: await h.__gv('status_set', ctx), onsuggest: await h.__gv('status_suggest', ctx), min: 0, onchange: await h.__gv('filter_change', ctx)}, (async (ctx, prev_ctx) => {let r = [];r.push(" ");return r.join('');}), ctx));r.push(" </div> </div> <div class=\"buttons manage_button manage_base_page_button\"> <button type=\"button\" class=\"bordered col-1-1\" onclick=\"___mc.events.push('admin.bases.cards.filter.filter', this)\"> ");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("buttons.search");return r.join('');}), ctx));r.push(" </button> </div> </div> <div class=\"col-1-5 responsive_off_coriner responsive_off_coriner_\"> <div class=\"corner-right-top-clip-sm media_off space-wrapper\"> <div class=\"placeholder striped\"></div> </div> </div> </div> <div class=\"contents contents_inner_manage_base_page\" data-base-id=\"");r.push(await h.__gv('filter.base_id', ctx));r.push("\" handler=\"controllers/admin/bases/cards/handler\"> <div class=\"contents-inner contents_inner_\"> <div class=\"table-container withdraw_req_page_table_container manage_bases_page_table_container\"> <table> <thead> <tr> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.bin");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.expire");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.brand");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.type");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.category");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.country");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.issuer");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.base");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("shop.cvv.table.price");return r.join('');}), ctx));r.push("</th> <th>");r.push(await h('i18n', [], (async (ctx, prev_ctx) => {let r = [];r.push("table.action");return r.join('');}), ctx));r.push("</th> </tr> </thead> <tbody> <td colspan=\"11\"> <div class=\"loader\"> <span></span> <span></span> <span></span> <span></span> </div> </td> </tbody> </table> </div> <div class=\"line-with-triangle\"> <div></div> <div></div> <div></div> </div> <div class=\"corner-left-bottom-clip-sm space-wrapper margin-top\"> <div class=\"placeholder striped flex flex-justify-center\"> ");r.push(await h('pagination', [], (async (ctx, prev_ctx) => {let r = [];return r.join('');}), ctx));r.push(" </div> </div> </div> </div> </div> </div> </section>");return r.join('')}
