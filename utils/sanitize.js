const sanitizeHtml = require("sanitize-html");

module.exports = function sanitize(text) {
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {}
  });
};
