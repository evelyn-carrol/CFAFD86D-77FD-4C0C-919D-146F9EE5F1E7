define(['microcore'], function (mc) {
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
});
