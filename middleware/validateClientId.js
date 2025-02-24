module.exports = (req, res, next) => {
  const clientId = parseInt(req.query.client_id, 10);

  if (isNaN(clientId) || clientId <= 0) {
    return res.status(400).json({ error: "Invalid or missing Client ID" });
  }

  req.clientId = clientId; // Attach it to the request for easy access
  next();
};
