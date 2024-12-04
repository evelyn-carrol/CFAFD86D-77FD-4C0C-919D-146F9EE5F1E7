define([
  'microcore',
  'mst!layouts/components/autocomplete',
  'app/modules/suggests',
], function (mc, autocomplete_view) {
  return async (params) => {
    let data = params;
    data.id = 'autocomplete_' + Math.round(Math.random() * 1000000);

    let wait_load = setInterval(async () => {
      let $autocomplete = $('#' + data.id);
      if ($autocomplete.length) {
        clearInterval(wait_load);
        let debounce_timer = null;

        function update(value) {
          let min_length = data.min != null ? data.min : 3;

          if (value.length >= min_length) {
            clearTimeout(debounce_timer);
            debounce_timer = setTimeout(async () => {
              if (value != data.option) {
                delete data.value;
              }

              let options = [];
              if (typeof data.onsuggest == 'function') {
                options = await data.onsuggest(value);
              } else if (typeof data.onsuggest == 'string') {
                options = await mc.events.push(data.onsuggest, value);
              } else if (data.items?.length) {
                  for (let i in data.items) {
                      let item = data.items[i];
                      if (item.option && item.value){
                          options.push(item);
                      }
                  }
              }

              $autocomplete.find('.options').html('');

              if (options.length) {
                for (let i in options) {
                  let item = options[i];
                  $autocomplete
                    .find('.options')
                    .append(
                      '<li data-value="' +
                        item.value +
                        '"' +
                        (data.value === item.value ? ' class="selected"' : '') +
                        '>' +
                        item.option +
                        '</li>'
                    );
                }
              } else {
                $autocomplete
                  .find('.options')
                  .append(`<li class="empty">${mc.i18n('table.empty')}</li>`);
              }
            }, data.debounce || 300);
          }
        }

        $autocomplete
          .find('input')
          .on('focus', () => {
            update('');
            $autocomplete.addClass('open');
          })
          .on('blur', () => {
            setTimeout(() => {
              $autocomplete.removeClass('open');
              if ($autocomplete.find('input').val() === '') {
                delete data.value;
                data.option = '';
                select();
              }
            }, 300);
          })
          .on('keyup', function () {
            update(this.value);
          });

        if (data.value) {
          if (typeof data.onset == 'function') {
            let selected = await data.onset(data.value);
            if (selected) {
              $autocomplete.find('input').val(selected.option);
              $autocomplete.find('input')[0].dataset.value = selected.value;
              $autocomplete.find('.options').html('');
              $autocomplete
                .find('.options')
                .append(
                  '<li data-value="' +
                    selected.value +
                    '" class="selected">' +
                    selected.option +
                    '</li>'
                );
            }
          } else if (typeof data.onset == 'string') {
            mc.events.push(data.onset, data.value);
          }
        } else {
          update('');
        }

        function select(selected) {
          $autocomplete.find('input').val(data.option);
          if (data.value) {
            $autocomplete.find('input')[0].dataset.value = data.value;
          } else {
            delete $autocomplete.find('input')[0].dataset.value;
          }

          $autocomplete.find('.options li').removeClass('selected');
          if (selected) {
            $(selected).addClass('selected');
          }

          if (typeof data.onchange == 'function') {
            data.onchange(data);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, data);
          }
        }

        $autocomplete.find('.options').on('click', (e) => {
          if (e.target.nodeName === 'LI' && !$(e.target).hasClass('empty')) {
            data.option = e.target.innerText;
            data.value = e.target.dataset.value;
            select(e.target);
          }
        });

        $autocomplete.find('.mdi-close.clear').on('click', (e) => {
          delete data.value;
          data.option = '';
          select();
          update('');
        });
      }
    }, 300);

    return await autocomplete_view(data);
  };
});
