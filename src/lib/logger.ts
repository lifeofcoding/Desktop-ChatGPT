const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

const Logger = {
  // eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
  log: (...args: any[]) => isDebug && console.log(...args),
};

export default Logger;
