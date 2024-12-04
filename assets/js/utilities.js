define(['microcore', 'dayjs'], function (mc, dayjs) {
  const fmtDate = (dateStr) => {
    return dateStr.split('-').reverse().join('.');
  };

  const getPeriod = (start, end) => {
    return `${start.getFullYear()}-${
      start.getMonth() + 1 < 10
        ? '0' + (start.getMonth() + 1)
        : start.getMonth() + 1
    }-${
      start.getDate() < 10 ? '0' + start.getDate() : start.getDate()
    } - ${end.getFullYear()}-${
      end.getMonth() + 1 < 10 ? '0' + (end.getMonth() + 1) : end.getMonth() + 1
    }-${end.getDate() < 10 ? '0' + end.getDate() : end.getDate()}`;
  };

  const getFullList = async (
    name = '',
    params = {},
    offset = 0,
    limit = 100,
    array = []
  ) => {
    if (name) {
      const lists = await mc.api.call(name, { ...params, offset, limit });
      if (lists && lists?.items?.length) {
        array = [...array, ...lists.items];
        if (array.length < lists.total) {
          array = await getFullList(name, params, offset + limit, limit, array);
        }
      }
      return array;
    } else {
      console.error('Set the method');
    }
  };

  const parsePhoneOrString = (value) => {
    if (!value) {
      return {};
    }
    const [match, phone, string] = value.match(
      /^([\+]?[7|8][\s]?[(]?[\d]{0,3}[)]?[-\s]?[\d]{0,3}[-\s]?[\d]{0,2}[\s\-]?[\d]{0,2})?(.*)$/
    );
    return { match, phone, string };
  };

  const onlyDigits = (value) => {
    if (value) {
      const digits = value.replace(/[^\d]/g, '');
      if (digits.startsWith(8)) {
        return digits.replace(8, 7);
      }
      return digits;
    }
    return '';
  };

  const mask = (value, mask = '+X (XXX) XXX-XX-XX') => {
    let new_value = mask;
    let new_value_array = value.split('');
    if (new_value_array.length) {
      new_value_array.forEach((digit, i) => {
        new_value = new_value.replace('X', digit);
        if (i === new_value_array.length - 1) {
          new_value = new_value.slice(0, new_value.lastIndexOf(digit) + 1);
        }
      });
    } else {
      new_value = '';
    }
    return new_value;
  };

  const copyToBuffer = (
    value,
    elem = null,
    success = () => {},
    error = () => {}
  ) => {
    if (location.protocol != 'https:') {
      let input = $(elem).find('input');

      if (!input.length) {
        const newElement = document.createElement('input');
        newElement.style.height = 0;
        newElement.style.padding = 0;
        newElement.style.border = 0;
        newElement.style.position = 'absolute';
        $(elem).append(newElement);
        input = $(elem).find('input');
      }
      input[0].value = value;
      input[0].focus();
      input[0].select();
      try {
        document.execCommand('copy');
        success();
      } catch (err) {
        error(err);
      }
    } else {
      navigator.clipboard
        .writeText(value)
        .then(() => {
          success();
        })
        .catch((err) => {
          error(err);
        });
    }
  };

  return {
    dayjs,
    getDaysFromPeriod: (period = '') => {
      if (period.length == 23) {
        let dates = period.split(' - ');
        const date = new Date(dates[1]) - new Date(dates[0]);
        return date / (1000 * 60 * 60 * 24) || 1;
      }
      return 0;
    },
    getListDatesFromPeriod: (period, days, locales) => {
      const createDate = (year, month, day) => {
        return new Date (year, month, day)
          .toLocaleString(locales, {year:'numeric', month:'numeric', day: 'numeric'})
      }

      let list = [];
      const [periodStart, periodEnd] = period.split(' - ')
      const [year, month, day] = periodStart.split('-')

      if (days <= 9) {
        for (let i = 0; i <= days; i++) {
          list.push(createDate(year, +month-1, +day+i))
        }
      } else if (days > 9 && days < 60) {
        for (let i = 0; i <= days/7; i++) {
          list.push(createDate(year, +month-1, +day + 7 * i))
        }
      } else if (days >= 60) {
        let calcDays = 0, i = 0;

        while (calcDays <= days) {
          list.push(
            new Date (year, +month - 1 + 1 * i, day)
              .toLocaleString(locales, {year:'numeric', month:'numeric'})
          )
          i++;
          calcDays += 32 - new Date(2022, +month - 1 + 1 * i, 32).getDate()
        }
      }

      return list;
    },
    getPeriodFromString: (str, days = 7) => {
      const format = (s, e) => `${s.format('YYYY-MM-DD')} - ${e.format('YYYY-MM-DD')}`;
      const start = dayjs(str);

      if (/^\d{4}\.\d{1,2}$/.test(str) || /^\d{4}-\d{1,2}$/.test(str)) {
        return format(start, start.endOf('month'));
      } else if (str.length == 10 && days > 10) {
        return format(start, start.add(6, 'day'));
      } else {
        return format(start, start);
      }
    },
    copyToBuffer,
    parsePhoneOrString,
    onlyDigits,
    filterMask: (value) => {
      if (value) {
        const { phone, string } = parsePhoneOrString(value);
        if (phone && !string) {
          const digits = onlyDigits(phone);
          if (digits.length == 11) {
            return mask(digits);
          }
        }
        return value;
      }
      return '';
    },
    mask,
    multipleFilter: (filters) => {
      for (const name in filters) {
        if (Object.hasOwnProperty.call(filters, name)) {
          const filter = filters[name];
          if (!filter) {
            delete filters[name];
          }
        }
      }
      // multiple.forEach((name)=>{
      //   if(filters[name]){
      //       filters[name] = filters[name].split(',');
      //       if(mustBeInt.includes(name)){
      //           filters[name] = filters[name].map(i=>parseInt(i))
      //       }
      //   }
      // })
      return filters;
    },
    getStringFromI18n: (str) => {
      if (str) {
        return mc.i18n(str) || str;
      } else {
        return '';
      }
    },
    getFullList,
    isTrue: (value) => {
      return value === 'true' || value === true ? true : false;
    },
    isFalse: (value) => {
      return value === 'false' || value === false ? false : true;
    },
    htmlToElement: (html) => {
      const placeholder = document.createElement('div');
      placeholder.innerHTML = html;
      return placeholder.children.length
        ? placeholder.firstElementChild
        : undefined;
    },
    datetimeToUnixTimestamp: (dateStr) => {
      let str = dateStr.replace(" ", "-");
      str = str.replaceAll(":", "-");
      str = str.split("-");
      let date = new Date(str[0], parseInt(str[1])-1, str[2], str[3], str[4], str[5]);
      return Math.floor(date.getTime()/1000);
    },
    dateToUnixTimestamp: (dateStr) => {
      let str = dateStr.split("-");
      let date = new Date(str[0], parseInt(str[1])-1, str[2], 0, 0, 0);
      return Math.floor(date.getTime()/1000);
    },
    unixTimestampToDateTime: (timestamp) => {
      let months = [1,2,3,4,5,6,7,8,9,10,11,12];
      let date = new Date(timestamp * 1000);
      let y = date.getFullYear(),
        m = ("0" + months[date.getMonth()]).slice(-2),
        d = ("0" + date.getDate()).slice(-2),
        h = ("0" + date.getHours()).slice(-2),
        n = ("0" + date.getMinutes()).slice(-2),
        s = ("0" + date.getSeconds()).slice(-2);
      return `${y}-${m}-${d} ${h}:${n}:${s}`;
    },
    unixTimestampToDate: (timestamp) => {
      let months = [1,2,3,4,5,6,7,8,9,10,11,12];
      let date = new Date(timestamp * 1000);
      let y = date.getFullYear(),
        m = ("0" + months[date.getMonth()]).slice(-2),
        d = ("0" + date.getDate()).slice(-2);
      return `${y}-${m}-${d}`;
    },
    formatPeriod: (period) => {
      const [firstDate, lastDate] = period.split(' - ');
      return `${fmtDate(firstDate)} - ${fmtDate(lastDate)}`;
    },
    fmtDate,
    formatDateTime: (dateStr) => {
      const [date, time] = dateStr.split(' ');
      return `${fmtDate(date)} ${time}`;
    },
    formatDateFromDateTime: (dateStr) => {
      const [date] = dateStr.split(' ');
      return fmtDate(date);
    },
    setTimestamp: (value) => {
      let start = value.split(' - ')[0];
      let end = value.split(' - ')[1];
      let data = {
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
      if (data.start.getTime() > data.end.getTime()) {
        data = {
          start: data.end,
          end: data.start,
        };
      }
      data.start.setHours(0, 0, 0);
      data.end.setHours(23, 59, 59);
      return data;
    },
    getPeriod,
    fieldError: (field, tab, text, target, pos) => {
      if (tab || tab === 0) {
        $('ul.tabs li a')[tab].click();
      }
      $(field)[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      $(field).addClass('error');
      setTimeout(() => {
        $(field).removeClass('error');
      }, 3000);

      if (text || text === '') {
        if (!$('#' + $(field)[0].error).length) {
          let id = 'error_' + Math.round(Math.random() * 1000000);
          $(field)[0].error = id;
          const error = `<error id="${id}">${
            text === '' ? mc.i18n('system.required') : text
          }</error>`;
          if (!target) {
            $(field).after(error);
          } else {
            if (pos && pos === 'before') {
              $(target).before(error);
            } else if (pos && pos === 'after') {
              $(target).after(error);
            } else if (!pos) {
              $(target).append(error);
            }
          }
        }
      }

      return false;
    },
    loading: (load) => {
      if (load) {
        $('body > .loading').addClass('is_loading');
      } else {
        $('body > .loading').removeClass('is_loading');
      }
      setTimeout(() => {
        ___mc.loading(false);
      }, 5000);
    },
    timer: () => {
      //todo timer
    },
    stringToHslColor: (str, s, l) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      let h = hash % 360;
      return 'hsl('+h+', '+s+'%, '+l+'%)';
    },
    phoneClassify: (phone) =>
      phone.toString().slice(0, 4) + '***' + phone.toString().slice(7)
  };
});