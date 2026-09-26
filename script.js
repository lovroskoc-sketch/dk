// Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbza0aBdwRot9YdGNpd42EuoRhj_jNjPiLXcN1X5AuXcJF-DB26ZUyXAG95XYy1zwM8/exec';

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');

// 1. Potpuna blokada zadatog ponašanja preglednika (da ne otvara datoteku u novom tabu)
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
  // 2. Bojanje u limun-žutu (klasa drag-over iz Projektcss.css)
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

  // 3. Reagiranje na spuštanje datoteke (Drop)
  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, false);

  // Klik za odabir datoteke
  dropArea.addEventListener('click', () => fileInput.click());
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });
}

// Pomoćna funkcija za pretvaranje datoteke u Base64 format
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

// Prikaz slika ili videa ovisno o formatu
// Prikaz slika ili videa ovisno o formatu
function displayMedia(url, fileName = '') {
  if (!previewContainer) return;

  const isVideo = /\.(mp4|mov|avi|mkv|webm|3gp|flv|wmv)$/i.test(fileName || url);

  // Izvlačenje Google Drive ID-a
  let fileId = '';
  const match = url.match(/[-\w]{25,}/);
  if (match) {
    fileId = match[0];
  }

  if (isVideo) {
    // Za videozapise koristimo Google Drive ugradbeni player (iframe) koji sigurno radi na svim uređajima
    const iframe = document.createElement('iframe');
    iframe.src = fileId 
      ? `https://drive.google.com/file/d/${fileId}/preview` 
      : url;
    iframe.classList.add('preview-media');
    iframe.style.width = '100%';
    iframe.style.maxWidth = '400px';
    iframe.style.height = '250px';
    iframe.style.border = 'none';
    iframe.allow = 'autoplay';
    previewContainer.appendChild(iframe);
  } else {
    const img = document.createElement('img');
    // Koristimo thumbnail pretpregled od Googlea za 100% stabilan prikaz slika
    img.src = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : url;
    img.classList.add('preview-media');
    img.alt = fileName || 'Slika';
    previewContainer.appendChild(img);
  }
}

// 5. Automatsko učitavanje spremljenih slika i videa s Google Drivea
async function loadSavedImages() {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const result = await response.json();

    if (result.status === 'success' && result.files) {
      // Očisti stari prikaz prije učitavanja
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
