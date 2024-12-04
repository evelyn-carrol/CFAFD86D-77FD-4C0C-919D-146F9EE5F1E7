define([
  'microcore',
  'mst!layouts/components/filter_autocomplete',
  'app/modules/chip',
  'utilities',
  'app/modules/suggests',
], function (mc, filter_view, chipComponent, scripts) {
  return async (params) => {
    let data = params;

    data.id = 'filter_autocomplete_' + Math.round(Math.random() * 1000000);

    data.disabled = scripts.isTrue(data.disabled);
    data.multiple = scripts.isFalse(data.multiple);
    data.int = scripts.isTrue(data.int);
    data.filter = scripts.isFalse(data.filter);
    data.chip = scripts.isFalse(data.chip);
    data.full_data = scripts.isTrue(data.full_data);
    data.item_object =
      typeof data.item_object == 'function'
        ? data.item_object
        : (item) => ({ value: item.id, option: item.name });

    data.autocomplete = scripts.isFalse(data.autocomplete);

    data.filterSelector = data.filterSelector || '.filter-chips-line';

    if (data.value && typeof data.value != 'object') {
      data.value = [data.value];
    } else {
      data.value = data.value || [];
    }

    data.option = [];
    data.selected_object = [];
    let options = [];

    if (data.placeholder) {
      data.placeholder = mc.i18n(data.placeholder) || data.placeholder;
    } else {
      data.placeholder = '';
    }

    let wait_load = setInterval(async () => {
      const $filter_autocomplete = $('#' + data.id);
      if ($filter_autocomplete.length) {
        clearInterval(wait_load);

        $filter_autocomplete[0].actions = {
          select,
        };

        const $filter_input = $filter_autocomplete.find('input')[0];
        const $chips_wrapper = $filter_autocomplete.find(
          `.filter_autocomplete_tags`
        );

        $filter_input.dataset.value = data.value;

        let debounce_timer = null;

        const renderValue = () => {
          if (data.value.length) {
            data.value.forEach(async (value) => {
              let selected = '';

              if (typeof data.onset == 'function') {
                selected = await data.onset(value);
              } else if (typeof data.onset == 'string') {
                selected = mc.events.push(data.onset, value);
              } else if (data.items?.length) {
                selected = data.items.find((item) => item.value == value);
              }

              if (selected) {
                renderChips(selected);
              }
            });
          }
        };

        if (data.autocomplete) {
          renderValue();
          search('');
        } else {
          data.value.forEach((item) => {
            renderChips({
              value: item,
              option: item,
            });
          });
        }

        $filter_autocomplete.find('label').on('click', () => {
          $filter_input.focus();
        });

        $filter_autocomplete
          .find('.filter_autocomplete_input')
          .on('click', (event) => {
            if (event.target.nodeName !== 'SPAN') {
              $filter_input.focus();
            } else {
              const { value, option } = event.target.parentElement.dataset;
              select({ value, option, renderChip: false });
            }
          });

        $filter_autocomplete
          .find('input')
          .on('focus', () => {
            if (data.autocomplete) {
              $filter_autocomplete.addClass('open');
            }
          })
          .on('blur', () => {
            setTimeout(() => {
              if (data.autocomplete) {
                $filter_autocomplete.removeClass('open');
                $filter_input.value = '';
              }
            }, 300);
          })
          .on('keyup', function (event) {
            const value = $filter_input.value.trim();
            if (data.autocomplete) {
              search(value);
            } else {
              if (event.key === 'Enter') {
                if (value && !data.value.includes(value)) {
                  select({ value, option: value });
                }
              }
            }
          });

        function search(value) {
          let min_length = data.min != null ? data.min : 0;

          if (value.length >= min_length) {
            clearTimeout(debounce_timer);
            debounce_timer = setTimeout(async () => {
              options = data.items || [];

              if (data.onsuggest) {
                if (typeof data.onsuggest == 'function') {
                  options = await data.onsuggest(value);
                } else if (typeof data.onsuggest == 'string') {
                  options = await mc.events.push(data.onsuggest, value);
                }
              }

              if (data.full_data) {
                options = options.map((item) => ({
                  ...data.item_object(item),
                  item,
                }));
              }

              if (data.searchfunction) {
                options = data.searchfunction(options, value);
              }

              const $filter_autocomplete_options =
                $filter_autocomplete.find('.options');

              $filter_autocomplete_options.html('');

              if (options.length) {
                options.forEach((item) => {
                  item.option =
                    typeof item.option == 'string'
                      ? item.option.replaceAll('"', "'")
                      : item.option;
                  item.value =
                    typeof item.value == 'string'
                      ? item.value.replaceAll('"', "'")
                      : item.value;
                  const isSelected = !!data.value.find(
                    (val) => val == item.value
                  );
                  $filter_autocomplete_options.append(
                    `
                                        <li 
                                          data-value="${item.value}"
                                          data-option="${item.option}"
                                          ${
                                            isSelected
                                              ? ' class="selected"'
                                              : ''
                                          }
                                        >
                                          <div class='filter_autocomplete_checkbox'></div>
                                          <div>${item.option}</div>
                                        </li>
                                        `
                  );
                });

                $filter_autocomplete_options
                  .find('li')
                  .on('click', function () {
                    const element = $(this)[0];
                    if (
                      element.nodeName === 'LI' &&
                      !$(element).hasClass('empty')
                    ) {
                      const { value, option } = element.dataset;
                      select({ value, option });
                    }
                  });
              } else {
                $filter_autocomplete_options.append(
                  `<li class="empty">${mc.i18n('table.empty')}</li>`
                );
              }
            }, data.debounce || 300);
          }
        }

        function select({ value, option = '', renderChip = true }) {
          const listElement = $filter_autocomplete.find(
            `li[data-value="${value}"]`
          );
          const isSelected = data.value.find((item) => item == value);

          if (data.multiple) {
            if (isSelected) {
              if (listElement) {
                listElement.removeClass('selected');
              }
              data.value = data.value.filter((item) => item != value);
              data.option = data.option.filter((item) => item != option);
              data.selected_object = data.selected_object.filter(
                (item) => item.value != value
              );
            } else {
              data.value.push(value);
              data.option.push(option);
              data.selected_object.push(
                options.find((item) => item.value == value)
              );
              if (listElement) {
                listElement.addClass('selected');
              }
            }
          } else {
            $filter_autocomplete.find('li').removeClass('selected');
            if (isSelected) {
              data.value = [];
              data.option = [];
              data.selected_object = [];
            } else {
              data.value = [value];
              data.option = [option];
              data.selected_object = [
                options.find((item) => item.value == value),
              ];
              if (listElement) {
                listElement.addClass('selected');
              }
            }
          }

          if (renderChip) {
            renderChips({ value, option });
          }

          if ($filter_input.value) {
            $filter_input.value = '';
            search('');
          }

          $filter_input.dataset.value = data.value;

          const onchangeData = { ...data };
          if (!data.multiple) {
            onchangeData.value =
              data.int && data.value[0]
                ? parseInt(data.value[0])
                : data.value[0];
            onchangeData.option = data.option[0];
          } else {
            onchangeData.value = onchangeData.value.map((v) =>
              data.int ? parseInt(v) : v
            );
          }

          if (typeof data.onchange == 'function') {
            data.onchange(onchangeData);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, onchangeData);
          }
        }

        async function renderChips({ value, option }) {
          const {
            id: filterId,
            multiple,
            filter,
            filterSelector,
            disabled,
          } = data;
          const notActive = !$chips_wrapper.find(`[data-value="${value}"]`)
            .length;
          if (notActive) {
            if (!multiple) {
              if (filter) {
                $(filterSelector)
                  .find(`[data-filter-id="${filterId}"]`)
                  .remove();
              }
              $chips_wrapper.html('');
            }
            if (data.chip) {
              const chip = await chipComponent({
                value,
                option,
                filterId,
                isCloseble: !disabled,
              });
              $chips_wrapper.append(chip);
              if (filter) {
                if ($(filterSelector).length) {
                  $(filterSelector).append(chip);
                }
              }
            }
          } else {
            $(`[data-filter-id="${filterId}"][data-value="${value}"]`).remove();
          }
        }

        mc.events.on(
          'filter_autocomplite.chip.close',
          function ({ value, filterId }) {
            if (filterId == data.id && data.value.includes(value)) {
              select({ value, renderChip: false });
            }
          }
        );
      }
    }, 300);

    return await filter_view(data);
  };
});
