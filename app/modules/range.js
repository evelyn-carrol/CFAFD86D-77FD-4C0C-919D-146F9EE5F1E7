define(['microcore', 'mst!layouts/components/range'], function (
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
});
