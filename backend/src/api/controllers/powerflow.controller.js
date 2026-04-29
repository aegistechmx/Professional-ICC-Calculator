const runPowerFlow = require('@/application/powerflow/runPowerFlow');

module.exports = async (req, res) => {
  try {
    const result = await runPowerFlow(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};