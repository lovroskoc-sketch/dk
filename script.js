// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbza0aBdwRot9YdGNpd42EuoRhj_jNjPiLXcN1X5AuXcJF-DB26ZUyXAG95XYy1zwM8/exec';

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');

// 1. Blokada zadatog ponašanja preglednika
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  window.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, false);

  if (dropArea) {
    dropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  }
});

if (dropArea) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener('dragenter', () => {
      dropArea.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
      dropArea.classList.remove('drag-over');
    }, false);
  });

  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, false);

  dropArea.addEventListener('click', () => fileInput.click());
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
}

// 4. Slanje slika i videa na Google Drive
async function handleFiles(files) {
  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|flv|wmv)$/i.test(file.name);

    if (!isImage && !isVideo) {
      alert(`Datoteka ${file.name} nije podržani format slike ili videa.`);
      continue;
    }

    const originalText = dropArea.innerText;
    dropArea.innerText = `Spremam ${file.name}...`;

    try {
      const base64Data = await fileToBase64(file);
      const payload = {
        fileName: `${Date.now()}_${file.name}`,
        mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        base64: base64Data
      };

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.status === 'success') {
        displayMedia(result.fileUrl, file.name);
      } else {
        alert('Greška pri spremanju: ' + result.message);
      }
    } catch (err) {
      console.error('Prijenos neuspješan:', err);
      alert('Greška pri slanju datoteke na Google Drive.');
    } finally {
      dropArea.innerText = originalText;
    }
  }
}

// 5. Prikaz medija s pouzdanom detekcijom formata
function displayMedia(url, fileName = '') {
  if (!previewContainer) return;

  const isVideo = /\.(mp4|mov|avi|mkv|webm|3gp|flv|wmv)$/i.test(fileName) || 
                  /\.(mp4|mov|avi|mkv|webm|3gp|flv|wmv)$/i.test(url) ||
                  fileName.toLowerCase().includes('video');

  let fileId = '';
  const match = url.match(/[-\w]{25,}/);
  if (match) {
    fileId = match[0];
  }

  if (isVideo) {
    // Google Drive iframe s dovoljnom visinom i omjerom 16:9 da kontrole ne budu odsječene
    const iframe = document.createElement('iframe');
    iframe.src = fileId 
      ? `https://drive.google.com/file/d/${fileId}/preview` 
      : url;
    iframe.classList.add('preview-media', 'video-embed');
    iframe.style.width = '100%';
    iframe.style.maxWidth = '400px';
    iframe.style.height = '280px';
    iframe.style.border = 'none';
    iframe.setAttribute('allowfullscreen', 'true');
    previewContainer.appendChild(iframe);
  } else {
    // CDN prikaz slika
    const img = document.createElement('img');
    img.src = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : url;
    img.classList.add('preview-media');
    img.alt = fileName || 'Medij';
    previewContainer.appendChild(img);
  }
}

// 6. Učitavanje spremljenih datoteka
async function loadSavedImages() {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const result = await response.json();

    if (result.status === 'success' && result.files) {
      if (previewContainer) previewContainer.innerHTML = '';
      
      for (const file of result.files) {
        displayMedia(file.url, file.name);
      }
    }
  } catch (err) {
    console.error('Učitavanje s Google Drivea nije uspjelo:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadSavedImages);
