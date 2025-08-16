// ========= NAV responsive =========
const navToggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('menu');
if(navToggle && menu){
  navToggle.addEventListener('click', ()=>{
    const open = menu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  }, { passive:true });
}

// ========= Datos iniciales =========
const INITIAL_PHOTOS = [
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521334726092-b509a19597d2?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520190282786-c3d7fd05a4d3?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
];

// ========= Galería (responsive + lazy) =========
const galleryEl = document.getElementById('gallery');
const stored = JSON.parse(localStorage.getItem('guest_photos')||'[]');
const photos = [...INITIAL_PHOTOS, ...stored];

function renderGallery(){
  galleryEl.innerHTML = '';
  photos.forEach((src, i) => {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = src;
    img.alt = 'Foto '+(i+1);
    img.addEventListener('click', ()=> openLightbox(src), { passive:true });
    galleryEl.appendChild(img);
  });
}

// ========= Lightbox =========
const lb = document.createElement('div');
lb.className = 'lightbox';
lb.innerHTML = '<button aria-label="Cerrar">Cerrar</button><img alt="Foto ampliada" />';
document.body.appendChild(lb);
lb.addEventListener('click', (e)=>{ if(e.target===lb || e.target.tagName==='BUTTON'){ lb.classList.remove('open'); }}, { passive:true });
function openLightbox(src){
  lb.querySelector('img').src = src;
  lb.classList.add('open');
}

// ========= Subidas (LocalStorage con compresión móvil) =========
const drop = document.getElementById('drop');
const fileInput = document.getElementById('file');
const cameraInput = document.getElementById('camera');
const clearBtn = document.getElementById('clear');

['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev, e=>{e.preventDefault();drop.classList.add('drag');},{ passive:false }));
['dragleave','drop'].forEach(ev=>drop.addEventListener(ev, e=>{e.preventDefault();drop.classList.remove('drag');},{ passive:false }));

drop.addEventListener('drop', e=> handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', e=> handleFiles(e.target.files));
cameraInput.addEventListener('change', e=> handleFiles(e.target.files));

async function handleFiles(fileList){
  const files = Array.from(fileList||[]).filter(f=>/^image\//.test(f.type));
  if(!files.length) return;
  const processed = await Promise.all(files.map(f => compressImage(f, { maxSize: 1600, quality: 0.8 })));
  const current = JSON.parse(localStorage.getItem('guest_photos')||'[]');
  const next = [...current, ...processed];
  localStorage.setItem('guest_photos', JSON.stringify(next));
  processed.forEach(src=>photos.push(src));
  renderGallery();
}

function compressImage(file, { maxSize = 1600, quality = 0.85 } = {}){
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      const scale = Math.min(1, maxSize / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.readAsDataURL(file);
  });
}

clearBtn.addEventListener('click', ()=>{
  if(confirm('Esto borrará las fotos subidas desde este dispositivo. ¿Continuar?')){
    localStorage.removeItem('guest_photos');
    while(photos.length>INITIAL_PHOTOS.length){ photos.pop(); }
    renderGallery();
  }
});

// ========= QR (generación diferida para móviles) =========
const qrDiv = document.getElementById('qrcode');
const qrUrlSpan = document.getElementById('qr-url');
const qrFallback = document.getElementById('qr-fallback');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');

const pageUrl = window.location.href;
qrUrlSpan.textContent = pageUrl;

function renderQR(){
  qrDiv.innerHTML = '';
  if(window.QRCode){
    QRCode.toCanvas(pageUrl, { width: 240, margin: 1, color: { dark: '#000000', light: '#ffffff' } }, function (err, canvas) {
      if(err){ qrFallback.hidden = false; return; }
      const wrap = document.createElement('div');
      wrap.style.padding = '10px';
      wrap.style.background = 'linear-gradient(135deg, var(--burgundy), #540016)';
      wrap.style.borderRadius = '16px';
      wrap.style.display = 'inline-block';
      wrap.appendChild(canvas);
      qrDiv.appendChild(wrap);
    });
  }else{
    qrFallback.hidden = false;
  }
}

// Solo generamos el QR cuando la sección es visible (ahorra batería)
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ renderQR(); io.disconnect(); } });
});
io.observe(document.getElementById('qr'));

btnCopy.addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(pageUrl); btnCopy.textContent='¡Copiado!'; setTimeout(()=>btnCopy.textContent='Copiar enlace',1200);}catch{ alert('No se pudo copiar.'); }
});

btnDownload.addEventListener('click', ()=>{
  const canvas = qrDiv.querySelector('canvas');
  if(!canvas){ renderQR(); setTimeout(()=>{
    const c = qrDiv.querySelector('canvas');
    if(!c){ alert('No se pudo generar el QR.'); return; }
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'qr-boda.png';
    a.click();
  }, 200); return; }
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'qr-boda.png';
  a.click();
});

// Inicializar
renderGallery();