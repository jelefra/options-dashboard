import dayjs from 'dayjs';
import fetch from 'node-fetch';

import { Position, PositionsTimestamped } from '../types';

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
}): Promise<PositionsTimestamped | null> => {
  try {
    console.info(`Fetching ${URL}/${page}`);
    const timestamp = dayjs().unix();
    const response = await fetch(`${URL}/${page}`, options);
    const contentType = response.headers?.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const data = (await response.json()) as Position[];
      if (data.length === 0) {
        console.info('All positions successfully fetched.');
        return { allData, timestamp };
      }
      const isFullResponse = data
        .filter((position) => position.assetClass === 'OPT' && position.position !== 0)
        .every((position) => position.fullName);
      // The response sometimes misses data
      if (!isFullResponse) {
        if (retries > 0) {
          console.info(
            `Positions response not complete\t${retries} retr${retries > 1 ? 'ies' : 'y'} left...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchPositions({
            URL,
            options,
            retries: retries - 1,
            delay: delay * 2,
            page,
            allData,
          });
        } else {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
      }
      console.info('Positions response complete. Fetching the next page...');
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
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchPositions({
        URL,
        options,
        retries: retries - 1,
        delay: delay * 2,
        page,
        allData,
      });
    } else {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};
