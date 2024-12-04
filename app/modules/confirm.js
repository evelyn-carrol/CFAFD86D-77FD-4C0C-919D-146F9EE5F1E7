define(['microcore', 'mst!layouts/components/confirm'], function (
  mc,
  confirm_view
) {
  return async function (title, text, callback) {
    let $confirm = $(
      await confirm_view({
        title: title,
        text: text,
      })
    );

    $confirm.find('a').on('click', function (e) {
      e.preventDefault();
      $(this).closest('.confirm').remove();

      if (this.dataset.answer == 'true') {
        callback();
      }
    });

    $(document.body)
      .append($confirm)
      .find('.confirm')
      .on('click', (e) => {
        if (!$(e.target).closest('.block'))
          $(e.target).closest('.confirm').remove();
      });
  };
});
