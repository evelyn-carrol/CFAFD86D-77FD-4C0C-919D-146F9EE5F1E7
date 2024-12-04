define(['microcore', 'mst!/login/register'],
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
});
