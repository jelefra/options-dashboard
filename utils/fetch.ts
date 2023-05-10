import fetch from 'node-fetch';

export const fetchFn = async ({
  URL,
  options,
  logSanitiser = (URL) => URL,
  retries = 5,
  delay = 200,
}): Promise<any> => {
  console.info(`Fetching ${logSanitiser(URL)}`);
  return fetch(URL, options)
    .then((response) => {
      const contentType = response.headers?.get('content-type');
      if (response.ok && contentType.includes('application/json')) {
        return response.json();
      }
      if (retries > 0) {
        console.info(
          `${response.status} status code\t${retries} retr${
            retries > 1 ? 'ies' : 'y'
          } left\tURL: ${logSanitiser(URL)}`
        );
        setTimeout(
          () => fetchFn({ URL, options, logSanitiser, retries: retries - 1, delay: delay * 2 }),
          delay
        );
      } else {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error(error);
      return null;
    });
};
