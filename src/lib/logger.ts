const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

const Logger = {
  // eslint-disable-next-line no-console
  log: (...args: string[]) => isDebug && console.log(...args),
};

export default Logger;
