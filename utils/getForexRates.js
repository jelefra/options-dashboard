const getForexRates = async () => {
  const endpoint = 'https://api.exchangerate.host/latest?base=GBP';
  const { rates } = await fetch(endpoint).then((response) => response.json());
  return rates;
};

export default getForexRates;
