const camelCase = (first, second) =>
  first ? `${first}${second[0].toUpperCase()}${second.slice(1)}` : second;

const flatten = (obj: object, prefix = '', result = {}) => {
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      result = { ...result, ...flatten(value, camelCase(prefix, key)) };
    } else {
      result[camelCase(prefix, key)] = value;
    }
  });
  return result;
};

export default flatten;
