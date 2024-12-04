define(() => {
  let j = {
    test: 'тест',
    new: 'Новый',
    inwork: 'В работе',
    approved: 'Принят',
    rejected: 'Отклонен',
    appealed: 'Апелляция',
    hold: 'Hold',
    active: 'активный',
    inactive: 'заблокирован',
    lead: 'лид',
    conversion: 'конверсия',
    call: 'звонок',
  };

  return async (params, value, prev_ctx) => {
    return j[params[0]];
  };
});
