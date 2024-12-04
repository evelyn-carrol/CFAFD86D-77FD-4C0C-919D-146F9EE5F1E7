define(['microcore', 'mst!layouts/components/dateplugin', 'utilities'], function (
  mc,
  date_view,
  scripts
) {
  let dayjs, $calendar, _type;

  const getRange = (first, second) =>
    `${first.format('YYYY-MM-DD')} - ${second.format('YYYY-MM-DD')}`;

  let months = [
      { name: mc.i18n('calendar.months.january'), days: 31 },
      { name: mc.i18n('calendar.months.february'), days: 28 },
      { name: mc.i18n('calendar.months.march'), days: 31 },
      { name: mc.i18n('calendar.months.april'), days: 30 },
      { name: mc.i18n('calendar.months.may'), days: 31 },
      { name: mc.i18n('calendar.months.june'), days: 30 },
      { name: mc.i18n('calendar.months.july'), days: 31 },
      { name: mc.i18n('calendar.months.august'), days: 31 },
      { name: mc.i18n('calendar.months.september'), days: 30 },
      { name: mc.i18n('calendar.months.october'), days: 31 },
      { name: mc.i18n('calendar.months.november'), days: 30 },
      { name: mc.i18n('calendar.months.december'), days: 31 },
    ],
    global_data = { d1: false, d2: false };

  function leapYear(year) {
    return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
  }

  function getDateData(id) {
    let data = {
      current: global_data.d2,
      start: global_data.d1,
      end: global_data.d2,
    };

    if (global_data.d1.getTime() > global_data.d2.getTime()) {
      data = {
        ...data,
        start: global_data.d2,
        end: global_data.d1,
      };
    }
    data.start.setHours(0, 0, 0);
    data.end.setHours(23, 59, 59);

    $(`#${id}`)[0].period = data;

    return data;
  }

  async function update(date, id) {
    let data = {
      id: id,
      years: [],
      months: [],
      days: [],
      period: {
        start: false,
        end: false,
      },
      type: _type
    };

    if (date instanceof Date) {
      let year = date.getFullYear();
      let month = date.getMonth();
      let day = date.getDate();

      for (let i = year - 1; i <= year + 1; i++) {
        data.years.push({ year: i, selected: i === year });
      }
      for (let i = month - 1; i <= month + 1; i++) {
        if (i < 0) {
          data.months.push({
            ordinal: 12 + i,
            month: months[12 + i].name,
            selected: i === month,
          });
        } else if (i > 11) {
          data.months.push({
            ordinal: i - 12,
            month: months[i - 12].name,
            selected: i === month,
          });
        } else {
          data.months.push({
            ordinal: i,
            month: months[i].name,
            selected: i === month,
          });
        }
      }

      let start_date = new Date();
      start_date.setFullYear(year);
      start_date.setMonth(month);
      start_date.setDate(1);
      let shift = start_date.getDay() - 1;

      if (shift < 0) {
        shift = 6;
      }

      if (month === 1 && leapYear(year)) {
        months[month].days = 29;
      } else if (month === 1) {
        months[month].days = 28;
      }

      for (let i = 1; i <= months[month].days + shift; i++) {
        if (i > shift) {
          data.days.push({ day: i - shift, selected: i - shift === day });
        } else {
          data.days.push({});
        }
      }

      $('#' + data.id).html($(await date_view(data))[0].firstChild.innerHTML);

      let button = $('#' + data.id)
          .closest('.datetimepicker-inner')
          .find('button'),
        month_num = Number(month) + 1;
      $(button)[0].dataset.year = year;
      $(button)[0].dataset.month = month_num < 10 ? '0' + month_num : month_num;
      $(button)[0].dataset.day = day < 10 ? '0' + day : day;
    } else if (typeof date === 'object') {
      const start = date.start;
      const end = date.end;
      const current = date.current;
      const year = current.getFullYear();
      const month = current.getMonth();
      for (let i = year - 1; i <= year + 1; i++) {
        data.years.push({ year: i, selected: i === year });
      }
      for (let i = month - 1; i <= month + 1; i++) {
        if (i < 0) {
          data.months.push({
            ordinal: 12 + i,
            month: months[12 + i].name,
            selected: i === month,
          });
        } else if (i > 11) {
          data.months.push({
            ordinal: i - 12,
            month: months[i - 12].name,
            selected: i === month,
          });
        } else {
          data.months.push({
            ordinal: i,
            month: months[i].name,
            selected: i === month,
          });
        }
      }

      let start_date = new Date();
      start_date.setFullYear(year);
      start_date.setMonth(month);
      start_date.setDate(1);
      let shift = start_date.getDay() - 1;

      if (shift < 0) {
        shift = 6;
      }

      if (month === 1 && leapYear(year)) {
        months[month].days = 29;
      } else if (month === 1) {
        months[month].days = 28;
      }

      for (let i = 1; i <= months[month].days + shift; i++) {
        if (i > shift) {
          let s = false;
          if (year >= start.getFullYear() && year <= end.getFullYear()) {
            if (month > start.getMonth() && month < end.getMonth()) {
              s = true;
            } else if (month === start.getMonth() && month !== end.getMonth()) {
              s = i - shift >= start.getDate();
            } else if (month === end.getMonth() && month !== start.getMonth()) {
              s = i - shift <= end.getDate();
            } else if (month === end.getMonth() && month === start.getMonth()) {
              if (year === start.getFullYear() && year === end.getFullYear()) {
                s = i - shift >= start.getDate() && i - shift <= end.getDate();
              } else if (
                year === start.getFullYear() &&
                year !== end.getFullYear()
              ) {
                s = i - shift >= start.getDate();
              } else if (
                year === end.getFullYear() &&
                year !== start.getFullYear()
              ) {
                s = i - shift <= end.getDate();
              }
            }
          }
          data.days.push({ day: i - shift, selected: s });
        } else {
          data.days.push({});
        }
      }

      $('#' + data.id).html($(await date_view(data))[0].firstChild.innerHTML);
    }

    dayjs.currentRangeDate = getRange(
      scripts.dayjs(
        global_data.d1 < global_data.d2 ? global_data.d1 : global_data.d2
      ),
      scripts.dayjs(
        global_data.d1 > global_data.d2 ? global_data.d1 : global_data.d2
      )
    );

    dayjs.rangeCurrentMonth = getRange(dayjs.startMonth, dayjs.today);
    dayjs.rangeToday = getRange(dayjs.today, dayjs.today);
    dayjs.rangeYesterday = getRange(dayjs.yesterday, dayjs.yesterday);
    dayjs.rangeWeek = getRange(dayjs.startWeek, dayjs.today);
    dayjs.rangeYear = getRange(dayjs.startYear, dayjs.today);
    $calendar.find('span.btn.round').removeClass('blue3');
    //console.log(dayjs.currentRangeDate);

    if ($('.datetimepicker').find('input')[0].value.length) {
      if (dayjs.currentRangeDate === dayjs.rangeCurrentMonth) {
        $calendar.find('span.btn.round.currentmonth').addClass('blue3');
      } else if (dayjs.currentRangeDate === dayjs.rangeYesterday) {
        $calendar.find('span.btn.round.yesterday').addClass('blue3');
      } else if (dayjs.currentRangeDate === dayjs.rangeToday) {
        $calendar.find('span.btn.round.today').addClass('blue3');
      } else if (dayjs.currentRangeDate === dayjs.rangeWeek) {
        $calendar.find('span.btn.round.sevendays').addClass('blue3');
      } else if (dayjs.currentRangeDate === dayjs.rangeYear) {
        $calendar.find('span.btn.round.currentyear').addClass('blue3');
      }
    }
    return $('#' + data.id);
  }

  return async (params) => {
    let data = params;
    _type = params.type;
    data.id = 'dateplugin_' + Math.round(Math.random() * 1000000);
    global_data = { d1: new Date(), d2: new Date() };
    if (params.type === 'period') {
      if (params.value) {
        let start = params.value.split(' - ')[0];
        let end = params.value.split(' - ')[1];
        global_data = {
          d1: new Date(
            start.split('-')[0],
            +start.split('-')[1] - 1,
            start.split('-')[2]
          ),
          d2: new Date(
            end.split('-')[0],
            +end.split('-')[1] - 1,
            end.split('-')[2]
          ),
        };
      }
    }
    if (data.type === 'date') {
      if (data.value && data.value.match(/\d{4}-\d{1,2}-\d{1,2}/)) {
        let date = data.value.split('-');
        data.value = new Date(date[0], date[1] - 1, date[2]);
      } else if (!(data.value instanceof Date)) {
        data.value = new Date();
      }
    } else if (data.type === 'datetime') {
      if (
        data.value &&
        data.value.match(/\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}/)
      ) {
        let date_time = data.value.split(' '),
          date = date_time[0].split('-'),
          time = date_time[1].split(':');
        data.value = new Date(
          date[0],
          date[1] - 1,
          date[2],
          time[0],
          time[1],
          time[2]
        );
      } else {
        data.value = new Date();
      }
    } else {
      data.value = new Date();
    }

    let wait_load = setInterval(() => {
      $calendar = $('#' + data.id);
      if ($calendar.length) {
        update(
          data.type === 'period' ? getDateData(data.id) : data.value,
          data.id
        );
        clearInterval(wait_load);

        const xToday = scripts.dayjs();
        dayjs = {
          currentYear: xToday.year(), // int
          currentMonth: xToday.month(), // int
          yesterday: xToday.add(-1, 'day'), // dayjs
          today: xToday, // dayjs
          daysInMonth: xToday.daysInMonth(), // int
          startWeek: xToday.add(-7, 'day'),
        };
        dayjs.startYear = scripts.dayjs(`${dayjs.currentYear}-01-01`);
        dayjs.startMonth = scripts.dayjs(
          `${dayjs.currentYear}-${dayjs.currentMonth + 1}-01`
        );
        $calendar
          .on('dblclick', (e) => {
            let $el = $(e.target);
            if (data.type === 'date') {
              if (e.target.nodeName === 'LI' && !$el.hasClass('selected')) {
                /* if ($el.closest('ul').hasClass('years')) {
                                 data.value.setFullYear($el[0].innerText)
                                 update(data.value, data.id)
                             } else if ($el.closest('ul').hasClass('months')) {
                                 data.value.setMonth($el[0].dataset.month);
                                 update(data.value, data.id)
                             } else */
                if ($el.closest('ul').hasClass('days')) {
                  data.value.setDate($el[0].innerText);
                  update(data.value, data.id);
                }
              }
              $($el)
                .closest('.datetimepicker')
                .find('.datetimepicker-selector > button')[0]
                .click();
            }
          })
          .on('click', async (e) => {
            let $el = $(e.target);

            function hoverHandler(e) {
              const target = $(e.target);
              const collection = target
                .closest('ul')
                .find('li:not([data-day=""])');
              let selected = [target[0]];
              $(collection).removeClass('selected');

              if (!target.hasClass('target')) {
                let start, end;
                for (let i = 0; i < collection.length; i++) {
                  if (
                    $(collection[i]).hasClass('target') ||
                    collection[i] === target[0]
                  ) {
                    !start ? (start = i + 1) : (end = i + 1);
                  }
                }
                selected = collection.slice(start - 1, end);
              }
              if (target[0].dataset.day) $(selected).addClass('selected');
            }

            if (data.type === 'period') {
              if (e.target.nodeName == 'LI') {
                if ($el.closest('ul').hasClass('years')) {
                  data.value.setFullYear($el[0].innerText);
                  $calendar = await update(data.value, data.id);
                  if ($calendar.hasClass('selecting')) {
                    let m = new Date();
                    m.setFullYear($el[0].innerText);
                    m.setMonth(
                      $calendar.find('.months .selected')[0].dataset.month
                    );
                    $calendar.find('.days li').removeClass('selected');
                    if (
                      global_data.d1.getFullYear() === m.getFullYear() &&
                      global_data.d1.getMonth() === m.getMonth()
                    ) {
                      $calendar
                        .find(`[data-day="${global_data.d1.getDate()}"]`)
                        .addClass('target selected');
                      $calendar
                        .find('ul.days li')
                        .on('mouseover', hoverHandler);
                    } else {
                      if (global_data.d1.getTime() > m.getTime()) {
                        $calendar
                          .find('.days li:last-child')
                          .addClass('target');
                        $calendar
                          .find('ul.days li')
                          .on('mouseover', hoverHandler);
                      }
                      if (m.getTime() > global_data.d1.getTime()) {
                        $calendar
                          .find('.days li[data-day="1"]')
                          .addClass('target');
                        $calendar
                          .find('ul.days li')
                          .on('mouseover', hoverHandler);
                      }
                    }
                  } else {
                    let period = $(`#${data.id}`)[0].period;
                    if (period) {
                      period.current = data.value;
                      update(period, data.id);
                    } else update(data.value, data.id);
                  }
                } else if ($el.closest('ul').hasClass('months')) {
                  data.value.setMonth($el[0].dataset.month);
                  $calendar = $('#' + data.id);
                  if ($calendar.hasClass('selecting')) {
                    $calendar = await update(data.value, data.id);
                    let m = new Date();
                    m.setMonth(e.target.dataset.month);
                    $calendar.find('.days li').removeClass('selected');
                    if (global_data.d1.getMonth() === m.getMonth()) {
                      $calendar
                        .find(`[data-day="${global_data.d1.getDate()}"]`)
                        .addClass('target selected');
                      $calendar
                        .find('ul.days li')
                        .on('mouseover', hoverHandler);
                    } else {
                      if (global_data.d1.getTime() > m.getTime()) {
                        $calendar
                          .find('.days li:last-child')
                          .addClass('target');
                        $calendar
                          .find('ul.days li')
                          .on('mouseover', hoverHandler);
                      }
                      if (m.getTime() > global_data.d1.getTime()) {
                        $calendar
                          .find('.days li[data-day="1"]')
                          .addClass('target');
                        $calendar
                          .find('ul.days li')
                          .on('mouseover', hoverHandler);
                      }
                    }
                  } else {
                    let period = $(`#${data.id}`)[0].period;
                    if (period) {
                      period.current = data.value;
                      update(period, data.id);
                    } else update(data.value, data.id);
                  }
                } else if ($el.closest('ul').hasClass('days')) {
                  if ($el[0].innerText !== '') {
                    $el.closest('ul').find('li').removeClass('selected');
                    $el.addClass('target selected');
                    $el.closest('.dateplugin').toggleClass('selecting');

                    if ($el.closest('.dateplugin').hasClass('selecting')) {
                      let d1 = new Date();
                      d1.setFullYear(
                        $calendar.find('.years li.selected')[0].innerText
                      );
                      d1.setMonth(
                        $calendar.find('.months li.selected')[0].dataset.month
                      );
                      d1.setDate($el[0].innerText);
                      global_data.d1 = d1;
                      $el
                        .closest('ul')
                        .find('li')
                        .on('mouseover', hoverHandler);
                    } else {
                      let d2 = new Date();
                      d2.setFullYear(
                        $calendar.find('.years li.selected')[0].innerText
                      );
                      d2.setMonth(
                        $calendar.find('.months li.selected')[0].dataset.month
                      );
                      d2.setDate($el[0].innerText);
                      global_data.d2 = d2;

                      await update(getDateData(data.id), data.id);
                      $('.datetimepicker-selector').find('button')[0].click();
                    }
                  }
                }
              } else if (e.target.nodeName == 'SPAN') {
                let today = new Date();
                if ($el.hasClass('today')) {
                  global_data.d1 = today;
                  global_data.d2 = today;
                  update(getDateData(data.id), data.id);

                  $('.datetimepicker-selector').find('button')[0].click();
                } else if ($el.hasClass('yesterday')) {
                  let yesterday = new Date(Date.now() - 86400 * 1000);
                  global_data.d1 = yesterday;
                  global_data.d2 = yesterday;

                  update(getDateData(data.id), data.id);
                  $('.datetimepicker-selector').find('button')[0].click();
                } else if ($el.hasClass('sevendays')) {
                  let sevendays = new Date(Date.now() - 86400 * 1000 * 7);
                  global_data.d1 = today;
                  global_data.d2 = sevendays;
                  update(getDateData(data.id), data.id);
                  $('.datetimepicker-selector').find('button')[0].click();
                } else if ($el.hasClass('currentmonth')) {
                  let currentmonth = new Date();
                  currentmonth.setDate(1);
                  global_data.d1 = today;
                  global_data.d2 = currentmonth;
                  update(getDateData(data.id), data.id);

                  $('.datetimepicker-selector').find('button')[0].click();
                } else if ($el.hasClass('currentyear')) {
                  let currentyear = new Date();
                  currentyear.setMonth(0);
                  currentyear.setDate(1);
                  global_data.d1 = today;
                  global_data.d2 = currentyear;
                  update(getDateData(data.id), data.id);
                  $('.datetimepicker-selector').find('button')[0].click();
                }
              }
            } else {
              if (e.target.nodeName == 'LI' && !$el.hasClass('selected')) {
                if ($el.closest('ul').hasClass('years')) {
                  data.value.setFullYear($el[0].innerText);
                  await update(data.value, data.id);
                } else if ($el.closest('ul').hasClass('months')) {
                  data.value.setMonth($el[0].dataset.month);
                  await update(data.value, data.id);
                } else if ($el.closest('ul').hasClass('days')) {
                  if ($el[0].innerText !== '') {
                    data.value.setDate($el[0].innerText);
                    await update(data.value, data.id);
                  }
                }
              } else if (e.target.nodeName == 'SPAN') {
                let today = new Date();
                if ($el.hasClass('today')) {
                  data.value.setFullYear(today.getFullYear());
                  data.value.setMonth(today.getMonth());
                  data.value.setDate(today.getDate());
                  update(data.value, data.id);
                } else if ($el.hasClass('yesterday')) {
                  let yesterday = new Date(Date.now() - 86400 * 1000);
                  data.value.setFullYear(yesterday.getFullYear());
                  data.value.setMonth(yesterday.getMonth());
                  data.value.setDate(yesterday.getDate());
                  update(data.value, data.id);
                } else if ($el.hasClass('sevendays')) {
                  let sevendays = new Date(Date.now() - 86400 * 1000 * 7);
                  data.value.setFullYear(sevendays.getFullYear());
                  data.value.setMonth(sevendays.getMonth());
                  data.value.setDate(sevendays.getDate());
                  update(data.value, data.id);
                } else if ($el.hasClass('currentmonth')) {
                  data.value.setFullYear(today.getFullYear());
                  data.value.setMonth(today.getMonth());
                  data.value.setDate(1);
                  update(data.value, data.id);
                } else if ($el.hasClass('currentyear')) {
                  data.value.setFullYear(today.getFullYear());
                  data.value.setMonth(0);
                  data.value.setDate(1);
                  update(data.value, data.id);
                }
              }
            }
          })
          .on('setDate', function (e) {
            data.value = e.detail;
            update(data.value, data.id);
          });
      }
    }, 300);

    return await date_view(data);
  };
});
