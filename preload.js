const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  // we can also expose variables, not just functions
  onFocusListener: (cb) => {
    ipcRenderer.on("focus", (data) => cb(data));
  },
  onBlurListener: (cb) => {
    ipcRenderer.on("blur", (data) => cb(data));
  },
  submitToChatGPT: (text, cb) => {
    // Deliberately strip event as it includes `sender` (note: Not sure about that, I partly pasted it from somewhere)
    // Note: The first argument is always event, but you can have as many arguments as you like, one is enough for me.
    // ipcRenderer.on("submitToChatGPT", (event, customData) => cb(customData));
    ipcRenderer.invoke("submitToChatGPT", text).then((data) => cb(data));
  },
});
