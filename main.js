require("dotenv").config();
const {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  ipcMain,
} = require("electron");
const path = require("path");
const OpenAI = require("openai-api");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI(OPENAI_API_KEY);

const application = {
  isQuiting: false,
  isVisible: false,
};

const isDevelopment =
  process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

ipcMain.handle("submitToChatGPT", async (event, text) => {
  const gptResponse = await openai.complete({
    engine: "text-davinci-001",
    prompt: text,
    temperature: 0.4,
    maxTokens: 64,
    top_p: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  });
  console.log("gptResponse.data", gptResponse.data);
  return gptResponse.data;
});

ipcMain.handle("minimize", async (event) => {
  BrowserWindow.getFocusedWindow().minimize();
});

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
    frame: false,
    transparent: true,
    show: false,
    resizable: false,
    center: true,
  });

  // Event listeners on the window
  // win.webContents.on("did-finish-load", () => {
  //   win.show();
  //   win.focus();
  // });

  win.on("minimize", function (event) {
    event.preventDefault();
    win.hide();
  });

  win.on("close", function (event) {
    if (!application.isQuiting) {
      event.preventDefault();
      win.hide();
    }

    return false;
  });

  win.on("blur", function (event) {
    win.hide();
    console.log("sending blur event");
    win.webContents.send("blur");
  });

  win.on("focus", function (event) {
    win.webContents.send("focus");
  });
  // Load our HTML file
  if (isDevelopment) {
    win.loadURL("http://localhost:40992");
  } else {
    win.loadFile("app/dist/index.html");
  }

  return win;
};

const registerKeyboardShortcuts = (win) => {
  // Register a 'CommandOrControl+X' shortcut listener.
  const ret = globalShortcut.register("CommandOrControl+G", () => {
    console.log("CommandOrControl+G is pressed");
    const isVisible = win.isVisible();
    console.log("isVisible", isVisible);
    if (isVisible) {
      win.hide();
    } else {
      win.show();
    }
  });

  if (!ret) {
    console.log("registration failed");
  }

  const rett = globalShortcut.register("CommandOrControl+I", () => {
    console.log("CommandOrControl+I is pressed");
    if (!win.isDevToolsOpened()) {
      win.webContents.openDevTools();
    } else {
      win.webContents.closeDevTools();
    }
  });

  if (!rett) {
    console.log("registration failed");
  }

  // Check whether a shortcut is registered.
  console.log(globalShortcut.isRegistered("CommandOrControl+X"));
};

const addTrayMenu = (win) => {
  const tray = new Tray(path.join(__dirname, "resources/icon.png"));
  const menu = Menu.buildFromTemplate([
    {
      label: "Show App (Ctrl+G)",
      click: function () {
        win.show();
      },
    },
    {
      label: "Quit",
      click: function () {
        application.isQuiting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("ChatGPT Desktop");
  tray.setContextMenu(menu);
};

app.whenReady().then(() => {
  const win = createWindow();

  registerKeyboardShortcuts(win);

  addTrayMenu(win);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
