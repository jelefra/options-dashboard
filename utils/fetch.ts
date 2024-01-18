import fetch from 'node-fetch';

export const fetchFn = async ({
  URL,
  options,
  logSanitiser = (URL: string) => URL,
  retries = 5,
  delay = 200,
}: {
  URL: string;
  options: object;
  logSanitiser: Function;
  retries: number;
  delay: number;
}): Promise<any> => {
  try {
    console.info(`Fetching ${logSanitiser(URL)}`);
    const response = await fetch(URL, options);
    const contentType = response.headers?.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      return response.json();
    }
    if (retries > 0) {
      console.info(
        `${response.status} status code\t${retries} retr${
          retries > 1 ? 'ies' : 'y'
        } left\tURL: ${logSanitiser(URL)}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchFn({ URL, options, logSanitiser, retries: retries - 1, delay: delay * 2 });
    } else {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};
