// Konfiguracija za Supabase
const SUPABASE_URL = 'https://hypzuumvrjalyakdfdtp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5cHp1dW12cmphbHlha2RmZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NzkyODcsImV4cCI6MjEwNTI1NTI4N30.nf7SCA8tVGlakxLrwlJ_ZJa38Nc590dTDiGF2KDu0Ls';

// Inicijalizacija klijenta pod imenom supabaseClient (kako ne bi izbacivalo SyntaxError)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// 4. Slanje slika i videa na Supabase
async function handleFiles(files) {
  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|3gp|flv|wmv)$/i.test(file.name);

    if (!isImage && !isVideo) {
      alert(`Datoteka ${file.name} nije podržani format slike ili videa.`);
      continue;
    }

    const fileName = `${Date.now()}_${file.name}`;

    const { data, error } = await supabaseClient.storage
      .from('Slike')
      .upload(fileName, file, {
        contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        upsert: false
      });

    if (error) {
      console.error('Supabase upload greška:', error);
      alert('Greška s bazom: ' + error.message);
      continue;
    }

    const { data: urlData } = supabaseClient.storage
      .from('Slike')
      .getPublicUrl(fileName);

    displayMedia(urlData.publicUrl, file.name);
  }
}

// Prikaz slika ili videa ovisno o formatu
function displayMedia(url, fileName = '') {
  const isVideo = /\.(mp4|mov|avi|mkv|webm|3gp|flv|wmv)$/i.test(fileName || url);

  if (isVideo) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.playsInline = true;
    video.classList.add('preview-media');
    previewContainer.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.classList.add('preview-media');
    previewContainer.appendChild(img);
  }
}

// 5. Automatsko učitavanje spremljenih slika i videa
async function loadSavedImages() {
  const { data, error } = await supabaseClient.storage.from('Slike').list();
  if (error || !data) return;

  for (const file of data) {
    if (file.name === '.emptyFolderPlaceholder') continue;
    const { data: urlData } = supabaseClient.storage.from('Slike').getPublicUrl(file.name);
    displayMedia(urlData.publicUrl, file.name);
  }
}

document.addEventListener('DOMContentLoaded', loadSavedImages);
