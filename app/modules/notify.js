define(['microcore', 'mst!layouts/components/notify'], function (
  mc,
  notify_view
) {
  return async function (level, title, text) {
    let id = 'notify_' + Math.round(Math.random() * 1000000);
    let $notify = $(
      await notify_view({
        level: level,
        title: title,
        text: text,
        id: id,
      })
    );
    let posY = '20px';
    let slideBack = setTimeout(function () {
      $(document.body)
        .find('.notify#' + id)
        .css('right', '-500px');
    }, 5000);

    let remove = setTimeout(function () {
      $(document.body)
        .find('.notify#' + id)
        .remove();
    }, 6000);

    if ($(document.body).find('.notify').length) {
      const last = $(document.body).find('.notify')[
        $(document.body).find('.notify').length - 1
      ];
      let pos = last.getBoundingClientRect().top + last.offsetHeight - 50;
      if (pos + last.offsetHeight > window.innerHeight) {
        $(document.body)
          .find('.notify')
          .forEach((e) => {
            e.style.top = `${+e.style.top.split('px')[0] - e.offsetHeight}px`;
          });
        pos -= last.offsetHeight;
      }
      posY = `${pos}px`;
    }
    $(document.body).append($notify);
    $(document.body)
      .find('.notify#' + id)
      .css('top', posY);

    setTimeout(function () {
      $(document.body)
        .find('.notify#' + id)
        .css('right', '10px');
    }, 100);

    $(document.body)
      .find('.notify#' + id)
      .on('click', function () {
        $(this).remove();
      });

    $(document.body)
      .find('.notify#' + id)
      .on('mouseenter', function () {
        clearTimeout(slideBack);
        clearTimeout(remove);
      });

    $(document.body)
      .find('.notify#' + id)
      .on('touchstart', function (e) {
        e.preventDefault();
        clearTimeout(slideBack);
        clearTimeout(remove);
      });

    $(document.body)
      .find('.notify#' + id)
      .on('mouseleave', function () {
        $(document.body)
          .find('.notify#' + id)
          .css('right', '-500px');
        setTimeout(function () {
          $(document.body)
            .find('.notify#' + id)
            .remove();
        }, 2000);
      });

    $(document.body)
      .find('.notify#' + id)
      .on('touchend', function () {
        $(document.body)
          .find('.notify#' + id)
          .css('right', '-500px');
        setTimeout(function () {
          $(document.body)
            .find('.notify#' + id)
            .remove();
        }, 2000);
      });
  };
});
