import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Completion } from 'openai-api';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    // we can also expose variables, not just functions
    onFocusListener: (cb: () => void) => {
      ipcRenderer.on('focus', cb);
    },
    onBlurListener: (cb: () => void) => {
      ipcRenderer.on('blur', cb);
    },
    submitToChatGPT: async (
      text: string,
      cb: (data: Completion['data']) => void
    ) => {
      // Deliberately strip event as it includes `sender` (note: Not sure about that, I partly pasted it from somewhere)
      // Note: The first argument is always event, but you can have as many arguments as you like, one is enough for me.
      // ipcRenderer.on("submitToChatGPT", (event, customData) => cb(customData));
      const returnData = await ipcRenderer
        .invoke('submitToChatGPT', text)
        .catch((err) => console.warn(err));

      cb(returnData);
    },
    minimize: () => {
      ipcRenderer.invoke('minimize');
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
