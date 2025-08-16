/* ========= CONFIGURACIÓN =========
   - Mantén FIREBASE_ENABLED = true
   - Rellena el PRESET de Cloudinary más abajo
*/
const FIREBASE_ENABLED = true;
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAMHN-dfPfD_kcOdl2WCxeX-RH55AoxYZw",
  authDomain: "boda-r-y-g.firebaseapp.com",
  projectId: "boda-r-y-g",
  storageBucket: "boda-r-y-g.firebasestorage.app", // no se usa con Cloudinary, no molesta
  messagingSenderId: "335827726121",
  appId: "1:335827726121:web:db8e518bee3d88d67ad138",
  measurementId: "G-XE9MXRTQFC"
};

// ====== Cloudinary (plan gratis) ======
const CLOUDINARY_CLOUD_NAME = "dauzwfc8z";          // <-- tu cloud name
const CLOUDINARY_UPLOAD_PRESET = "Boda R-G"; // <-- pon aquí tu preset UNSIGNED
const CLOUDINARY_FOLDER = "wedding-photos";          // opcional (organiza en carpeta)
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// ========= NAV responsive =========
const navToggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('menu');
if (navToggle && menu) {
  navToggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  }, { passive: true });
}

// ========= Utilidades =========
function dataURLtoBlob(dataUrl){
  const arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]); let n = bstr.length; const u8 = new Uint8Array(n);
  while(n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

function compressImage(file, { maxSize = 1600, quality = 0.85 } = {}){
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.round(width * scale); height = Math.round(height * scale);
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.readAsDataURL(file);
  });
}

// ========= Firebase (Auth + Firestore) =========
let fb = { usingFirebase: false };
(function initFirebase(){
  if (!FIREBASE_ENABLED) return;
  if (!FIREBASE_CONFIG.apiKey) { console.warn('Falta FIREBASE_CONFIG. Usando modo local.'); return; }
  try {
    fb.app = firebase.initializeApp(FIREBASE_CONFIG);
    fb.auth = firebase.auth();
    fb.db = firebase.firestore();
    fb.usingFirebase = true;
    fb.auth.signInAnonymously().catch(console.error);
  } catch (err) {
    console.error('Firebase init error', err);
    fb.usingFirebase = false;
  }
})();

// ========= Datos iniciales (de muestra) =========
const INITIAL_PHOTOS = [
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521334726092-b509a19597d2?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520190282786-c3d7fd05a4d3?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
];

// ========= Galería =========
const galleryEl = document.getElementById('gallery');
const galleryHint = document.getElementById('gallery-hint') || { textContent: '' };
let photosLocal = JSON.parse(localStorage.getItem('guest_photos') || '[]');

function renderGallery(list){
  const arr = list || [...INITIAL_PHOTOS, ...photosLocal];
  galleryEl.innerHTML = '';
  arr.forEach((src, i) => {
    const img = document.createElement('img');
    img.loading = 'lazy'; img.decoding = 'async';
    img.src = src; img.alt = 'Foto ' + (i + 1);
    img.addEventListener('click', () => openLightbox(src), { passive: true });
    galleryEl.appendChild(img);
  });
}

// ========= Lightbox =========
const lb = document.createElement('div');
lb.className = 'lightbox';
lb.innerHTML = '<button aria-label="Cerrar">Cerrar</button><img alt="Foto ampliada" />';
document.body.appendChild(lb);
lb.addEventListener('click', (e) => { if (e.target === lb || e.target.tagName === 'BUTTON') lb.classList.remove('open'); }, { passive: true });
function openLightbox(src){ lb.querySelector('img').src = src; lb.classList.add('open'); }

// ========= Subidas =========
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const cameraInput = document.getElementById('camera');
const clearBtn = document.getElementById('clear');

['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }, { passive: false }));
['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }, { passive: false }));

drop.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', e => handleFiles(e.target.files));
cameraInput?.addEventListener('change', e => handleFiles(e.target.files));

async function uploadToCloudinary(blob){
  const fd = new FormData();
  fd.append('file', blob, 'photo.jpg');
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (CLOUDINARY_FOLDER) fd.append('folder', CLOUDINARY_FOLDER);
  fd.append('tags', 'boda,romina,german'); // opcional
  const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  return res.json(); // {secure_url, ...}
}

async function handleFiles(fileList){
  const files = Array.from(fileList || []).filter(f => /^image\//.test(f.type));
  if (!files.length) return;

  const processedDataUrls = await Promise.all(
    files.map(f => compressImage(f, { maxSize: 1600, quality: 0.8 }))
  );

  if (fb.usingFirebase) {
    for (const durl of processedDataUrls) {
      const blob = dataURLtoBlob(durl);
      const result = await uploadToCloudinary(blob);
      if (result.secure_url) {
        await fb.db.collection('photos').add({
          url: result.secure_url,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  } else {
    // Modo local (no compartido)
    const next = [...photosLocal, ...processedDataUrls];
    localStorage.setItem('guest_photos', JSON.stringify(next));
    photosLocal = next;
    renderGallery();
    const note = document.getElementById('upload-note');
    if (note) note.innerHTML = 'Tus fotos se guardan solo en este dispositivo. Activa Firebase para compartirlas.';
  }
}

clearBtn.addEventListener('click', () => {
  if (confirm('Esto borrará las fotos subidas desde este dispositivo (solo modo local). ¿Continuar?')) {
    localStorage.removeItem('guest_photos');
    photosLocal = [];
    renderGallery();
  }
});

// ========= Galería en tiempo real =========
if (fb.usingFirebase) {
  galleryHint.textContent = 'Las fotos de todos aparecen aquí en tiempo real.';
  fb.db.collection('photos').orderBy('createdAt', 'desc').limit(200)
    .onSnapshot((snap) => {
      const list = [];
      snap.forEach(doc => { const d = doc.data(); if (d.url) list.push(d.url); });
      renderGallery(list.length ? list : INITIAL_PHOTOS);
    });
} else {
  renderGallery();
}

// ========= QR =========
const qrDiv = document.getElementById('qrcode');
const qrUrlSpan = document.getElementById('qr-url');
const qrFallback = document.getElementById('qr-fallback');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');

const pageUrl = window.location.href;
if (qrUrlSpan) qrUrlSpan.textContent = pageUrl;

function renderQR(){
  qrDiv.innerHTML = '';
  if (window.QRCode) {
    QRCode.toCanvas(pageUrl, { width: 240, margin: 1, color: { dark: '#000000', light: '#ffffff' } }, (err, canvas) => {
      if (err) { qrFallback.hidden = false; return; }
      const wrap = document.createElement('div');
      wrap.style.padding = '10px';
      wrap.style.background = 'linear-gradient(135deg, var(--burgundy), #540016)';
      wrap.style.borderRadius = '16px';
      wrap.style.display = 'inline-block';
      wrap.appendChild(canvas);
      qrDiv.appendChild(wrap);
    });
  } else {
    qrFallback.hidden = false;
  }
}

// Generar QR cuando la sección sea visible
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { renderQR(); io.disconnect(); } });
});
io.observe(document.getElementById('qr'));

btnCopy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(pageUrl); btnCopy.textContent = '¡Copiado!'; setTimeout(() => btnCopy.textContent = 'Copiar enlace', 1200); }
  catch { alert('No se pudo copiar.'); }
});

btnDownload.addEventListener('click', () => {
  const canvas = qrDiv.querySelector('canvas');
  if (!canvas) {
    renderQR();
    setTimeout(() => {
      const c = qrDiv.querySelector('canvas');
      if (!c) { alert('No se pudo generar el QR.'); return; }
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png'); a.download = 'qr-boda.png'; a.click();
    }, 200);
    return;
  }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png'); a.download = 'qr-boda.png'; a.click();
});
