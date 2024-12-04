define([
  'microcore',
  'mst!layouts/components/seload',
  'mst!layouts/components/select_option',
], function (mc, select_view, select_option) {
  return async (params, value, ctx) => {
    let data = { ...params };
    data.total = data.params.limit + 1 || 11;

    data.id = 'select_' + Math.round(Math.random() * 1000000);
    delete data.params.__r;
    data.pattern ? delete data.pattern.__r : void 0;

    if (!data.pattern) {
      data.pattern = {
        option: 'name',
        value: 'id',
      };
    }

    if (!data.option) data.option = mc.i18n('select.default');

    if (!data.value) data.value = 'select';

    function updateHandler($select) {
      $select.find('.options li').on('click', (e) => {
        if (!$(e.target).hasClass('disabled')) {
          if ($(e.target).hasClass('selected')) {
            return;
          }
          $(e.target).addClass('disabled');
          data.value = e.target.dataset.value;
          data.option = e.target.innerText;
          // data.selected ? $select.find(`li`).removeClass('disabled', 'selected') : void 0
          if (typeof data.onchange == 'function') {
            data.onchange(data);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, data);
          }

          if (!data.multiple) {
            $select.find(`li`).removeClass('selected');
            $(e.target).removeClass('disabled');
            $select.find('li').forEach((option) => {
              if (option.dataset.value === data.value) {
                $(option).addClass('selected');
              }
            });

            $select.find('.option span')[0].innerText = data.option;
            $select.find('.option span')[0].dataset.value = data.value;
            $select.find('.option')[0].dataset.value = data.value;
            $select.find('.option')[0].dataset.option = data.option;
          }
        }
      });
    }

    function updateSelect($select, option, value) {
      mc.api.call(data.method, data.params).then((res) => {
        if (res && res.items && res.items.length) {
          const parent = $select.find('ul.options');
          parent.html('');
          // option ? data.option = option : void 0;
          // value ? data.value = value : void 0;
          !!option ? $select.find('.option>span').html(option) : void 0;
          !!value ? ($select.find('.option')[0].dataset.value = value) : void 0;
          (async () => {
            // parent.append(await select_option({option: mc.i18n('select.default'), value: 'select', disabled: false}))

            // parent.append(await select_option({option: !!option ? option : mc.i18n('select.default'), value: !!value ? value : 'select', disabled: !!data.required}))
            parent.append(
              await select_option({
                option: mc.i18n('select.default'),
                value: 'select',
                disabled: !!data.required,
              })
            );
            await addOptions($select, Array.from(res.items));
          })();
        }
      });
    }

    async function addOptions(select, options) {
      let appendItem = (item) => {
        $(select).find('.options').append(item);
      };
      if (Array.isArray(options)) {
        for (let i = 0; i < options.length; i++) {
          let item_data = {
            option: options[i][data.pattern.option],
            value: options[i][data.pattern.value],
          };
          if (data.selected && data.selected.length) {
            data.selected.find((item) => {
              if (item === item_data.value) {
                item_data.selected = true;
                return true;
              }
            });
          }
          let item = await select_option(item_data);
          appendItem(item);
        }
      } else {
        let item_data = {
          option: options[data.pattern.option],
          value: options[data.pattern.value],
        };
        if (data.selected && data.selected.length) {
          data.selected.find((item) => {
            if (item === options[data.pattern.value]) {
              item_data.selected = true;
              return true;
            }
          });
        }
        let item = await select_option(item_data);
        appendItem(item);
      }
      updateHandler(select);
      return true;
    }

    let wait_load = setInterval(() => {
      let $select = $('#' + data.id);
      let params = { ...data.params };
      if ($select.length) {
        $select[0].onchange = data.onchange;
        $select[0].updateSelect = (selected, option, value) => {
          selected ? (data.selected = selected) : void 0;
          data.params.offset = 0;
          data.total = data.params.limit + 1;
          params = { ...data.params };
          updateSelect($select, option, value);
        };
        $select[0].addOptions = async function (options) {
          return await addOptions($(this), options);
        };
        clearInterval(wait_load);

        $(document).on('click', (e) => {
          if (!$(e.target).closest('.select')) {
            $select.removeClass('open');
          }
        });

        $select.on('click', (e) => {
          $(`.select:not(#${data.id})`).removeClass('open');
          if ($select.hasClass('open') || $(e.target).closest('ul.options')) {
            $select.removeClass('open');
          } else {
            $select.addClass('open');
          }
        });

        const options = $select.find('ul.options');
        options.on('scroll', function () {
          if (
            options[0].scrollTop + options[0].clientHeight >=
            options[0].scrollHeight
          ) {
            params.offset += params.limit;

            if (data.total >= params.offset) {
              mc.api.call(data.method, params).then((res) => {
                if (res && res.items && res.items.length) {
                  data.total = res.total;
                  addOptions($select, Array.from(res.items));
                }
              });
            }
          }
        });

        updateSelect($select, data.option, data.value);
        //updateSelect($select, data.option);
      }
    }, 300);

    return await select_view({
      classlist: data.classlist,
      id: data.id,
      value: data.value,
    });
  };
});
