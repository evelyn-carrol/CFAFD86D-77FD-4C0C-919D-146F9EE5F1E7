define(['microcore', 'mst!layouts/components/datetimepicker'], function (
  mc,
  datetimepicker_view
) {
  return async (params) => {
    let data = params;
    data.id = 'datetimepicker_' + Math.round(Math.random() * 1000000);
    data.label
      ? (data.label = mc.i18n(data.label))
      : false;
    if (data.type === 'period') {
      if (data.value) {
        let start = data.value.split(' - ')[0];
        let end = data.value.split(' - ')[1];
        data.period = {
          start: new Date(
            start.split('-')[0],
            +start.split('-')[1] - 1,
            start.split('-')[2]
          ),
          end: new Date(
            end.split('-')[0],
            +end.split('-')[1] - 1,
            end.split('-')[2]
          ),
        };
        setInputVal();
      }
    }

    if (data.placeholder) {
      data.placeholder = mc.i18n(data.placeholder) || data.placeholder;
    } else {
      data.placeholder = '';
    }

    function setInputVal(input) {
      data.value = `${data.period.start.getFullYear()}-${
        data.period.start.getMonth() + 1 < 10
          ? '0' + (data.period.start.getMonth() + 1)
          : data.period.start.getMonth() + 1
      }-${
        data.period.start.getDate() < 10
          ? '0' + data.period.start.getDate()
          : data.period.start.getDate()
      } - ${data.period.end.getFullYear()}-${
        data.period.end.getMonth() + 1 < 10
          ? '0' + (data.period.end.getMonth() + 1)
          : data.period.end.getMonth() + 1
      }-${
        data.period.end.getDate() < 10
          ? '0' + data.period.end.getDate()
          : data.period.end.getDate()
      }`;
      input ? $(input).val(data.value) : void 0;
    }

    let wait_load = setInterval(() => {
      let $datetimepicker = $('#' + data.id);
      if ($datetimepicker.length) {
        clearInterval(wait_load);

        $(document).on('click', (e) => {
          if (!$(e.target).closest('.datetimepicker, .calendar-list')) {
            $($datetimepicker.find('div')[0]).addClass('hide');
          }
        });

        $($datetimepicker.find('button')[0]).on('click', (e) => {
          e.preventDefault();
          if (data.type !== 'period') {
            let button = $('#' + data.id).find('.datetimepicker-inner button');

            if (data.type === 'date') {
              data.value =
                $(button)[0].dataset.year +
                '-' +
                $(button)[0].dataset.month +
                '-' +
                $(button)[0].dataset.day;
            } else if (data.type === 'time') {
              data.value =
                $(button)[0].dataset.hours +
                ':' +
                $(button)[0].dataset.minutes +
                ':' +
                $(button)[0].dataset.seconds;
            } else {
              data.value =
                $(button)[0].dataset.year +
                '-' +
                $(button)[0].dataset.month +
                '-' +
                $(button)[0].dataset.day +
                ' ' +
                $(button)[0].dataset.hours +
                ':' +
                $(button)[0].dataset.minutes +
                ':' +
                $(button)[0].dataset.seconds;
            }
          } else {
            const period = $(`#${data.id}`).find('.dateplugin')[0].period;

            if (period) {
              data.period = {
                start: period.start,
                end: period.end,
              };
            } else {
              data.period = {
                start: new Date(),
                end: new Date(),
              };
              data.period.start.setHours(0, 0, 0);
              data.period.end.setHours(23, 59, 59);
            }
            setInputVal($datetimepicker.find('input'));
          }

          if (typeof data.onchange == 'function') {
            data.onchange(data);
          } else if (typeof data.onchange == 'string') {
            mc.events.push(data.onchange, data);
          }

          $($datetimepicker.find('input')[0]).val(data.value);
          $($datetimepicker.find('div')[0]).addClass('hide');
          $($datetimepicker.find('.clear')[0]).removeClass('hide');
        });

        $($datetimepicker.find('.clear')[0]).on('click', (e) => {
          let input = $($datetimepicker.find('input')[0]);
          if (!input[0].hasAttribute('disabled')) {
            input.val('');
            data.value = '';
            data.period = false;
            // $(`#${data.id}`).find('.dateplugin')[0].period = false;

            e.target.classList.add('hide');

            if (typeof data.onchange == 'function') {
              data.onchange(data);
            } else if (typeof data.onchange == 'string') {
              mc.events.push(data.onchange, data);
            }
          }
        });

        $($datetimepicker.find('input')[0])
          .on('focus', () => {
            $('.datetimepicker > span > div').addClass('hide');
            $($datetimepicker.find('div')[0]).removeClass('hide');
          })
          .on('keyup', function (event) {
            $($datetimepicker.find('.clear')[0]).removeClass('hide');
            if (data.type === 'date') {
              if (this.value.match(/\d{4}-\d{1,2}-\d{1,2}/)) {
                let date = this.value.split('-');
                $datetimepicker.find('.dateplugin')[0].dispatchEvent(
                  new CustomEvent('setDate', {
                    detail: new Date(date[0], date[1] - 1, date[2]),
                  })
                );
              }
            } else if (data.type === 'time') {
              if (this.value.match(/\d{1,2}:\d{1,2}:\d{1,2}/)) {
                let time = this.value.split(':');
                $datetimepicker
                  .find('.timeplugin')[0]
                  .dispatchEvent(new CustomEvent('setTime', { detail: time }));
              }
            } else {
              if (
                this.value.match(
                  /\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}/
                )
              ) {
                let date_time = this.value.split(' '),
                  date = date_time[0].split('-'),
                  time = date_time[1].split(':');
                $datetimepicker.find('.dateplugin')[0].dispatchEvent(
                  new CustomEvent('setDate', {
                    detail: new Date(date[0], date[1] - 1, date[2]),
                  })
                );
                $datetimepicker
                  .find('.timeplugin')[0]
                  .dispatchEvent(new CustomEvent('setTime', { detail: time }));
              }
            }
            // if (event.key === 'Enter') {
            //   const filter = mc.router.hash();
            //   filter.period = this.value;
            //   mc.router.go(mc.router.hash(filter));
            // }
          });
      }
    }, 300);

    return await datetimepicker_view(data);
  };
});
