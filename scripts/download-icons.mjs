import fs from 'fs'
import path from 'path'
import https from 'https'

const iconUrl = 'https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png'
const targetDir = path.resolve('public/icons')

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode}`))
        return
      }
      const fileStream = fs.createWriteStream(dest)
      res.pipe(fileStream)
      fileStream.on('finish', () => {
        fileStream.close()
        resolve()
      })
    }).on('error', reject)
  })
}

async function main() {
  try {
    console.log('Downloading icon from Framer...')
    const tempIconPath = path.join(targetDir, 'temp-icon.png')
    await downloadFile(iconUrl, tempIconPath)
    
    // Copy the same image to all needed sizes
    const targets = [
      'icon-192.png',
      'icon-512.png',
      'icon-maskable-512.png',
      'apple-touch-icon.png'
    ]
    
    for (const file of targets) {
      fs.copyFileSync(tempIconPath, path.join(targetDir, file))
    }
    
    // Clean up temp file
    fs.unlinkSync(tempIconPath)
    
    console.log('Icons downloaded and configured successfully!')
  } catch (error) {
    console.error('Error downloading icons:', error)
    process.exit(1)
  }
}

main()
