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