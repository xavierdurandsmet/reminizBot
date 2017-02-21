
module.exports = {
  createGenericTemplate: createGenericTemplate,
  createListTemplate: createListTemplate
}

function createGenericTemplate(elements) {
  // format elements as a gallery
  elements = elements.map(function (element) {
    let ret = {};
    for (let key in element) {
      if (key === "title" || key === "subtitle" || key === "image_url") {
        ret[key] = element[key];
      } else if (key === "buttons") {
        ret.buttons = [];
        element.buttons.forEach(function (button) {
          ret.buttons.push({ type: "postback", title: button.title, payload: button.payload });
        })
      }
    }
    if (element.share === true) {
      ret.buttons.push({ type: 'element_share' });
    }
    return ret;
  });
  let messageFormat = {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements: elements
      }
    }
  }
  return messageFormat;
}

function createListTemplate(elements) {
  // format elements as a gallery
  elements = elements.map(function (element) {
    let ret = {};
    for (let key in element) {
      if (key === "title" || key === "subtitle" || key === "image_url") {
        ret[key] = element[key];
      } else if (key === "buttons") {
        ret.buttons = [];
        element.buttons.forEach(function (button) {
          ret.buttons.push({ type: "postback", title: button.title, payload: button.payload });
        })
      } else if (key === "default_action") {
        ret.default_action = {
          type: 'web_url',
          messenger_extensions: true,
          webview_height_ratio: 'tall'
        };
        for (let key in element.default_action) {
          ret.default_action[key] = element.default_action[key];
        }
      }
    }
    return ret;
  });
  let messageFormat = {
    attachment: {
      type: "template",
      payload: {
        template_type: "list",
        elements: elements
      }
    }
  }
  return messageFormat;
}
