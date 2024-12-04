define(['microcore', 'mst!layouts/components/checkbox', 'utilities'], function (
  mc,
  template,
  scripts
) {
  return async (params) => {
    let data = { ...params };

    data.id = 'checkbox_' + Math.round(Math.random() * 1000000);

    data.label = mc.i18n(data.label) || data.label || false;

    let wait_load = setInterval(async () => {
      const $component = $(`#${data.id}`);
      if ($component.length) {
        clearInterval(wait_load);
        const $checkbox = $component.find('input');

        const getValue = () => $checkbox[0].checked;

        const onChange = () => {
          if (data.onchange) {
            if (typeof data.onchange == 'function') {
              data.onchange(getValue());
            } else if (typeof data.onchange == 'string') {
              mc.events.push(data.onchange, getValue());
            }
          }
        };

        $checkbox.on('change', onChange);
      }
    }, 300);

    return await template(data);
  };
});
