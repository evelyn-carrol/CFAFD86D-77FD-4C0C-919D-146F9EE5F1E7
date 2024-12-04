define(['microcore', 'mst!layouts/components/timeplugin'], function (
  mc,
  time_view
) {
  return async (params) => {
    function update($time) {
      let button = $('#' + data.id)
          .closest('.datetimepicker-inner')
          .find('button'),
        hours = $($time.find('.timepicker-hours')[0]).val(),
        minutes = $($time.find('.timepicker-minutes')[0]).val(),
        seconds = $($time.find('.timepicker-seconds')[0]).val();

      if (Number(hours) < 10) {
        hours = '0' + Number(hours);
      }
      if (Number(minutes) < 10) {
        minutes = '0' + Number(minutes);
      }
      if (Number(seconds) < 10) {
        seconds = '0' + Number(seconds);
      }
      $(button)[0].dataset.hours = hours;
      $(button)[0].dataset.minutes = minutes;
      $(button)[0].dataset.seconds = seconds;
    }
    function set($time, time) {
      $($time.find('.timepicker-hours')[0]).val(time[0]);
      $($time.find('.timepicker-minutes')[0]).val(time[1]);
      $($time.find('.timepicker-seconds')[0]).val(time[2]);
    }

    let data = params,
      time = ['12', '00', '00'];
    data.id = 'timeplugin_' + Math.round(Math.random() * 1000000);

    if (data.type === 'datetime') {
      if (
        data.value &&
        data.value.match(/\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}/)
      ) {
        let date_time = data.value.split(' '),
          date = date_time[0].split('-');
        time = date_time[1].split(':');
      }
    } else if (data.type === 'time') {
      if (data.value && data.value.match(/\d{1,2}:\d{1,2}:\d{1,2}/)) {
        time = data.value.split(':');
      } else {
        let date = new Date();
        time[0] = date.getHours();
        time[1] = date.getMinutes();
        time[2] = '00';
      }
    } else {
      let date = new Date();
      time[0] = date.getHours();
      time[1] = date.getMinutes();
      time[2] = '00';
    }

    let wait_load = setInterval(() => {
      let $time = $('#' + data.id);
      if ($time.length) {
        clearInterval(wait_load);
        set($time, time);
        update($time);

        $($time.find('input[type=number]')).on('change', (e) => {
          update($time);
        });

        $time.on('setTime', function (e) {
          set($time, e.detail);
          update($time);
        });
      }
    }, 300);

    return await time_view(data);
  };
});
