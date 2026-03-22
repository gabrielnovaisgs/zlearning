import { app, BrowserWindow } from 'electron'

app.commandLine.appendSwitch('disable-features', 'VaapiVideoDecoder,VaapiVideoEncoder')
import { join } from 'path'

const createWindow = () => {
  const win = new BrowserWindow({
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
    },
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    console.log(process.env['ELECTRON_RENDERER_URL'])
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
})