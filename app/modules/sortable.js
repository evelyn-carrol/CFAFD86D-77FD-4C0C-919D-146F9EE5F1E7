define(['microcore'], function (mc) {
  function getDragAfterElement(container, draggables, y) {
    return draggables.reduce(
      (closest, child) => {
        if (
          !$(child).hasClass('.dragging') &&
          $(child).closest('*[data-sortable-container]')[0] === container
        ) {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
          }
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  function initDraggable(draggable, $scope, $params) {
    $(draggable).attr('draggable', true);
    draggable.addEventListener('dragstart', () => {
      draggable.classList.add('dragging');
    });

    draggable.addEventListener('dragend', () => {
      if (typeof $params.sortableOnchange == 'function') {
        $params.sortableOnchange(draggable);
      } else {
        mc.events.push($params.sortableOnchange, {
          el: draggable,
          ordered: $($scope)
            .find('*[data-sortable-item]')
            .map((item) => {
              return item.dataset.id;
            }),
        });
      }
      draggable.classList.remove('dragging');
    });
  }

  return async ($scope, $params) => {
    let draggables = $($scope).find('*[data-sortable-item]');
    let container = $($scope).find('*[data-sortable-container]')[0] || $scope;

    let observer = new MutationObserver((mutationRecords) => {
      draggables = $($scope).find('*[data-sortable-item]');
      draggables.forEach((draggable) => {
        initDraggable(draggable, $scope, $params);
      });
    });

    observer.observe($scope, {
      childList: true,
      subtree: true,
    });

    draggables.forEach((draggable) => {
      initDraggable(draggable, $scope, $params);
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      let draggable = $('.dragging')[0];
      let container = draggable.closest('*[data-sortable-container]');
      let last = $(container).find('*[data-sortable-item]')[
        $(container).find('*[data-sortable-item]').length - 1
      ];
      let afterElement = getDragAfterElement(container, draggables, e.clientY);
      if (afterElement == null) {
        last.after(draggable);
      } else {
        afterElement.before(draggable);
      }
    });
  };
});
