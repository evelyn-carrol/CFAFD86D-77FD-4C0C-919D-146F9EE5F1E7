define(['microcore'], function (mc) {
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
});
