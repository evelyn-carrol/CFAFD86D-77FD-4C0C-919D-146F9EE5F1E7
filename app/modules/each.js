define(() => {
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
});
