define(['microcore', 'render', 'app/modules/notify'], async function (
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
});
