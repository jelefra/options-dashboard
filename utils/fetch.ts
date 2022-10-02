import fetch from 'node-fetch';

export const fetchFn = async (endpoint, options, retries = 3, delay = 200): Promise<any> =>
  fetch(endpoint, options)
    .then((response) => {
      const contentType = response.headers?.get('content-type');
      if (response.ok && contentType.includes('application/json')) {
        return response.json();
      }
      if (retries > 0) {
        console.info(
          `${response.status} status code.\tEndpoint: ${endpoint}.\t(${retries} retr${
            retries > 1 ? 'ies' : 'y'
          } left)`
        );
        setTimeout(() => fetchFn(endpoint, options, retries - 1, delay * 2));
      } else {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error(error);
      return null;
    });
