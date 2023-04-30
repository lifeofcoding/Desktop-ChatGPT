import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 'chatResponse' | 'focus' | 'blur';

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
    // onFocusListener: (cb: () => void) => {
    //   return ipcRenderer.on('focus', cb);
    // },
    // onBlurListener: (cb: () => void) => {
    //   return ipcRenderer.on('blur', cb);
    // },
    submitToChatGPT: (question: string) => {
      // Deliberately strip event as it includes `sender` (note: Not sure about that, I partly pasted it from somewhere)
      // Note: The first argument is always event, but you can have as many arguments as you like, one is enough for me.
      // ipcRenderer.on("submitToChatGPT", (event, customData) => cb(customData));
      return ipcRenderer.invoke('submitToChatGPT', question);
    },
    minimize: () => {
      ipcRenderer.invoke('minimize');
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
