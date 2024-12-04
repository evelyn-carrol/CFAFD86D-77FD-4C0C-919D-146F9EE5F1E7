define(['microcore'], function (mc) {
  return (params) => {
    const order = params.order || false;
    if (order) {
      const id = 'sort-arrow_' + Math.round(Math.random() * 1000000);

      const eventName = params.event || 'filter.order';
      const label = params.label || '';
      const orderKey = params.orderKey || 'order';

      const filter = mc.router.hash();

      const DESC = 'DESC';
      const ASC = 'ASC';

      filter.direction = filter.direction || DESC;
      filter.order = order;

      let isActive = filter[orderKey] == order;

      const isASC = () => isActive && filter.direction == DESC;

      const direction = () => (isActive ? (isASC() ? DESC : ASC) : DESC);

      const icon = () => (isASC() ? 'mdi-chevron-up ' : 'mdi-chevron-down');

      const classes = () =>
        'pointer mdi ' + (isActive ? 'active ' : '') + icon();

      let wait_load = setInterval(() => {
        let $component = $(`#${id}`);
        if ($component.length) {
          clearInterval(wait_load);
          const $arrow = $component.find('.pointer');
          $arrow.on('click', () => {
            isActive = true;
            filter.direction = isASC() ? ASC : DESC;
            $arrow[0].className = classes();
            window.history.pushState({}, '', mc.router.hash(filter));
            mc.events.push(eventName, {
              order,
              direction: direction(),
            });
          });
        }
      }, 300);

      return `
          <div id='${id}' class='nowrap sort-arrow-wrapper'>
            ${label}
            <span class="${classes()}"></span>
          </div>
          `;
    }
  };
});
