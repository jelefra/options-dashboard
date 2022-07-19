const getForexRates = async (): Promise<{
  [key: string]: number;
}> => {
  const endpoint = 'https://api.exchangerate.host/latest?base=GBP';
  const { rates } = await fetch(endpoint).then((response) => response.json());
  return rates;
};

export default getForexRates;
