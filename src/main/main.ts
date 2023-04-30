/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  Tray,
  Menu,
  globalShortcut,
} from 'electron';
import { IncomingMessage } from 'http';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { CreateChatCompletionRequest } from 'openai';
import { machineId } from 'node-machine-id';
import { openai, createEmbeddings } from '../lib/openai';
import pineconeDB from '../lib/pinecone';
// import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import env from '../lib/env';

const { START_MINIMIZED } = env;

const application = {
  isQuiting: false,
  isVisible: false,
};

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

const localHistory: string[] = [];

const getMachineId = async () => {
  const id = await machineId();
  return id;
};

ipcMain.handle('submitToChatGPT', async (e, text: string) => {
  const user = await getMachineId();
  localHistory.push(text);
  const messages: CreateChatCompletionRequest['messages'] = [
    { role: 'system', content: 'You are a helpful assistant.' },
  ];
  try {
    const historyEmbeddings = await createEmbeddings(
      // get last 4 items in local history
      localHistory.slice(Math.max(localHistory.length - 4, 0)).join('\n\n')
    );

    const queries = await pineconeDB.queryVector(
      historyEmbeddings.embedding,
      user,
      3
    );

    // append assistant messages from memory relavent to query
    queries.matches?.forEach((query) => {
      const metadata = query.metadata || {};
      if ('content' in metadata) {
        messages.push({
          role: 'assistant',
          content: metadata.content as string,
        });
      }
    });

    // append local history
    localHistory.slice(Math.max(localHistory.length - 3, 0)).forEach((item) => {
      messages.push({ role: 'user', content: item });
    });

    console.log('messages: ', messages);

    const completion = await openai.createChatCompletion(
      {
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 150,
        temperature: 0.9,
        stream: true,
      },
      { responseType: 'stream' }
    );

    /* Found by https://github.com/openai/openai-node/issues/18 */
    const stream = completion.data as unknown as IncomingMessage;

    let botMessage = '';
    stream.on('data', (chunk: Buffer) => {
      // Messages in the event stream are separated by a pair of newline characters.
      const payloads = chunk.toString().split('\n\n');
      // eslint-disable-next-line no-restricted-syntax
      for (const payload of payloads) {
        if (payload.includes('[DONE]')) return;
        if (payload.startsWith('data:')) {
          const data = payload.replaceAll(/(\n)?^data:\s*/g, ''); // in case there's multiline data event
          try {
            const delta = JSON.parse(data.trim());
            console.log(delta.choices[0].delta?.content);

            if (delta.choices[0].delta?.content) {
              mainWindow?.webContents.send(
                'chatResponse',
                delta.choices[0].delta?.content
              );
              botMessage += delta.choices[0].delta?.content;
            }
          } catch (error) {
            console.log(`Error with JSON.parse and ${payload}.\n${error}`);
          }
        }
      }
    });

    /* On Stream end store message for history */
    stream.on('end', async () => {
      console.log('Stream done', botMessage);
      const responseEmbeddings = await createEmbeddings(botMessage);
      await pineconeDB.insertVector(
        responseEmbeddings.embedding,
        botMessage,
        user
      );
    });

    /* Catch any errors and handel */
    stream.on('error', (err: Error) => {
      console.error(err);
      mainWindow?.webContents.send(
        'chatResponse',
        "I'm sorry, I'm having trouble understanding you right now."
      );
    });

    return true;
  } catch (err) {
    console.error(err);
    mainWindow?.webContents.send(
      'chatResponse',
      "I'm sorry, I'm having trouble understanding you right now."
    );
    return false;
  }
});

ipcMain.handle('minimize', async () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const addTrayMenu = (win: BrowserWindow) => {
  const tray = new Tray(getAssetPath('icon.png'));
  const menu = Menu.buildFromTemplate([
    {
      label: 'Show App (Ctrl+T)',
      click() {
        win.show();
      },
    },
    {
      label: 'Quit',
      click() {
        application.isQuiting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip('ChatGPT Desktop');
  tray.setContextMenu(menu);
};

const registerKeyboardShortcuts = (win: BrowserWindow) => {
  // Register a 'CommandOrControl+G' shortcut listener.
  const registerToggle = globalShortcut.register('CommandOrControl+G', () => {
    console.log('CommandOrControl+G is pressed');
    const isFocused = win.isFocused();
    console.log('isFocused', isFocused);
    if (isFocused) {
      win.hide();
    } else {
      win.show();
    }
  });

  if (!registerToggle) {
    console.log('registerToggle failed');
  }

  // const registerDevToolsToggle = globalShortcut.register(
  //   'CommandOrControl+I',
  //   () => {
  //     debugger;
  //     console.log('CommandOrControl+I is pressed');
  //     if (!win.webContents.isDevToolsOpened()) {
  //       win.webContents.openDevTools();
  //     } else {
  //       win.webContents.closeDevTools();
  //     }
  //   }
  // );

  // if (!registerDevToolsToggle) {
  //   console.log('registerDevToolsToggle failed');
  // }

  const registerEscapeListener = globalShortcut.register('Esc', () => {
    console.log('Esc is pressed 2');
    win.minimize();
  });

  if (!registerEscapeListener) {
    console.log('registerEscapeListener failed');
  }

  // Check whether a shortcut is registered.
  // console.log(globalShortcut.isRegistered('CommandOrControl+X'));
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    width: 800,
    height: 400,
    frame: false,
    transparent: true,
    show: false,
    resizable: false,
    center: true,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // mainWindow.on('minimize', (event) => {
  //   debugger;
  //   // event.preventDefault();
  //   mainWindow?.hide();
  // });

  mainWindow.on('close', (event) => {
    if (!application.isQuiting) {
      event.preventDefault();
      mainWindow?.hide();
    }

    return false;
  });

  mainWindow.on('blur', () => {
    mainWindow?.hide();
    console.log('sending blur event');
    mainWindow?.webContents.send('blur');
  });

  mainWindow.on('focus', () => {
    mainWindow?.webContents.send('focus');
  });

  registerKeyboardShortcuts(mainWindow);
  addTrayMenu(mainWindow);

  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);