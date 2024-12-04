define(['microcore', 'mst!layouts/components/info', 'utilities'], function (
  mc,
  view,
  scripts
) {
  return async (params) => {
    let data = { ...params };

    data.id = 'info_' + Math.round(Math.random() * 1000000);
    data.color = data.color || 'light-blue--text';
    data.icon = data.icon || 'information-outline';
    data.width = data.width || '250';
    data.icon_size = data.icon_size || '18';
    data.left = +data.icon_size + 6;
    data.top = data.i && data.i < 3;

    let wait_load = setInterval(async () => {
      const $component = $(`#${data.id}`);

      if ($component.length) {
        clearInterval(wait_load);

        const $wrapper = $component.find('.info-wrapper');
        const $icon = $component.find('.mdi');

        let isOpen = false;
        let closeDelayTimer = null;
        let openDelayTimer = null;

        $icon.on('mouseenter', open);
        $icon.on('mouseleave', close);

        $wrapper.on('mouseenter', () => clearTimeout(closeDelayTimer));
        $wrapper.on('mouseleave', close);

        function open() {
          clearTimeout(closeDelayTimer);
          if (!isOpen) {
            openDelayTimer = setTimeout(() => {
              isOpen = true;
              $wrapper.removeClass('hide');
            }, 300);
          }
        }

        function close() {
          clearTimeout(openDelayTimer);
          if (isOpen) {
            closeDelayTimer = setTimeout(() => {
              isOpen = false;
              $wrapper.addClass('hide');
            }, 300);
          }
        }
      }
    }, 300);

    if (data.comment) {
      return await view(data);
    }
  };
});
