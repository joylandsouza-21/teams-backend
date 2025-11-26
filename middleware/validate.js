const { ZodError } = require("zod");

module.exports = function validate(schema) {
  return (req, res, next) => {
    try {
      // Parse and validate
      const result = schema.parse(req.body);

      // Replace body with validated data
      req.body = result;

      next();

    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          errors: err.flatten().fieldErrors
        });
      }

      return res.status(400).json({ error: err.message });
    }
  };
};
