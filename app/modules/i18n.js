define(['microcore'], async function (mc) {
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
});
