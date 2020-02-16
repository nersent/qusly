import { MSDOS_DATE_REGEX } from '../constants';

/**
 * Returns a random string.
 */
export const makeId = (
  length: number,
  possible: string = 'abcdefghijklmnopqrstuvwxyz',
) => {
  let id = '';

  for (let i = 0; i < length; i++) {
    id += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return id;
};

export const getValidDate = (str: string) => {
  const date = str.trim();

  const match = date.match(MSDOS_DATE_REGEX);
  if (!match) return new Date(date);

  const [month, day, year, _hour, minutes] = date.match(/[0-9][0-9]/g);

  let hour = parseInt(_hour);

  if (date[date.length - 2] === 'P') {
    hour += 12;
  }

  return new Date(
    parseInt(`20${year}`),
    parseInt(month) - 1,
    parseInt(day),
    hour,
    parseInt(minutes),
  );
};
