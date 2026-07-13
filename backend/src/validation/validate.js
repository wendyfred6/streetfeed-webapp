// Rejects requests whose body doesn't match `schema`, replacing req.body
// with the parsed (and thus type-narrowed) result on success.
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
      });
    }
    req.body = result.data;
    next();
  };
}
