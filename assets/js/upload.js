/* =============================================================
 * UMV Prototype - Upload Page
 * 진입 화면. 대시보드(dashboard.html)와 분리된 독립 페이지. 백엔드 연동 없음.
 * ============================================================= */

const $ = (sel, root = document) => root.querySelector(sel);

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

let selectedFiles = [];

function renderDropzone() {
  const zone = $('#dropzone');

  if (!selectedFiles.length) {
    zone.innerHTML = `
      <span class="dropzone__icon">${icon('fileUp')}</span>
      <span class="dropzone__label">Drag file(s) here to upload.</span>
      <button type="button" class="dropzone__browse" id="browseBtn">또는 파일 선택</button>
    `;
    return;
  }

  zone.innerHTML = `
    <span class="dropzone__icon">${icon('fileUp')}</span>
    <div>
      ${selectedFiles.map((f) => `
        <div class="dropzone__file">${esc(f.name)}</div>
        <div class="dropzone__hint">${(f.size / 1024).toFixed(1)} KB</div>
      `).join('')}
    </div>
    <button type="button" class="dropzone__browse" id="browseBtn">다시 선택</button>
  `;
}

function clearSelection() {
  selectedFiles = [];
  renderDropzone();
}

function init() {
  $('#uploadIcon').innerHTML = icon('folder');
  renderDropzone();

  const zone = $('#dropzone');
  const input = $('#fileInput');

  ['dragenter', 'dragover'].forEach((type) => {
    zone.addEventListener(type, (e) => { e.preventDefault(); zone.classList.add('is-over'); });
  });
  ['dragleave', 'drop'].forEach((type) => {
    zone.addEventListener(type, (e) => { e.preventDefault(); zone.classList.remove('is-over'); });
  });

  zone.addEventListener('drop', (e) => {
    selectedFiles = Array.from(e.dataTransfer.files);
    renderDropzone();
  });

  zone.addEventListener('click', (e) => {
    if (e.target.closest('#browseBtn')) input.click();
  });

  input.addEventListener('change', () => {
    selectedFiles = Array.from(input.files);
    renderDropzone();
    input.value = '';
  });

  $('#uploadCancel').addEventListener('click', clearSelection);

  /* 백엔드 연동 전: 실제 업로드 대신 대시보드로 이동해 흐름만 확인 */
  $('#uploadSubmit').addEventListener('click', () => {
    if (!selectedFiles.length) {
      alert('업로드할 파일을 먼저 선택하세요.');
      return;
    }
    window.location.href = 'dashboard.html';
  });
}

document.addEventListener('DOMContentLoaded', init);
