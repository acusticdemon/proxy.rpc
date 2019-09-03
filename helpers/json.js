function fastJSONParse(data, fallback) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  fastJSONParse,
};
