define(['microcore', 'mst!layouts/components/chip', 'utilities'], function (
  mc,
  chipTemplate,
  scripts
) {
  return async (params) => {
    let data = { ...params };

    data.id = 'chip_' + Math.round(Math.random() * 1000000);

    data.isCloseble = scripts.isFalse(data.isCloseble);

    data.filterId = data.filterId || false;

    const { value, filterId, isCloseble } = data;

    let wait_load = setInterval(async () => {
      const $component = $(`#${data.id}`);
      if ($component.length) {
        clearInterval(wait_load);

        if (isCloseble) {
          $component.forEach((item) =>
            $(item)
              .find(`[data-type='close']`)
              .on('click', () => {
                if (filterId) {
                  mc.events.push('filter_autocomplite.chip.close', {
                    value,
                    filterId,
                  });
                }
                $component.remove();
              })
          );
        }
      }
    }, 300);

    return await chipTemplate(data);
  };
});
