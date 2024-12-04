define(['microcore', 'mst!layouts/components/tooltip'], function (
  mc,
  tooltip_view
) {
  return async (params, value, ctx) => {
    let inner_view = await value(ctx);
    let id = 'tooltip_' + Math.round(Math.random() * 1000000);
    let data = { id: id, content: inner_view };

    let wait_load = setInterval(() => {
      let $tooltip = $('#' + id);
      if ($tooltip.length) {
        clearInterval(wait_load);
      }
      let bounding = $tooltip.find('.content')[0].getBoundingClientRect();

      if (bounding.top < 0) {
        // Top is out of viewport
      }

      if (bounding.left < 0) {
        // Left side is out of viewoprt
        $tooltip.addClass('left');
      }

      if (
        bounding.bottom >
        (window.innerHeight || document.documentElement.clientHeight)
      ) {
        // Bottom is out of viewport
      }

      if (
        bounding.right >
        (window.innerWidth || document.documentElement.clientWidth)
      ) {
        // Right side is out of viewport
        $tooltip.addClass('right');
      }
    }, 1000);
    return await tooltip_view(data);
  };
});
