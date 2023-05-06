import fetch from 'node-fetch';

import { Position } from '../types';

export const fetchPositions = async ({
  URL,
  options,
  retries = 5,
  delay = 200,
  page = 0,
  allData = [],
}: {
  URL: string;
  options: object;
  retries?: number;
  delay?: number;
  page?: number;
  allData?: Position[];
}): Promise<Position[]> | null =>
  fetch(`${URL}/${page}`, options)
    .then(async (response) => {
      const contentType = response.headers?.get('content-type');
      if (response.ok && contentType.includes('application/json')) {
        const data = (await response.json()) as Position[];
        if (data.length === 0) {
          return allData;
        }
        const isFullResponse = data
          .filter((position) => position.assetClass === 'OPT')
          .every((position) => position.fullName);
        // The response sometimes misses data
        if (!isFullResponse) {
          if (retries > 0) {
            console.info(
              `Positions response not complete\t${retries} retr${
                retries > 1 ? 'ies' : 'y'
              } left\tURL: ${URL}`
            );
            setTimeout(
              () =>
                fetchPositions({
                  URL,
                  options,
                  retries: retries - 1,
                  delay: delay * 2,
                  page,
                  allData,
                }),
              delay
            );
          } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
        }
        console.info(`Positions response complete. Fetching page ${page + 1}\tURL: ${URL}`);
        return fetchPositions({
          URL,
          options,
          page: page + 1,
          allData: [...allData, ...data],
        });
      }
      if (retries > 0) {
        console.info(
          `${response.status} status code\t${retries} retr${
            retries > 1 ? 'ies' : 'y'
          } left\tURL: ${URL}`
        );
        setTimeout(
          () =>
            fetchPositions({
              URL,
              options,
              retries: retries - 1,
              delay: delay * 2,
              page,
              allData,
            }),
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
