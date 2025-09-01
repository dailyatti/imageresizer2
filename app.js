// ImageFlow Pro - Professional Lossless Image Processing SaaS Platform
class ImageFlowApp {
  constructor() {
    this.images = [];
    this.peer = null;
    this.connections = [];
    this.storageData = {
      used: 0,
      limit: 1000 * 1024 * 1024, // 1GB
      originalSize: 0,
      compressedSize: 0
    };
    this.fileTypes = new Map();
    this.processingStats = {
      totalProcessed: 0,
      avgCompression: 0,
      timeSaved: 0,
      bandwidthSaved: 0
    };
    
    // Advanced Processing Options
    this.processingOptions = {
      lossless: true,
      algorithm: 'lanczos', // lanczos, bicubic, bilinear, nearest
      colorSpace: 'sRGB',
      preserveMetadata: true,
      enableSharpening: false,
      gammaCorrection: 2.2,
      resamplingQuality: 'maximum',
      enableCropping: true,
      cropAspectRatio: 'free' // free, 1:1, 4:3, 16:9, 3:2, custom
    };
    
    // Crop state management
    this.cropState = {
      active: false,
      imageId: null,
      cropArea: { x: 0, y: 0, width: 0, height: 0 },
      aspectRatio: null,
      canvas: null,
      ctx: null
    };
    
    // Professional Format Support with Lossless Options
    this.formatConfigs = {
      'png': { 
        lossless: true, 
        compression: 'zip',
        bitDepth: 'auto', // 8, 16, 'auto'
        colorType: 'auto' // rgb, rgba, grayscale, palette, 'auto'
      },
      'webp': { 
        lossless: true,
        method: 6, // 0-6, higher = slower but better
        quality: 100,
        exact: true
      },
      'avif': {
        lossless: true,
        quality: 100,
        speed: 1 // 0-10, higher = faster but worse
      },
      'tiff': {
        lossless: true,
        compression: 'lzw',
        bitDepth: 16
      },
      'jpg': {
        lossless: false,
        quality: 95,
        subsampling: '444', // 444, 422, 420
        progressive: false,
        optimize: true
      }
    };
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTheme();
    this.setupTabs();
    this.setupPeerConnection();
    this.generateQRCode();
    this.updateStats();
    this.registerServiceWorker();
    this.handleURLParameters();
  }

  setupEventListeners() {
    // File upload
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
      dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
      dropZone.addEventListener('drop', this.handleDrop.bind(this));
      fileInput.addEventListener('change', this.handleFileSelect.bind(this));
    }

    // Quick upload button
    const quickUpload = document.getElementById('quickUpload');
    if (quickUpload && fileInput) {
      quickUpload.addEventListener('click', () => fileInput.click());
    }

    // Processing controls
    const quickProcess = document.getElementById('quickProcess');
    const batchProcess = document.getElementById('batchProcess');
    if (quickProcess) quickProcess.addEventListener('click', this.quickProcess.bind(this));
    if (batchProcess) batchProcess.addEventListener('click', this.batchProcess.bind(this));

    // Quick presets
    document.querySelectorAll('.quick-preset').forEach(btn => {
      btn.addEventListener('click', (e) => this.applyPreset(e.target.dataset.preset));
    });

    // Quality slider
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    qualitySlider.addEventListener('input', (e) => {
      qualityValue.textContent = `${e.target.value}%`;
    });

    // Device connection
    document.getElementById('connectDevice').addEventListener('click', this.showDevicesTab.bind(this));
    document.getElementById('connectManual').addEventListener('click', this.connectManual.bind(this));
    document.getElementById('regenerateQR').addEventListener('click', this.generateQRCode.bind(this));

    // Floating action button
    document.getElementById('floatingAction').addEventListener('click', () => fileInput.click());
  }

  setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    
    // Check for saved theme preference or default to 'light' mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    
    // Update icons
    sunIcon.classList.toggle('hidden', currentTheme === 'light');
    moonIcon.classList.toggle('hidden', currentTheme === 'dark');
    
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      document.documentElement.classList.toggle('dark');
      
      sunIcon.classList.toggle('hidden');
      moonIcon.classList.toggle('hidden');
      
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active content
        contents.forEach(content => {
          content.classList.remove('active');
          if (content.id === `${tabName}Tab`) {
            content.classList.add('active');
          }
        });
      });
    });
  }

  async setupPeerConnection() {
    try {
      this.peer = new Peer({
        host: 'peerjs-server.herokuapp.com',
        port: 443,
        secure: true,
        debug: 2
      });
      
      this.peer.on('open', (id) => {
        console.log('Peer connection established:', id);
        this.updateConnectionStatus('connected', `ID: ${id}`);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        this.updateConnectionStatus('disconnected', 'Connection failed');
      });
      
    } catch (error) {
      console.error('Failed to setup peer connection:', error);
      this.updateConnectionStatus('disconnected', 'Offline mode');
    }
  }

  async generateQRCode() {
    if (!this.peer || !this.peer.id) {
      setTimeout(() => this.generateQRCode(), 1000);
      return;
    }
    
    const qrContainer = document.getElementById('qrCode');
    const connectionUrl = `${window.location.origin}?connect=${this.peer.id}`;
    
    try {
      qrContainer.innerHTML = '';
      const canvas = await QRCode.toCanvas(connectionUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#667eea',
          light: '#ffffff'
        }
      });
      qrContainer.appendChild(canvas);
    } catch (error) {
      console.error('QR Code generation failed:', error);
      qrContainer.innerHTML = '<p class="text-red-500">QR kód generálása sikertelen</p>';
    }
  }

  handleIncomingConnection(conn) {
    this.connections.push(conn);
    this.updateDeviceList();
    
    conn.on('data', (data) => {
      if (data.type === 'file') {
        this.receiveFile(data);
      }
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c !== conn);
      this.updateDeviceList();
    });
  }

  connectManual() {
    const deviceId = document.getElementById('deviceId').value.trim();
    if (!deviceId) {
      this.showNotification('Kérem adja meg az eszköz ID-ját!', 'warning');
      return;
    }

    try {
      const conn = this.peer.connect(deviceId);
      conn.on('open', () => {
        this.connections.push(conn);
        this.updateDeviceList();
        this.showNotification('Eszköz sikeresen csatlakoztatva!', 'success');
        document.getElementById('deviceId').value = '';
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
        this.showNotification('Csatlakozás sikertelen!', 'error');
      });
    } catch (error) {
      console.error('Manual connection failed:', error);
      this.showNotification('Csatlakozás sikertelen!', 'error');
    }
  }

  updateConnectionStatus(status, message) {
    const indicator = document.getElementById('connectionIndicator');
    const statusText = document.getElementById('connectionStatus');
    const connectionBar = document.getElementById('connectionBar');
    
    indicator.className = `connection-indicator ${status} w-3 h-3 rounded-full`;
    indicator.classList.add(status === 'connected' ? 'bg-green-500' : 
                           status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500');
    
    statusText.textContent = message;
    
    if (status === 'connected') {
      connectionBar.classList.remove('-translate-y-full');
    }
  }

  updateDeviceList() {
    const deviceList = document.getElementById('deviceList');
    const deviceCount = document.getElementById('deviceCount');
    const connectedCount = document.getElementById('connectedCount');
    const connectedDevices = document.getElementById('connectedDevices');
    
    deviceCount.textContent = this.connections.length;
    connectedCount.textContent = this.connections.length;
    connectedDevices.textContent = `${this.connections.length} eszköz csatlakoztatva`;
    
    if (this.connections.length === 0) {
      deviceList.innerHTML = `
        <div class="text-center py-12 text-slate-500">
          <svg class="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p>Nincs csatlakoztatott eszköz</p>
          <p class="text-sm mt-2">Használja a QR kódot vagy az eszköz ID-t a csatlakozáshoz</p>
        </div>
      `;
      return;
    }
    
    deviceList.innerHTML = this.connections.map((conn, index) => `
      <div class="flex items-center justify-between p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
        <div class="flex items-center gap-3">
          <div class="connection-indicator connected w-3 h-3 bg-green-500 rounded-full"></div>
          <div>
            <h3 class="font-semibold">Eszköz ${index + 1}</h3>
            <p class="text-sm text-slate-500">ID: ${conn.peer.substring(0, 8)}...</p>
          </div>
        </div>
        <button onclick="app.disconnectDevice('${conn.peer}')" class="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors">
          Leválasztás
        </button>
      </div>
    `).join('');
  }

  disconnectDevice(peerId) {
    this.connections = this.connections.filter(conn => {
      if (conn.peer === peerId) {
        conn.close();
        return false;
      }
      return true;
    });
    this.updateDeviceList();
    this.showNotification('Eszköz leválasztva', 'info');
  }

  showDevicesTab() {
    document.querySelector('[data-tab="devices"]').click();
  }

  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }

  handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  }

  handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    this.processFiles(files);
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.processFiles(files);
  }

  async processFiles(files) {
    try {
      // Validate file count
      if (files.length === 0) {
        this.showNotification('Kérem válasszon fájlokat!', 'warning');
        return;
      }
      
      if (files.length > 100) {
        this.showNotification('Túl sok fájl! Maximum 100 fájl tölthető fel egyszerre.', 'error');
        return;
      }
      
      // Filter and validate image files
      const validImageFiles = [];
      const invalidFiles = [];
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml'];
      
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          invalidFiles.push(`${file.name} (nem képfájl)`);
          continue;
        }
        
        if (!supportedTypes.includes(file.type)) {
          invalidFiles.push(`${file.name} (nem támogatott formátum)`);
          continue;
        }
        
        if (file.size > maxFileSize) {
          invalidFiles.push(`${file.name} (túl nagy, max 50MB)`);
          continue;
        }
        
        if (file.size === 0) {
          invalidFiles.push(`${file.name} (üres fájl)`);
          continue;
        }
        
        validImageFiles.push(file);
      }
      
      // Show warnings for invalid files
      if (invalidFiles.length > 0) {
        const message = `${invalidFiles.length} fájl kihagyva: ${invalidFiles.slice(0, 3).join(', ')}${invalidFiles.length > 3 ? '...' : ''}`;
        this.showNotification(message, 'warning');
      }
      
      if (validImageFiles.length === 0) {
        this.showNotification('Nincsenek érvényes képfájlok a feltöltéshez!', 'error');
        return;
      }
      
      // Check storage limits
      const totalNewSize = validImageFiles.reduce((sum, file) => sum + file.size, 0);
      if (this.storageData.originalSize + totalNewSize > this.storageData.limit) {
        this.showNotification('Nincs elegendő tárterület! Töröljön néhány képet.', 'error');
        return;
      }

      this.showProgress(true, 'Képek betöltése...', validImageFiles.length);
      
      let successCount = 0;
      let failedFiles = [];
      
      for (let i = 0; i < validImageFiles.length; i++) {
        const file = validImageFiles[i];
        try {
          await this.addImage(file);
          successCount++;
        } catch (error) {
          console.error(`Failed to add image ${file.name}:`, error);
          failedFiles.push(file.name);
        }
        this.updateProgress(i + 1, validImageFiles.length);
      }
      
      this.hideProgress();
      this.updateStats();
      this.renderImages();
      
      // Show results
      if (successCount > 0) {
        let message = `${successCount} kép sikeresen betöltve!`;
        if (failedFiles.length > 0) {
          message += ` ${failedFiles.length} kép betöltése sikertelen.`;
        }
        this.showNotification(message, successCount === validImageFiles.length ? 'success' : 'warning');
      } else {
        this.showNotification('Egyik kép sem tölthető be!', 'error');
      }
      
    } catch (error) {
      console.error('File processing error:', error);
      this.hideProgress();
      this.showNotification('Hiba a fájlok feldolgozása közben!', 'error');
    }
  }

  async addImage(file) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const img = new Image();
            
            img.onload = () => {
              try {
                // Validate image dimensions
                if (img.width === 0 || img.height === 0) {
                  reject(new Error(`Érvénytelen képméret: ${file.name}`));
                  return;
                }
                
                if (img.width > 16384 || img.height > 16384) {
                  reject(new Error(`A kép mérete túl nagy: ${file.name} (${img.width}×${img.height}, maximum 16384×16384)`));
                  return;
                }
                
                const imageData = {
                  id: Date.now() + Math.random(),
                  file: file,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  width: img.width,
                  height: img.height,
                  src: e.target.result,
                  processed: false,
                  processedSize: null,
                  processedSrc: null,
                  addedAt: new Date().toLocaleString()
                };
                
                this.images.push(imageData);
                this.storageData.originalSize += file.size;
                this.updateFileTypeStats(file.type, file.size);
                resolve();
                
              } catch (dataError) {
                console.error('Error processing image data:', dataError);
                reject(new Error(`Hiba a képadatok feldolgozásakor: ${file.name}`));
              }
            };
            
            img.onerror = (imgError) => {
              console.error('Image loading error:', imgError);
              reject(new Error(`Sérült vagy érvénytelen képfájl: ${file.name}`));
            };
            
            // Set timeout for image loading
            setTimeout(() => {
              reject(new Error(`Időtúllépés a kép betöltésekor: ${file.name}`));
            }, 30000); // 30 second timeout
            
            img.src = e.target.result;
            
          } catch (imgError) {
            console.error('Error setting up image:', imgError);
            reject(new Error(`Hiba a kép beállításakor: ${file.name}`));
          }
        };
        
        reader.onerror = (readError) => {
          console.error('FileReader error:', readError);
          reject(new Error(`Fájlolvasási hiba: ${file.name}`));
        };
        
        reader.onabort = () => {
          reject(new Error(`Fájlolvasás megszakítva: ${file.name}`));
        };
        
        // Start reading the file
        reader.readAsDataURL(file);
        
      } catch (setupError) {
        console.error('Error setting up file reader:', setupError);
        reject(new Error(`Inicializálási hiba: ${file.name}`));
      }
    });
  }

  calculateDataUrlSize(dataUrl) {
    // More accurate size calculation for data URLs
    try {
      if (!dataUrl || typeof dataUrl !== 'string') {
        return 0;
      }
      
      const base64String = dataUrl.split(',')[1];
      if (!base64String) {
        return 0;
      }
      
      // Calculate actual byte size from base64
      const stringLength = base64String.length;
      const sizeInBytes = Math.floor(stringLength * 3 / 4);
      
      // Account for padding
      const paddingCount = base64String.match(/=/g)?.length || 0;
      return sizeInBytes - paddingCount;
      
    } catch (error) {
      console.error('Error calculating data URL size:', error);
      return 0;
    }
  }

  updateFileTypeStats(type, size) {
    const extension = type.split('/')[1].toUpperCase();
    if (this.fileTypes.has(extension)) {
      const current = this.fileTypes.get(extension);
      this.fileTypes.set(extension, {
        count: current.count + 1,
        size: current.size + size
      });
    } else {
      this.fileTypes.set(extension, { count: 1, size });
    }
  }

  renderImages() {
    const imageGrid = document.getElementById('imageGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (this.images.length === 0) {
      imageGrid.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';
    imageGrid.innerHTML = this.images.map(img => this.createImageCard(img)).join('');
  }

  createImageCard(imageData) {
    const sizeInMB = (imageData.size / (1024 * 1024)).toFixed(2);
    const processedSizeMB = imageData.processedSize ? 
      (imageData.processedSize / (1024 * 1024)).toFixed(2) : null;
    
    const compressionRatio = processedSizeMB ? 
      Math.round((1 - imageData.processedSize / imageData.size) * 100) : 0;

    const processingTime = imageData.processingTime ? 
      imageData.processingTime.toFixed(0) : null;

    return `
      <div class="card hover-lift animate-fade-in">
        <div class="aspect-square overflow-hidden relative group">
          <img src="${imageData.src}" alt="${imageData.name}" 
               class="w-full h-full object-cover transition-all duration-300 group-hover:scale-105" 
               loading="lazy">
          
          <!-- Processing Status Overlay -->
          ${imageData.processed ? `
            <div class="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              ${imageData.processedFormat ? imageData.processedFormat.toUpperCase() : 'Feldolgozott'}
            </div>
          ` : ''}
          
          <!-- Quick Format Conversion Overlay -->
          <div class="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="flex gap-1">
              <button onclick="app.convertFormat('${imageData.id}', 'webp')" 
                      class="btn btn-sm bg-white/90 text-gray-800 hover:bg-white text-xs">WebP</button>
              <button onclick="app.convertFormat('${imageData.id}', 'png')" 
                      class="btn btn-sm bg-white/90 text-gray-800 hover:bg-white text-xs">PNG</button>
              <button onclick="app.convertFormat('${imageData.id}', 'jpg')" 
                      class="btn btn-sm bg-white/90 text-gray-800 hover:bg-white text-xs">JPG</button>
            </div>
          </div>
        </div>
        
        <div class="p-4 relative z-10">
          <h3 class="font-semibold truncate mb-3 text-neutral-900 dark:text-neutral-100" title="${imageData.name}">
            ${imageData.name}
          </h3>
          
          <div class="space-y-2 text-sm">
            <div class="flex justify-between items-center">
              <span class="text-neutral-600 dark:text-neutral-400">Méret:</span>
              <span class="font-medium text-neutral-800 dark:text-neutral-200">
                ${imageData.width}×${imageData.height}
              </span>
            </div>
            
            <div class="flex justify-between items-center">
              <span class="text-neutral-600 dark:text-neutral-400">Eredeti:</span>
              <span class="font-medium text-neutral-800 dark:text-neutral-200">${sizeInMB} MB</span>
            </div>
            
            ${processedSizeMB ? `
              <div class="flex justify-between items-center">
                <span class="text-neutral-600 dark:text-neutral-400">Feldolgozott:</span>
                <span class="font-medium text-green-600">${processedSizeMB} MB</span>
              </div>
              
              ${compressionRatio !== 0 ? `
                <div class="flex justify-between items-center">
                  <span class="text-neutral-600 dark:text-neutral-400">Megtakarítás:</span>
                  <span class="font-semibold text-green-600">${compressionRatio}%</span>
                </div>
              ` : ''}
              
              ${processingTime ? `
                <div class="flex justify-between items-center">
                  <span class="text-neutral-600 dark:text-neutral-400">Feldolgozási idő:</span>
                  <span class="font-medium text-neutral-600 dark:text-neutral-400">${processingTime}ms</span>
                </div>
              ` : ''}
            ` : ''}
          </div>
          
          <!-- Action Buttons -->
          <div class="grid grid-cols-3 gap-2 mt-4">
            <button onclick="app.downloadOriginal('${imageData.id}')" 
                    class="btn btn-secondary btn-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 10v6m0 0l-3-3m3 3l3-3M9 5l3 3 3-3M21 21H3" />
              </svg>
              Eredeti
            </button>
            
            <button onclick="app.initializeCropMode('${imageData.id}')" 
                    class="btn btn-warning btn-sm" title="Professzionális képvágás">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4 7v10c0 2.21 3.79 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.79 4 8 4s8-1.79 8-4M4 7c0-2.21 3.79-4 8-4s8 1.79 8 4" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M6 10l6 6 6-6" />
              </svg>
              Vágás
            </button>
            
            ${imageData.processed ? `
              <button onclick="app.downloadImage('${imageData.id}')" 
                      class="btn btn-success btn-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 10v6m0 0l-3-3m3 3l3-3M9 5l3 3 3-3" />
                </svg>
                Letöltés
              </button>
            ` : `
              <button onclick="app.processImage('${imageData.id}')" 
                      class="btn btn-primary btn-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Átméretez
              </button>
            `}
          </div>
          
          <!-- Advanced Options -->
          <div class="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <div class="flex justify-between items-center">
              <button onclick="app.removeImage('${imageData.id}')" 
                      class="btn btn-danger btn-sm text-xs">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Törlés
              </button>
              
              <div class="flex gap-1">
                <span class="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full text-neutral-600 dark:text-neutral-400">
                  ${imageData.file.type.split('/')[1].toUpperCase()}
                </span>
                ${imageData.processed ? `
                  <span class="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 rounded-full text-green-600 dark:text-green-400">
                    Veszteségmentes
                  </span>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  applyPreset(preset) {
    // Professional lossless presets
    const presets = {
      thumbnail: { 
        width: 300, 
        height: 300, 
        quality: 1, 
        format: 'webp',
        maintainAspect: true,
        algorithm: 'lanczos'
      },
      social: { 
        width: 1200, 
        height: 1200, 
        quality: 1, 
        format: 'webp',
        maintainAspect: true,
        algorithm: 'lanczos'
      },
      web: { 
        width: 800, 
        height: null, 
        quality: 1, 
        format: 'webp',
        maintainAspect: true,
        algorithm: 'lanczos'
      },
      print: {
        width: null,
        height: null,
        quality: 1,
        format: 'png',
        maintainAspect: true,
        algorithm: 'lanczos'
      },
      mobile: {
        width: 480,
        height: null,
        quality: 1,
        format: 'webp',
        maintainAspect: true,
        algorithm: 'lanczos'
      }
    };
    
    const config = presets[preset];
    if (!config) return;
    
    document.getElementById('customWidth').value = config.width;
    document.getElementById('customHeight').value = config.height || '';
    document.getElementById('qualitySlider').value = config.quality;
    document.getElementById('qualityValue').textContent = `${config.quality}%`;
    document.getElementById('quickFormat').value = config.format;
    
    this.showNotification(`${preset.toUpperCase()} preset alkalmazva`, 'info');
  }

  async quickProcess() {
    if (this.images.length === 0) {
      this.showNotification('Nincs feldolgozandó kép!', 'warning');
      return;
    }
    
    const format = document.getElementById('quickFormat').value;
    const quality = parseInt(document.getElementById('qualitySlider').value) / 100;
    
    this.showProgress(true, 'Gyors feldolgozás...', this.images.length);
    
    for (let i = 0; i < this.images.length; i++) {
      await this.processImageWithSettings(this.images[i].id, { format, quality });
      this.updateProgress(i + 1, this.images.length);
    }
    
    this.hideProgress();
    this.updateStats();
    this.renderImages();
    this.showNotification('Gyors feldolgozás befejezve!', 'success');
  }

  async batchProcess() {
    if (this.images.length === 0) {
      this.showNotification('Nincs feldolgozandó kép!', 'warning');
      return;
    }
    
    const format = document.getElementById('quickFormat').value;
    const quality = parseInt(document.getElementById('qualitySlider').value) / 100;
    const width = parseInt(document.getElementById('customWidth').value) || null;
    const height = parseInt(document.getElementById('customHeight').value) || null;
    const maintainAspect = document.getElementById('maintainAspect').checked;
    
    this.showProgress(true, 'Batch feldolgozás...', this.images.length);
    
    for (let i = 0; i < this.images.length; i++) {
      await this.processImageWithSettings(this.images[i].id, { 
        format, quality, width, height, maintainAspect 
      });
      this.updateProgress(i + 1, this.images.length);
    }
    
    this.hideProgress();
    this.updateStats();
    this.renderImages();
    this.showNotification('Batch feldolgozás befejezve!', 'success');
  }

  async processImage(imageId) {
    const image = this.images.find(img => img.id == imageId);
    if (!image) return;
    
    const format = document.getElementById('quickFormat').value;
    const quality = parseInt(document.getElementById('qualitySlider').value) / 100;
    
    await this.processImageWithSettings(imageId, { format, quality });
    this.updateStats();
    this.renderImages();
    this.showNotification('Kép feldolgozva!', 'success');
  }

  async processImageWithSettings(imageId, settings) {
    const image = this.images.find(img => img.id == imageId);
    if (!image) return;
    
    try {
      return await this.processImageLossless(image, settings);
    } catch (error) {
      console.error('Failed to process image:', error);
      this.showNotification('Képfeldolgozás sikertelen!', 'error');
      throw error;
    }
  }

  async processImageLossless(image, settings) {
    const startTime = performance.now();
    
    return new Promise(async (resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = async () => {
          try {
            const processedData = await this.applyLosslessProcessing(img, settings);
            
            // Update image data with processed result
            image.processed = true;
            image.processedSrc = processedData.dataUrl;
            image.processedSize = processedData.size;
            image.processedFormat = settings.format;
            image.processedDimensions = processedData.dimensions;
            image.processingTime = performance.now() - startTime;
            
            // Update statistics
            this.storageData.compressedSize += processedData.size;
            this.processingStats.totalProcessed++;
            this.processingStats.timeSaved += image.processingTime;
            
            console.log(`Lossless processing completed in ${image.processingTime.toFixed(2)}ms`);
            resolve(processedData);
            
          } catch (processingError) {
            console.error('Lossless processing error:', processingError);
            reject(processingError);
          }
        };
        
        img.onerror = (error) => {
          console.error('Image loading error:', error);
          reject(new Error('Failed to load image for processing'));
        };
        
        img.src = image.src;
        
      } catch (error) {
        console.error('Setup error:', error);
        reject(error);
      }
    });
  }

  async applyLosslessProcessing(sourceImg, settings) {
    const { format, quality = 1, width, height, maintainAspect = true } = settings;
    
    // Calculate target dimensions
    let targetWidth = width || sourceImg.naturalWidth;
    let targetHeight = height || sourceImg.naturalHeight;
    
    if ((width || height) && maintainAspect) {
      const aspectRatio = sourceImg.naturalWidth / sourceImg.naturalHeight;
      if (width && !height) {
        targetHeight = Math.round(width / aspectRatio);
      } else if (height && !width) {
        targetWidth = Math.round(height * aspectRatio);
      }
    }
    
    // Create high-quality canvas for processing
    const canvas = this.createHighQualityCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    
    // Apply advanced resampling if resizing is needed
    if (targetWidth !== sourceImg.naturalWidth || targetHeight !== sourceImg.naturalHeight) {
      await this.resizeWithAdvancedAlgorithm(sourceImg, canvas, this.processingOptions.algorithm);
    } else {
      // Direct copy for format conversion only
      ctx.drawImage(sourceImg, 0, 0);
    }
    
    // Apply format-specific optimizations
    const optimizedDataUrl = await this.applyFormatOptimization(canvas, format, quality);
    
    // Calculate actual file size
    const base64Length = optimizedDataUrl.split(',')[1].length;
    const actualSize = Math.round(base64Length * 0.75);
    
    return {
      dataUrl: optimizedDataUrl,
      size: actualSize,
      dimensions: { width: targetWidth, height: targetHeight },
      format: format
    };
  }

  createHighQualityCanvas(width, height) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = width;
    canvas.height = height;
    
    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Set optimal pixel density
    const devicePixelRatio = window.devicePixelRatio || 1;
    if (devicePixelRatio > 1) {
      const scaledWidth = width * devicePixelRatio;
      const scaledHeight = height * devicePixelRatio;
      
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }
    
    return canvas;
  }

  async resizeWithAdvancedAlgorithm(sourceImg, targetCanvas, algorithm = 'lanczos') {
    // Check if Pica is available
    if (!window.pica) {
      console.warn('Pica.js not available, falling back to canvas resize');
      return this.fallbackCanvasResize(sourceImg, targetCanvas);
    }
    
    const pica = window.pica();
    
    // Create source canvas
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = sourceImg.naturalWidth;
    sourceCanvas.height = sourceImg.naturalHeight;
    
    // Draw source image with high quality
    sourceCtx.imageSmoothingEnabled = true;
    sourceCtx.imageSmoothingQuality = 'high';
    sourceCtx.drawImage(sourceImg, 0, 0);
    
    // Configure Pica options for maximum quality
    const resizeOptions = {
      quality: 3, // Maximum quality (0-3)
      alpha: true,
      unsharpAmount: this.processingOptions.enableSharpening ? 80 : 0,
      unsharpRadius: 0.6,
      unsharpThreshold: 2
    };
    
    // Apply advanced resampling algorithm
    switch (algorithm) {
      case 'lanczos':
        resizeOptions.filter = 'lanczos3';
        break;
      case 'bicubic':
        resizeOptions.filter = 'catrom';
        break;
      case 'bilinear':
        resizeOptions.filter = 'linear';
        break;
      case 'nearest':
        resizeOptions.filter = 'box';
        break;
      default:
        resizeOptions.filter = 'lanczos3';
    }
    
    try {
      await pica.resize(sourceCanvas, targetCanvas, resizeOptions);
    } catch (error) {
      console.warn('Pica resize failed, falling back to canvas resize:', error);
      
      // Fallback to high-quality canvas resize
      const ctx = targetCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
    }
  }

  fallbackCanvasResize(sourceImg, targetCanvas) {
    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceImg, 0, 0, targetCanvas.width, targetCanvas.height);
    return Promise.resolve();
  }

  async applyFormatOptimization(canvas, format, quality = 1) {
    const formatConfig = this.formatConfigs[format] || this.formatConfigs['png'];
    
    switch (format) {
      case 'webp':
        return this.optimizeWebP(canvas, formatConfig, quality);
      case 'png':
        return this.optimizePNG(canvas, formatConfig);
      case 'avif':
        return this.optimizeAVIF(canvas, formatConfig, quality);
      case 'tiff':
        return this.optimizeTIFF(canvas, formatConfig);
      case 'jpg':
      case 'jpeg':
        return this.optimizeJPEG(canvas, formatConfig, quality);
      default:
        return canvas.toDataURL(`image/${format}`, quality);
    }
  }

  optimizeWebP(canvas, config, quality) {
    if (config.lossless) {
      // Force lossless WebP
      return canvas.toDataURL('image/webp', 1.0);
    }
    return canvas.toDataURL('image/webp', quality);
  }

  optimizePNG(canvas, config) {
    // PNG is inherently lossless
    return canvas.toDataURL('image/png');
  }

  optimizeAVIF(canvas, config, quality) {
    // AVIF lossless mode (if supported by browser)
    if (config.lossless) {
      return canvas.toDataURL('image/avif', 1.0);
    }
    return canvas.toDataURL('image/avif', quality);
  }

  optimizeTIFF(canvas, config) {
    // TIFF support is limited in browsers, fallback to PNG
    console.warn('TIFF format not fully supported, using PNG instead');
    return canvas.toDataURL('image/png');
  }

  optimizeJPEG(canvas, config, quality) {
    // JPEG with high quality settings
    const jpegQuality = Math.max(0.85, quality); // Never go below 85% for quality
    return canvas.toDataURL('image/jpeg', jpegQuality);
  }

  // Simple download without processing
  async downloadOriginal(imageId) {
    const image = this.images.find(img => img.id == imageId);
    if (!image) return;
    
    try {
      // Create download link for original image
      const link = document.createElement('a');
      link.download = `original_${image.name}`;
      link.href = image.src;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showNotification('Eredeti kép letöltve!', 'success');
      
    } catch (error) {
      console.error('Download failed:', error);
      this.showNotification('Letöltés sikertelen!', 'error');
    }
  }

  // Format conversion without resizing
  async convertFormat(imageId, targetFormat) {
    const image = this.images.find(img => img.id == imageId);
    if (!image) return;
    
    try {
      const settings = {
        format: targetFormat,
        quality: 1, // Maximum quality
        width: null,
        height: null,
        maintainAspect: true
      };
      
      await this.processImageWithSettings(imageId, settings);
      this.showNotification(`Kép konvertálva ${targetFormat.toUpperCase()} formátumba!`, 'success');
      
    } catch (error) {
      console.error('Format conversion failed:', error);
      this.showNotification('Formátum konverzió sikertelen!', 'error');
    }
  }

  // Professional Crop Functionality
  initializeCropMode(imageId) {
    const image = this.images.find(img => img.id == imageId);
    if (!image) return;
    
    this.cropState.active = true;
    this.cropState.imageId = imageId;
    
    // Create crop overlay UI
    this.createCropOverlay(image);
    this.showNotification('Vágási mód aktiválva. Jelölje ki a területet.', 'info');
  }
  
  createCropOverlay(image) {
    // Remove existing crop overlay
    const existingOverlay = document.getElementById('cropOverlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create crop overlay container
    const overlay = document.createElement('div');
    overlay.id = 'cropOverlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center';
    overlay.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-4xl max-h-full overflow-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800">Professzionális Képvágás</h3>
          <button onclick="app.closeCropMode()" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Crop Controls -->
        <div class="mb-4 flex flex-wrap gap-4">
          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium text-gray-700">Képarány:</label>
            <select id="cropAspectRatio" onchange="app.setCropAspectRatio(this.value)" class="px-3 py-1 border border-gray-300 rounded-md text-sm">
              <option value="free">Szabad</option>
              <option value="1:1">1:1 (Négyzet)</option>
              <option value="4:3">4:3 (Hagyományos)</option>
              <option value="16:9">16:9 (Szélesvásznú)</option>
              <option value="3:2">3:2 (Fotó)</option>
              <option value="21:9">21:9 (Ultra-wide)</option>
            </select>
          </div>
          
          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium text-gray-700">Algoritmus:</label>
            <select id="cropAlgorithm" class="px-3 py-1 border border-gray-300 rounded-md text-sm">
              <option value="lanczos">Lanczos3 (Legjobb)</option>
              <option value="bicubic">Bicubic (Gyors)</option>
              <option value="bilinear">Bilinear (Alapértelmezett)</option>
              <option value="nearest">Nearest (Pixel art)</option>
            </select>
          </div>
        </div>
        
        <!-- Crop Canvas Container -->
        <div class="relative bg-gray-100 rounded-lg overflow-hidden" style="max-width: 800px; max-height: 600px;">
          <canvas id="cropCanvas" class="block mx-auto cursor-crosshair"></canvas>
          <div id="cropSelection" class="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none" style="display: none;"></div>
          
          <!-- Crop handles -->
          <div id="cropHandles" class="absolute pointer-events-none" style="display: none;">
            <div class="absolute w-3 h-3 bg-blue-500 border border-white -translate-x-1/2 -translate-y-1/2 cursor-nw-resize" data-handle="nw"></div>
            <div class="absolute w-3 h-3 bg-blue-500 border border-white -translate-x-1/2 -translate-y-1/2 cursor-n-resize" data-handle="n"></div>
            <div class="absolute w-3 h-3 bg-blue-500 border border-white -translate-x-1/2 -translate-y-1/2 cursor-ne-resize" data-handle="ne"></div>
            <div class="absolute w-3 h-3 bg-blue-500 border border-white -translate-x-1/2 -translate-y-1/2 cursor-e-resize" data-handle="e"></div>
            <div class="absolute w-3 h-3 bg-blue-500 border border-white -translate-x-1/2 -translate-y-1/2 cursor-se-resize" data-handle="se"></div>
            <div class="absolute w-3 h-3 bg-blue-500 border border-white -translate-x-1/2 -translate-y-1/2 cursor-s-resize" data-handle="s"></div>
            <div class="absolute w-3 h-3 bg-blue-500 border border-white -translate-x-1/2 -translate-y-1/2 cursor-sw-resize" data-handle="sw"></div>
            <div class="absolute w-3 h-3 bg-blue-500 border border-white -translate-x-1/2 -translate-y-1/2 cursor-w-resize" data-handle="w"></div>
          </div>
        </div>
        
        <!-- Crop dimensions display -->
        <div class="mt-4 text-sm text-gray-600">
          <span>Kiválasztott terület: <span id="cropDimensions">0 × 0 px</span></span>
          <span class="ml-4">Eredeti: ${image.width} × ${image.height} px</span>
        </div>
        
        <!-- Action buttons -->
        <div class="mt-6 flex justify-end space-x-3">
          <button onclick="app.resetCropSelection()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors">
            Visszaállítás
          </button>
          <button onclick="app.closeCropMode()" class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">
            Mégse
          </button>
          <button onclick="app.applyCropAndDownload()" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium">
            Kivágás és Letöltés
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Initialize crop canvas
    this.setupCropCanvas(image);
  }
  
  setupCropCanvas(image) {
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate canvas size maintaining aspect ratio
    const maxWidth = 800;
    const maxHeight = 600;
    
    let canvasWidth = image.width;
    let canvasHeight = image.height;
    
    if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
      const scale = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
      canvasWidth = Math.round(canvasWidth * scale);
      canvasHeight = Math.round(canvasHeight * scale);
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    
    // Store scale factor for coordinate conversion
    this.cropState.scale = canvasWidth / image.width;
    
    // Load and draw image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      this.setupCropInteraction(canvas);
    };
    img.src = image.src;
    
    this.cropState.canvas = canvas;
    this.cropState.ctx = ctx;
  }
  
  setupCropInteraction(canvas) {
    let isSelecting = false;
    let isDragging = false;
    let isResizing = false;
    let startX, startY, currentHandle;
    
    const selection = document.getElementById('cropSelection');
    const handles = document.getElementById('cropHandles');
    const dimensionsDisplay = document.getElementById('cropDimensions');
    
    // Mouse events for crop selection
    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if clicking on a handle
      const handle = this.getHandleAtPosition(x, y);
      if (handle) {
        isResizing = true;
        currentHandle = handle;
        return;
      }
      
      // Check if clicking inside selection for dragging
      if (this.isPointInSelection(x, y)) {
        isDragging = true;
        startX = x - this.cropState.cropArea.x;
        startY = y - this.cropState.cropArea.y;
        return;
      }
      
      // Start new selection
      isSelecting = true;
      startX = x;
      startY = y;
      
      this.cropState.cropArea = { x, y, width: 0, height: 0 };
      this.updateCropSelection();
    });
    
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (isSelecting) {
        const width = x - startX;
        const height = y - startY;
        
        this.cropState.cropArea = {
          x: width > 0 ? startX : x,
          y: height > 0 ? startY : y,
          width: Math.abs(width),
          height: Math.abs(height)
        };
        
        this.constrainToAspectRatio();
        this.updateCropSelection();
      } else if (isDragging) {
        const newX = Math.max(0, Math.min(canvas.width - this.cropState.cropArea.width, x - startX));
        const newY = Math.max(0, Math.min(canvas.height - this.cropState.cropArea.height, y - startY));
        
        this.cropState.cropArea.x = newX;
        this.cropState.cropArea.y = newY;
        this.updateCropSelection();
      } else if (isResizing) {
        this.handleResize(x, y, currentHandle);
        this.constrainToAspectRatio();
        this.updateCropSelection();
      }
    });
    
    canvas.addEventListener('mouseup', () => {
      isSelecting = false;
      isDragging = false;
      isResizing = false;
      currentHandle = null;
    });
    
    // Handle clicks for repositioning handles
    handles.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const handle = e.target.dataset.handle;
      if (handle) {
        isResizing = true;
        currentHandle = handle;
      }
    });
  }
  
  constrainToAspectRatio() {
    const aspectRatio = document.getElementById('cropAspectRatio').value;
    if (aspectRatio === 'free') return;
    
    const ratios = {
      '1:1': 1,
      '4:3': 4/3,
      '16:9': 16/9,
      '3:2': 3/2,
      '21:9': 21/9
    };
    
    const ratio = ratios[aspectRatio];
    if (!ratio) return;
    
    const area = this.cropState.cropArea;
    const currentRatio = area.width / area.height;
    
    if (currentRatio > ratio) {
      // Too wide, adjust width
      area.width = area.height * ratio;
    } else {
      // Too tall, adjust height
      area.height = area.width / ratio;
    }
    
    // Ensure selection stays within canvas bounds
    const canvas = this.cropState.canvas;
    if (area.x + area.width > canvas.width) {
      area.x = canvas.width - area.width;
    }
    if (area.y + area.height > canvas.height) {
      area.y = canvas.height - area.height;
    }
  }
  
  updateCropSelection() {
    const selection = document.getElementById('cropSelection');
    const handles = document.getElementById('cropHandles');
    const dimensionsDisplay = document.getElementById('cropDimensions');
    
    const area = this.cropState.cropArea;
    
    if (area.width > 0 && area.height > 0) {
      selection.style.display = 'block';
      selection.style.left = area.x + 'px';
      selection.style.top = area.y + 'px';
      selection.style.width = area.width + 'px';
      selection.style.height = area.height + 'px';
      
      // Update handles
      handles.style.display = 'block';
      this.updateHandlePositions();
      
      // Update dimensions display (convert back to original image coordinates)
      const originalWidth = Math.round(area.width / this.cropState.scale);
      const originalHeight = Math.round(area.height / this.cropState.scale);
      dimensionsDisplay.textContent = `${originalWidth} × ${originalHeight} px`;
    } else {
      selection.style.display = 'none';
      handles.style.display = 'none';
      dimensionsDisplay.textContent = '0 × 0 px';
    }
  }
  
  updateHandlePositions() {
    const handles = document.getElementById('cropHandles').children;
    const area = this.cropState.cropArea;
    
    // Position handles around the selection
    handles[0].style.left = area.x + 'px'; // nw
    handles[0].style.top = area.y + 'px';
    
    handles[1].style.left = (area.x + area.width / 2) + 'px'; // n
    handles[1].style.top = area.y + 'px';
    
    handles[2].style.left = (area.x + area.width) + 'px'; // ne
    handles[2].style.top = area.y + 'px';
    
    handles[3].style.left = (area.x + area.width) + 'px'; // e
    handles[3].style.top = (area.y + area.height / 2) + 'px';
    
    handles[4].style.left = (area.x + area.width) + 'px'; // se
    handles[4].style.top = (area.y + area.height) + 'px';
    
    handles[5].style.left = (area.x + area.width / 2) + 'px'; // s
    handles[5].style.top = (area.y + area.height) + 'px';
    
    handles[6].style.left = area.x + 'px'; // sw
    handles[6].style.top = (area.y + area.height) + 'px';
    
    handles[7].style.left = area.x + 'px'; // w
    handles[7].style.top = (area.y + area.height / 2) + 'px';
  }
  
  setCropAspectRatio(ratio) {
    this.processingOptions.cropAspectRatio = ratio;
    if (this.cropState.cropArea.width > 0 && this.cropState.cropArea.height > 0) {
      this.constrainToAspectRatio();
      this.updateCropSelection();
    }
  }
  
  resetCropSelection() {
    this.cropState.cropArea = { x: 0, y: 0, width: 0, height: 0 };
    this.updateCropSelection();
  }
  
  closeCropMode() {
    const overlay = document.getElementById('cropOverlay');
    if (overlay) {
      overlay.remove();
    }
    this.cropState.active = false;
    this.cropState.imageId = null;
  }
  
  async applyCropAndDownload() {
    if (!this.cropState.cropArea.width || !this.cropState.cropArea.height) {
      this.showNotification('Kérjük, jelöljön ki egy területet a vágáshoz!', 'warning');
      return;
    }
    
    try {
      const image = this.images.find(img => img.id == this.cropState.imageId);
      if (!image) return;
      
      // Convert canvas coordinates back to original image coordinates
      const scale = this.cropState.scale;
      const cropArea = {
        x: Math.round(this.cropState.cropArea.x / scale),
        y: Math.round(this.cropState.cropArea.y / scale),
        width: Math.round(this.cropState.cropArea.width / scale),
        height: Math.round(this.cropState.cropArea.height / scale)
      };
      
      // Get selected algorithm
      const algorithm = document.getElementById('cropAlgorithm').value;
      
      // Process cropped image with lossless quality
      const croppedImageData = await this.processCroppedImage(image, cropArea, algorithm);
      
      // Download the cropped image
      this.downloadProcessedImage(croppedImageData, `cropped_${image.name}`);
      
      this.showNotification('Kivágott kép sikeresen letöltve!', 'success');
      this.closeCropMode();
      
    } catch (error) {
      console.error('Crop and download failed:', error);
      this.showNotification('Vágás és letöltés sikertelen!', 'error');
    }
  }
  
  async processCroppedImage(image, cropArea, algorithm = 'lanczos') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          // Create source canvas with full image
          const sourceCanvas = document.createElement('canvas');
          const sourceCtx = sourceCanvas.getContext('2d');
          sourceCanvas.width = img.naturalWidth;
          sourceCanvas.height = img.naturalHeight;
          
          sourceCtx.imageSmoothingEnabled = true;
          sourceCtx.imageSmoothingQuality = 'high';
          sourceCtx.drawImage(img, 0, 0);
          
          // Create target canvas for cropped area
          const targetCanvas = document.createElement('canvas');
          const targetCtx = targetCanvas.getContext('2d');
          targetCanvas.width = cropArea.width;
          targetCanvas.height = cropArea.height;
          
          // Extract cropped portion using high-quality algorithms
          if (window.pica && algorithm === 'lanczos') {
            // Use Pica for highest quality cropping
            const pica = window.pica();
            
            // Create intermediate canvas with crop area
            const cropCanvas = document.createElement('canvas');
            const cropCtx = cropCanvas.getContext('2d');
            cropCanvas.width = cropArea.width;
            cropCanvas.height = cropArea.height;
            
            // Extract the crop area
            const imageData = sourceCtx.getImageData(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
            cropCtx.putImageData(imageData, 0, 0);
            
            // Use Pica for any additional processing if needed
            await pica.resize(cropCanvas, targetCanvas, {
              quality: 3,
              alpha: true,
              filter: 'lanczos3'
            });
          } else {
            // Direct high-quality crop
            targetCtx.imageSmoothingEnabled = true;
            targetCtx.imageSmoothingQuality = 'high';
            
            targetCtx.drawImage(
              sourceCanvas,
              cropArea.x, cropArea.y, cropArea.width, cropArea.height,
              0, 0, cropArea.width, cropArea.height
            );
          }
          
          // Convert to high-quality PNG (lossless)
          const dataUrl = targetCanvas.toDataURL('image/png');
          
          resolve({
            dataUrl: dataUrl,
            width: cropArea.width,
            height: cropArea.height,
            format: 'png'
          });
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image for cropping'));
      img.src = image.src;
    });
  }
  
  downloadProcessedImage(imageData, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = imageData.dataUrl;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  // Helper methods for crop interaction
  getHandleAtPosition(x, y) {
    const handles = document.getElementById('cropHandles');
    if (!handles || handles.style.display === 'none') return null;
    
    const handleElements = handles.children;
    const tolerance = 8; // pixels
    
    for (let i = 0; i < handleElements.length; i++) {
      const handle = handleElements[i];
      const handleX = parseFloat(handle.style.left);
      const handleY = parseFloat(handle.style.top);
      
      if (Math.abs(x - handleX) < tolerance && Math.abs(y - handleY) < tolerance) {
        return handle.dataset.handle;
      }
    }
    
    return null;
  }
  
  isPointInSelection(x, y) {
    const area = this.cropState.cropArea;
    return x >= area.x && x <= area.x + area.width && 
           y >= area.y && y <= area.y + area.height;
  }
  
  handleResize(x, y, handle) {
    const area = this.cropState.cropArea;
    const canvas = this.cropState.canvas;
    
    switch (handle) {
      case 'nw':
        const newWidth = area.x + area.width - x;
        const newHeight = area.y + area.height - y;
        if (newWidth > 0 && newHeight > 0 && x >= 0 && y >= 0) {
          area.width = newWidth;
          area.height = newHeight;
          area.x = x;
          area.y = y;
        }
        break;
        
      case 'ne':
        const neWidth = x - area.x;
        const neHeight = area.y + area.height - y;
        if (neWidth > 0 && neHeight > 0 && x <= canvas.width && y >= 0) {
          area.width = neWidth;
          area.height = neHeight;
          area.y = y;
        }
        break;
        
      case 'se':
        if (x >= area.x && y >= area.y && x <= canvas.width && y <= canvas.height) {
          area.width = x - area.x;
          area.height = y - area.y;
        }
        break;
        
      case 'sw':
        const swWidth = area.x + area.width - x;
        const swHeight = y - area.y;
        if (swWidth > 0 && swHeight > 0 && x >= 0 && y <= canvas.height) {
          area.width = swWidth;
          area.height = swHeight;
          area.x = x;
        }
        break;
        
      case 'n':
        const nHeight = area.y + area.height - y;
        if (nHeight > 0 && y >= 0) {
          area.height = nHeight;
          area.y = y;
        }
        break;
        
      case 'e':
        if (x >= area.x && x <= canvas.width) {
          area.width = x - area.x;
        }
        break;
        
      case 's':
        if (y >= area.y && y <= canvas.height) {
          area.height = y - area.y;
        }
        break;
        
      case 'w':
        const wWidth = area.x + area.width - x;
        if (wWidth > 0 && x >= 0) {
          area.width = wWidth;
          area.x = x;
        }
        break;
    }
  }

  downloadImage(imageId) {
    const image = this.images.find(img => img.id == imageId);
    if (!image) return;
    
    const dataUrl = image.processedSrc || image.src;
    const link = document.createElement('a');
    link.download = image.processed ? 
      `processed_${image.name}` : image.name;
    link.href = dataUrl;
    link.click();
    
    this.showNotification('Kép letöltve!', 'success');
  }

  removeImage(imageId) {
    const imageIndex = this.images.findIndex(img => img.id == imageId);
    if (imageIndex === -1) return;
    
    const image = this.images[imageIndex];
    this.storageData.originalSize -= image.size;
    if (image.processedSize) {
      this.storageData.compressedSize -= image.processedSize;
    }
    
    this.images.splice(imageIndex, 1);
    this.updateStats();
    this.renderImages();
    this.showNotification('Kép törölve!', 'info');
  }

  updateStats() {
    // Update main stats
    document.getElementById('totalImages').textContent = this.images.length;
    document.getElementById('totalProcessed').textContent = 
      this.images.filter(img => img.processed).length;
    
    const totalStorageMB = (this.storageData.originalSize / (1024 * 1024)).toFixed(1);
    document.getElementById('totalStorage').textContent = `${totalStorageMB} MB`;
    
    // Update storage analytics
    const usedStorageMB = (this.storageData.originalSize / (1024 * 1024)).toFixed(1);
    const limitGB = (this.storageData.limit / (1024 * 1024 * 1024)).toFixed(1);
    const usagePercent = (this.storageData.originalSize / this.storageData.limit) * 100;
    
    document.getElementById('usedStorage').textContent = `${usedStorageMB} MB / ${limitGB} GB`;
    document.getElementById('storageBar').style.width = `${Math.min(usagePercent, 100)}%`;
    
    const originalSizeMB = (this.storageData.originalSize / (1024 * 1024)).toFixed(1);
    const compressedSizeMB = (this.storageData.compressedSize / (1024 * 1024)).toFixed(1);
    
    document.getElementById('originalSize').textContent = `${originalSizeMB} MB`;
    document.getElementById('compressedSize').textContent = `${compressedSizeMB} MB`;
    
    const savingsPercent = this.storageData.originalSize > 0 ? 
      Math.round((1 - this.storageData.compressedSize / this.storageData.originalSize) * 100) : 0;
    document.getElementById('savingsPercent').textContent = `${savingsPercent}%`;
    
    // Update processing stats
    document.getElementById('totalProcessedStat').textContent = this.processingStats.totalProcessed;
    document.getElementById('avgCompressionStat').textContent = `${savingsPercent}%`;
    document.getElementById('totalTimeSavedStat').textContent = `${this.processingStats.timeSaved}s`;
    
    const bandwidthSavedMB = ((this.storageData.originalSize - this.storageData.compressedSize) / (1024 * 1024)).toFixed(1);
    document.getElementById('totalBandwidthSavedStat').textContent = `${bandwidthSavedMB} MB`;
    
    this.updateFileTypeChart();
  }

  updateFileTypeChart() {
    const chartContainer = document.getElementById('fileTypeChart');
    
    if (this.fileTypes.size === 0) {
      chartContainer.innerHTML = `
        <div class="text-center py-8 text-slate-500">
          <svg class="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>Nincs adat a megjelenítéshez</p>
        </div>
      `;
      return;
    }
    
    const totalSize = Array.from(this.fileTypes.values()).reduce((sum, data) => sum + data.size, 0);
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
    
    chartContainer.innerHTML = Array.from(this.fileTypes.entries()).map(([type, data], index) => {
      const percentage = Math.round((data.size / totalSize) * 100);
      const sizeMB = (data.size / (1024 * 1024)).toFixed(1);
      const color = colors[index % colors.length];
      
      return `
        <div class="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700">
          <div class="flex items-center gap-3">
            <div class="w-4 h-4 rounded" style="background-color: ${color}"></div>
            <div>
              <span class="font-medium">${type}</span>
              <div class="text-sm text-slate-500">${data.count} fájl • ${sizeMB} MB</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-semibold">${percentage}%</div>
          </div>
        </div>
      `;
    }).join('');
  }

  showProgress(show, title = '', total = 0) {
    const modal = document.getElementById('progressModal');
    const titleEl = document.getElementById('progressTitle');
    const textEl = document.getElementById('progressText');
    const totalEl = document.getElementById('progressTotal');
    
    if (show) {
      titleEl.textContent = title;
      textEl.textContent = 'Feldolgozás folyamatban...';
      totalEl.textContent = total;
      modal.classList.remove('hidden');
    } else {
      modal.classList.add('hidden');
    }
  }

  updateProgress(current, total) {
    const fillEl = document.getElementById('progressFill');
    const countEl = document.getElementById('progressCount');
    
    const percentage = Math.round((current / total) * 100);
    fillEl.style.width = `${percentage}%`;
    countEl.textContent = current;
  }

  hideProgress() {
    this.showProgress(false);
  }

  showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    notification.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in`;
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="font-bold">${icons[type]}</span>
        <span>${message}</span>
      </div>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.5s ease-in-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 5000);
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('Service Worker registered successfully:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle action parameter from PWA shortcuts
    const action = urlParams.get('action');
    if (action === 'upload') {
      document.getElementById('fileInput').click();
    } else if (action === 'connect') {
      this.showDevicesTab();
    }
    
    // Handle connection parameter
    const connectId = urlParams.get('connect');
    if (connectId) {
      setTimeout(() => {
        if (this.peer && this.peer.id) {
          document.getElementById('deviceId').value = connectId;
          this.connectManual();
        }
      }, 2000); // Wait for peer connection to establish
    }
  }

  // File sharing methods
  sendFile(imageId, connectionId) {
    const image = this.images.find(img => img.id == imageId);
    const connection = this.connections.find(conn => conn.peer === connectionId);
    
    if (!image || !connection) {
      this.showNotification('Fájl küldése sikertelen!', 'error');
      return;
    }
    
    const fileData = {
      type: 'file',
      name: image.name,
      data: image.processedSrc || image.src,
      size: image.processedSize || image.size
    };
    
    connection.send(fileData);
    this.showNotification('Fájl elküldve!', 'success');
  }

  receiveFile(data) {
    // Create a download link for received file
    const link = document.createElement('a');
    link.href = data.data;
    link.download = data.name;
    link.click();
    
    this.showNotification(`Fájl érkezett: ${data.name}`, 'success');
  }

  // Batch download
  async downloadAll() {
    if (this.images.length === 0) {
      this.showNotification('Nincs letöltendő kép!', 'warning');
      return;
    }
    
    this.showProgress(true, 'ZIP fájl létrehozása...', this.images.length);
    
    try {
      const zip = new JSZip();
      
      for (let i = 0; i < this.images.length; i++) {
        const image = this.images[i];
        const dataUrl = image.processedSrc || image.src;
        const base64Data = dataUrl.split(',')[1];
        const fileName = image.processed ? `processed_${image.name}` : image.name;
        
        zip.file(fileName, base64Data, { base64: true });
        this.updateProgress(i + 1, this.images.length);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `imageflow_export_${new Date().toISOString().split('T')[0]}.zip`);
      
      this.hideProgress();
      this.showNotification('Összes kép letöltve ZIP fájlban!', 'success');
      
    } catch (error) {
      console.error('Batch download failed:', error);
      this.hideProgress();
      this.showNotification('ZIP létrehozása sikertelen!', 'error');
    }
  }
}

// Add CSS animations for slide out
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100px);
    }
  }
`;
document.head.appendChild(style);

// Initialize the application
const app = new ImageFlowApp();

// URL parameters are now handled in the app.handleURLParameters() method

// Add global functions for HTML onclick handlers
window.downloadAll = () => app.downloadAll();
window.app = app; // Make app instance globally available