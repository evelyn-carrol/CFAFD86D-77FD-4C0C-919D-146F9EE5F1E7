/* eslint-disable no-inner-declarations */
define([
  'microcore',
  'mst!layouts/components/multiple_input',
  'utilities',
], function (mc, view, scripts) {
  return async (params) => {
    let props = { ...params };

    props.id = 'multiple-input_' + Math.round(Math.random() * 1000000);

    props.label = scripts.getStringFromI18n(props.label);
    props.placeholder = scripts.getStringFromI18n(props.placeholder);
    props.phone = scripts.isTrue(props.phone);
    props.multiple = scripts.isTrue(props.multiple);
    props.disabled = scripts.isTrue(props.disabled);
    props.required = scripts.isTrue(props.required);
    props.delete = scripts.isTrue(props.delete);
    props.valid = !props.required;

    if (props.inputType.includes('string')) {
      props.string = true;
    }

    if (props.inputType.includes('url')) {
      props.url = true;
    }

    if (props.inputType.includes('phone')) {
      props.mask = props.mask || '+X (XXX) XXX-XX-XX';
      props.phone = true;
      props.placeholder = props.placeholder || props.mask.replace('X', '7');
    }

    let wait_load = setInterval(async () => {
      const $component = $('#' + props.id);
      if ($component.length) {
        clearInterval(wait_load);

        const actions = {
          toggleAdd,
        };

        mc.events.push(`multiple_intup.created.${props.wrapperID}`, {
          component: $component,
          actions,
          data: props,
        });

        const $input = $component.find('input');
        const $add = $component.find('[data-type=add]');
        const $delete = $component.find('[data-type=delete]');

        $input[0].props = props;
        $input[0].showError = showError;

        keypress(props.value);

        $component.find('label').on('click', () => {
          $input[0].focus();
        });

        $add.on('click', () => {
          if (validate()) {
            mc.events.push(`multiple_intup.add.${props.wrapperID}`);
          }
        });

        $delete.on('click', () => {
          mc.events.push(
            `multiple_intup.delete.${props.wrapperID}`,
            $component
          );
        });

        $input.on('keyup', () => {
          keypress();
        });

        $input.on('paste', (event) => {
          let paste = (event.clipboardData || window.clipboardData).getData(
            'text'
          );

          let phonesArray = paste
            .split(',')
            .map((phone) => scripts.onlyDigits(phone));

          if (phonesArray.length > 1) {
            event.preventDefault();
            keypress(phonesArray.shift());
            phonesArray = [...new Set(phonesArray)];
            phonesArray.forEach((phone) =>
              mc.events.push(`multiple_intup.add.${props.wrapperID}`, phone)
            );
          }
        });

        $input.on('blur', () => {
          let value = $input[0].value;
          const { phone, string } = scripts.parsePhoneOrString(value);
          if (props.phone && !props.string && props.required) {
            value = scripts.onlyDigits(phone);
            validate();
          } else if (phone && !string && props.required) {
            value = scripts.onlyDigits(phone);
            validate();
          } else if (props.url && props.required) {
            validate();
          } else if (props.phone && !props.string && phone && !props.required) {
            value = scripts.onlyDigits(phone);
            validate();
          }

          // console.log({
          //   propsPhone: props.phone,
          //   propsString: props.string,
          //   propsUrl: props.url,
          //   phone,
          //   string,
          //   required: props.required,
          // });

          mc.events.push(`multiple_intup.onchange.${props.wrapperID}`, {
            ...props,
          });
        });

        function setValue(value, displayValue = '') {
          $input[0].value = displayValue || value;
          $input[0].dataset.value = value;
        }

        function toggleAdd() {
          props.multiple = !props.multiple;
          $add.toggleClass('hide');
        }

        function keypress(v) {
          let value = $input[0].value || v;
          const { phone, string } = scripts.parsePhoneOrString(value);
          if (phone && !string) {
            value = scripts.onlyDigits(value);
            setValue(value, scripts.mask(value, props.mask));
          } else if (phone && string) {
            value = scripts.onlyDigits(phone) + string;
            setValue(value);
          } else if (string) {
            setValue(string);
          } else {
            setValue('');
          }
        }

        function validate() {
          props.valid = true;
          if (props.phone) {
            props.valid = validatePhone();
          }
          if (props.url) {
            props.valid = validateUrl();
          }
          return props.valid;
        }

        function highligthInput(bool) {
          if (bool) {
            showError();
            return false;
          }
          return true;
        }

        function showError(index = null) {
          scripts.fieldError($input[0], index);
        }

        function validateUrl() {
          const value = $input[0].value.trim();
          const validate = !!value.match(
            // eslint-disable-next-line no-useless-escape
            /^https?:\/\/(?:www\.)?[-a-zA-Zа-яА-Я0-9@:%._\+~#=]{1,256}\.[a-zA-Zа-яА-Я0-9()]{1,6}(?:[-a-zA-Zа-яА-Я0-9()@:%_\+.~#?&\/=]*)$/
          );
          return highligthInput(!validate);
        }

        function validatePhone(v) {
          let value = v || scripts.onlyDigits($input[0].value);
          return highligthInput(value.length !== maskLength());
        }

        function maskLength() {
          return props.mask.match(/[X]/g).length;
        }
      }
    }, 300);

    return await view(props);
  };
});
