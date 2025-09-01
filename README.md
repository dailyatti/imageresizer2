# ImageFlow Pro - Professional Image Processing SaaS

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/your-site/deploys)

## 🚀 Features

### 📸 Advanced Image Processing
- **Batch Processing** - Process multiple images simultaneously
- **Smart Resizing** - High-quality image resizing with Pica.js
- **Format Conversion** - Convert between WebP, JPG, PNG, AVIF
- **Quality Control** - Adjustable compression settings
- **Quick Presets** - Thumbnail, Social Media, Web optimized presets

### 🔗 Device Connectivity
- **QR Code Pairing** - Instant device connection via QR codes
- **WebRTC File Sharing** - Peer-to-peer wireless file transfer
- **Multi-Device Support** - Connect multiple devices simultaneously
- **Real-time Sync** - Live connection status and file sharing

### 📊 Analytics & Storage
- **Storage Tracking** - Monitor storage usage and limits
- **Compression Analytics** - Track space savings and efficiency
- **File Type Distribution** - Analyze processed file formats
- **Processing Statistics** - Detailed performance metrics

### ⚡ Modern Web Features
- **Progressive Web App (PWA)** - Offline capability and app-like experience
- **Dark/Light Theme** - Automatic theme switching
- **Responsive Design** - Works on all devices and screen sizes
- **Real-time Notifications** - Instant feedback for all operations

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Image Processing**: Pica.js for high-quality resizing
- **P2P Communication**: PeerJS for WebRTC connections
- **File Handling**: JSZip for batch downloads
- **PWA**: Service Worker for offline functionality
- **QR Codes**: QRCode.js for device pairing

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/dailyatti/imageresizer2.git
cd imageresizer2

# Start local server
python -m http.server 8080
# or
npx serve .

# Open browser
open http://localhost:8080
```

### Netlify Deployment
This project is optimized for Netlify deployment:

1. **Connect Repository**: Link your GitHub repo to Netlify
2. **Build Settings**: 
   - Build command: `echo 'No build process needed'`
   - Publish directory: `.` (root)
3. **Deploy**: Automatic deployment on every push

## 📱 Usage Guide

### Image Processing
1. **Upload Images**: Drag & drop or click to select images
2. **Choose Settings**: Select format, quality, and dimensions
3. **Apply Presets**: Use quick presets for common use cases
4. **Process**: Use Quick Process or Batch Process
5. **Download**: Individual downloads or batch ZIP

### Device Connection
1. **Generate QR Code**: Click "Eszköz Csatlakoztatása"
2. **Scan Code**: Use another device to scan the QR code
3. **Share Files**: Transfer processed images wirelessly
4. **Manage Devices**: Monitor connected devices

### Analytics
- **Storage Overview**: Monitor usage and savings
- **File Types**: View distribution of processed formats
- **Performance**: Track compression ratios and efficiency

## 🔧 Configuration

### Environment Variables
```env
# Optional: Custom PeerJS server
PEER_SERVER_HOST=your-peerjs-server.com
PEER_SERVER_PORT=443
```

### PWA Configuration
The app includes full PWA support:
- Offline functionality
- App installation capability
- Background sync (when available)

## 🌐 Browser Support

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: WebRTC limitations may affect P2P features
- **Mobile**: Full responsive support

## 📚 API Reference

### ImageFlowApp Class
Main application class handling all functionality:

```javascript
const app = new ImageFlowApp();

// Process images
await app.processFiles(files);

// Connect devices
app.connectManual(deviceId);

// Download processed images
app.downloadAll();
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Pica.js** - High-quality image resizing
- **PeerJS** - WebRTC connection abstraction
- **Tailwind CSS** - Utility-first CSS framework
- **QRCode.js** - QR code generation

---

**ImageFlow Pro** - Professional image processing made simple 🎨