export const convertUnixTimestamp = (date: number) => {
  return new Date(date * 1000);
};
