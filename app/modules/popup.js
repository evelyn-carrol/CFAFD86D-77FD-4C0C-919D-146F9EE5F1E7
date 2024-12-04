define(['microcore', 'mst!layouts/components/popup'], function (
  mc,
  popup_view
) {
  return async function (view, data) {
    let id = 'popup_' + Math.round(Math.random() * 1000000);
    let $popup = $(
      await popup_view({
        id: id,
        content: await view(data),
      })
    );

    $popup.find('.popup-close').on('click', function () {
      $('body > main > article')
        .find('.popup#' + id)
        .closest('.popup-wrapper')
        .remove();
      mc.events.push('popup.closed');
    });

    $('body > main > article').append($popup);

    return new Promise((resolve, reject) => {
      resolve(
        $('body > main > article')
          .find('.popup#' + id)
          .closest('.popup-wrapper')
      );
    });
  };
});
