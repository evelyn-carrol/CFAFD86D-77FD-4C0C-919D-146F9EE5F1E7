define(['microcore', 'mst!/login/forgot'], function (mc, view) {
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
});
