define(['microcore', 'utilities', 'app/modules/multiple_input'], function (
  mc,
  scripts,
  multiple_input
) {
  return async (params) => {
    let components = [];
    let $wrapper;
    let id = 'multiple-input-wrapper_' + Math.round(Math.random() * 1000000);
    let props = { ...params };
    let elements = [];

    props.label = scripts.getStringFromI18n(props.label);
    props.placeholder = scripts.getStringFromI18n(props.placeholder);

    props.multiple = scripts.isTrue(props.multiple);
    props.disabled = scripts.isTrue(props.disabled);

    props.inputType = props.inputType.split(',') || ['string'];

    if (props.inputType.includes('string')) {
      props.string = true;
    }

    if (props.inputType.includes('url')) {
      props.url = true;
    }

    if (props.inputType.includes('phone')) {
      props.phone = true;
    }

    elements = await initElements(props.value);

    const wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.classList.add(
      'multiple-input__wrapper',
      'd-flex',
      'f-column',
      'r-gap-8'
    );

    if (elements.length) {
      for (const element of elements) {
        wrapper.append(element);
      }
    } else {
      wrapper.append(await createMultipleInput({ ...props, delete: false }));
    }

    mc.events.on(`multiple_intup.created.${id}`, ($component) => {
      components.push($component);
    });

    mc.events.on(`multiple_intup.delete.${id}`, ($component) => {
      const componentIndex = components.findIndex(
        (c) => c.component === $component
      );
      if (componentIndex > 0 && componentIndex === components.length - 1) {
        toogleAdd(componentIndex - 1);
      }
      components.splice(componentIndex, 1);
      $component.remove();
      getValue();
    });

    mc.events.on(`multiple_intup.add.${id}`, async (value = '') => {
      if (!includes(value)) {
        toogleAdd(components.length - 1);
        getWrapper().append(
          await createMultipleInput({
            ...props,
            delete: true,
            label: '',
            multiple: true,
            value,
          })
        );
        getValue();
      }
    });

    mc.events.on(`multiple_intup.onchange.${id}`, (event) => {
      getValue(event);
    });

    mc.events.push(`multiple_intup_wrapper.created`, {
      id,
      name: props.name,
      setValue,
      getValue,
    });
    return wrapper.outerHTML;

    function includes(value) {
      return getValues().includes(value);
    }

    async function setValue(value) {
      let elements = await initElements(value);
      if (elements.length) {
        getWrapper().html('');
        for (const element of elements) {
          getWrapper().append(element);
        }
      }
    }

    function getValues() {
      return getWrapper()
        .find('input')
        .map((input) => input.dataset.value || null);
    }

    function getValue(event) {
      let value = getValues();
      if (!props.multiple) {
        value = value[0];
      }
      const object = { ...props, value, event };
      if (typeof props.onchange == 'function') {
        props.onchange(object);
      } else if (typeof props.onchange == 'string') {
        mc.events.push(props.onchange, object);
      }
      return value;
    }

    async function initElements(values) {
      const elements = [];
      if (props.phone) {
        if (typeof values === 'object' && values?.length) {
          let i = 0;
          for await (value of values) {
            const isLast = props.multiple && i === values.length - 1;
            const label = i == 0 ? props.label : '';
            elements.push(
              await createMultipleInput({
                ...props,
                multiple: isLast,
                delete: i != 0,
                value,
                label,
              })
            );
            i += 1;
          }
        }
      }
      return elements;
    }

    function toogleAdd(index) {
      components[index].actions.toggleAdd();
    }

    async function createMultipleInput(props) {
      return scripts.htmlToElement(
        await multiple_input({ ...props, wrapperID: id })
      );
    }

    function getWrapper() {
      if (!$wrapper) {
        $wrapper = $(`#${id}`);
      }
      return $wrapper;
    }
  };
});
