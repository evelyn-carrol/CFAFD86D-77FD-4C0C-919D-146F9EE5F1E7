define(['microcore', 'mst!/login/auth'],
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
});
