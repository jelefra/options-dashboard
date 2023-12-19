const camelCase = (first: string, second: string) =>
  first ? `${first}${second[0].toUpperCase()}${second.slice(1)}` : second;

const flatten = (obj: object, prefix = '', result: { [key: string]: string } = {}) => {
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
