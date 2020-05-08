export const createTimestamp = () => {
  return parseInt(String(new Date().getTime() / 1000), 0).toString();
};
