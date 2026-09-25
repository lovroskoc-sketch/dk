// Konfiguracija za Supabase
const SUPABASE_URL = 'https://hypzuumvrjalyakdfdtp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5cHp1dW12cmphbHlha2RmZHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NzkyODcsImV4cCI6MjEwNTI1NTI4N30.nf7SCA8tVGlakxLrwlJ_ZJa38Nc590dTDiGF2KDu0Ls';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const dropArea = document.getElementById('drop-area');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');

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
    dropArea.addEventListener(eventName, () => {
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

// Podržani tipovi za slike i videozapise
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'
];

async function handleFiles(files) {
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert(`Datoteka ${file.name} nije podržani format slike ili videa.`);
      continue;
    }

    const fileName = `${Date.now()}_${file.name}`;

    const { data, error } = await supabaseClient.storage
      .from('Slike')
      .upload(fileName, file);

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

// Funkcija za prikaz slike ili videa ovisno o ekstenziji/nazivu datoteke
function displayMedia(url, fileName = '') {
  const isVideo = /\.(mp4|webm|mov|ogg)$/i.test(fileName || url);

  if (isVideo) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true; // Omogućuje gumb za pokretanje/pauzu
    video.classList.add('preview-media');
    previewContainer.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.classList.add('preview-media');
    previewContainer.appendChild(img);
  }
}

// Automatsko učitavanje spremljenih datoteka
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
