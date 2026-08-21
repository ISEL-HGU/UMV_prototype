/* =============================================================
 * UMV Prototype - App Logic
 * mock-data.js 의 데이터를 렌더링. 백엔드 연동 없음.
 * ============================================================= */

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* HTML 이스케이프 */
function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* -------------------------------------------------------------
 * 0. 판정 결과 포맷터
 *    MALWARE 컬럼은 stage1 / stage2 결과에서 자동 조합한다.
 * ----------------------------------------------------------- */

/* 악성 확률 → 퍼센트 문자열.
 * 반올림하면 0.999843 이 "100.0%" 로 보이므로 내림 처리한다. */
function probToPercent(prob, digits = 1) {
  const factor = 10 ** (digits + 2);
  return `${(Math.floor(prob * factor) / 10 ** digits).toFixed(digits)}%`;
}

/* sha256 축약 표기: c0ccc593...10aa038e */
function shortHash(sha) {
  return `${sha.slice(0, 8)}...${sha.slice(-8)}`;
}

/* Stage1 표시: MATCH → "YARA:<rule_name>" / NO_MATCH → "YARA:NO_MATCH" */
function formatYara(ev) {
  return ev.stage1.status === 'MATCH'
    ? `YARA:${ev.stage1.matchedRules[0].name}`
    : 'YARA:NO_MATCH';
}

/* Stage2 표시: "AI:MALWARE 99.8%" / "AI:BENIGN 12.3%" */
function formatAi(ev) {
  return `AI:${ev.stage2.status} ${probToPercent(ev.stage2.prob)}`;
}

/* MALWARE 컬럼 최종 문자열 */
function formatMalware(ev) {
  return `${formatYara(ev)} / ${formatAi(ev)}`;
}

/* 셀 색상: 악성=빨강, YARA만 반응=주황(의심), 정상=기본 */
function malwareCellClass(ev) {
  if (ev.stage2.status === 'MALWARE') return 'cell-malware';
  if (ev.stage1.status === 'MATCH')   return 'cell-suspicious';
  return 'cell-benign';
}

const isMalware = (ev) => ev.stage2.status === 'MALWARE';

/* -------------------------------------------------------------
 * 1. 상단 / 사이드바 / 탭
 * ----------------------------------------------------------- */
function renderShell() {
  $('#computerName').textContent = `Computer: ${MOCK_COMPUTER.name}`;
  $('#topShield').innerHTML = icon('shield');
  $('#helpIcon').innerHTML = icon('help');
  $('#detailShield').innerHTML = icon('shield');

  $('#sidebarNav').innerHTML = MOCK_NAV.map((item) => `
    <button class="nav-item ${item.active ? 'is-active' : ''}" data-nav="${item.id}">
      <span class="nav-item__icon">${icon(item.icon)}</span>
      <span>${esc(item.label)}</span>
    </button>
  `).join('');

  $('#tabBar').innerHTML = MOCK_TABS.map((tab) => `
    <button class="tab ${tab.active ? 'is-active' : ''}" data-tab="${tab.id}">${esc(tab.label)}</button>
  `).join('');

  /* 네비 / 탭 전환 (프로토타입: 활성 표시만) */
  $('#sidebarNav').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (!btn) return;
    $$('.nav-item').forEach((b) => b.classList.toggle('is-active', b === btn));
    switchPanel(btn.dataset.nav === 'malware' ? 'events' : btn.dataset.nav);
  });

  $('#tabBar').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    $$('.tab').forEach((b) => b.classList.toggle('is-active', b === btn));
    switchPanel(btn.dataset.tab);
  });
}

function switchPanel(id) {
  const target = $(`#panel-${id}`) ? id : 'placeholder';
  $$('.panel').forEach((p) => { p.hidden = p.id !== `panel-${target}`; });
}

/* -------------------------------------------------------------
 * 2. 필터 / 툴바
 * ----------------------------------------------------------- */
function fillSelect(el, options) {
  el.innerHTML = options.map((o) => `<option>${esc(o)}</option>`).join('');
}

function renderFilters() {
  fillSelect($('#filterPeriod'), MOCK_FILTERS.period);
  fillSelect($('#filterComputers'), MOCK_FILTERS.computers);
  fillSelect($('#filterScope'), MOCK_FILTERS.scope);
  fillSelect($('#filterGrouping'), MOCK_FILTERS.grouping);

  $('#iconView').innerHTML    = icon('rows');
  $('#iconExport').innerHTML  = icon('export');
  $('#iconTagging').innerHTML = icon('tag');
  $('#iconColumns').innerHTML = icon('columns');
  $('#iconSearch').innerHTML  = icon('search');
  $('#iconSearchCaret').innerHTML = icon('caret');
  $$('.js-caret').forEach((el) => { el.innerHTML = icon('caret'); });

  /* All / Malware / Benign 필터 */
  $('#filterScope').addEventListener('change', refreshTable);
}

/* -------------------------------------------------------------
 * 3. 이벤트 목록
 * ----------------------------------------------------------- */
function refreshTable() {
  renderEventTable($('#searchInput').value, $('#filterScope').value);
}

function renderEventTable(keyword = '', scope = 'All') {
  const kw = keyword.trim().toLowerCase();

  const rows = MOCK_EVENTS
    .filter((ev) => {
      if (scope === 'Malware') return isMalware(ev);
      if (scope === 'Benign')  return !isMalware(ev);
      return true;
    })
    .filter((ev) => !kw || [
      ev.time, ev.computer, ev.infectedFile, formatMalware(ev),
      ev.scanType, ev.actionTaken, ev.majorVirusType,
    ].join(' ').toLowerCase().includes(kw));

  const tbody = $('#eventRows');

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="placeholder">표시할 이벤트가 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((ev) => `
    <tr data-event-id="${ev.id}" class="${ev.highlighted ? 'is-highlighted' : ''}">
      <td class="cell-icon">${icon('rows')}</td>
      <td>${esc(ev.time)}</td>
      <td>${esc(ev.computer)}</td>
      <td class="cell-path">${esc(ev.infectedFile)}</td>
      <td class="${malwareCellClass(ev)}">${esc(formatMalware(ev))}</td>
      <td>${esc(ev.scanType)}</td>
      <td>${esc(ev.actionTaken)}</td>
      <td>${esc(ev.majorVirusType)}</td>
    </tr>
  `).join('');
}

/* -------------------------------------------------------------
 * 4. 탐지 상세 모달
 *    목록과 동일한 stage1 / stage2 데이터에서 파생 → 항상 일치
 * ----------------------------------------------------------- */
function buildGeneralRows(ev) {
  return [
    { label: 'Computer',         value: `${ev.computer} (${ev.platform})` },
    { label: 'Origin',           value: ev.origin },
    { label: 'Detection Time',   value: ev.detectionTime },
    { label: 'Original Archive', value: `${shortHash(ev.sha256)}.zip (에이전트 수신 원본)` },
    {
      label: 'Inner File',
      value: `${shortHash(ev.sha256)}.exe · ${ev.depth}`,
      sub: `추출 위치 : ${ev.infectedFile}`,
    },
    { label: 'Scan Type',        value: ev.scanType },
    { label: 'Major Virus Type', value: ev.majorVirusType },
  ];
}

/* Stage 1 : "UMV STAGE 1 - YARA-X ANALYSIS" CLI 리포트와 동일한 항목/순서 */
function buildStage1(ev) {
  const s1 = ev.stage1;
  const matched = s1.status === 'MATCH';

  const rows = [
    { label: 'Input',        value: ev.infectedFile, mono: true },
    { label: 'Rule matches', value: String(s1.matchedRules.length) },
    { label: 'Scan time',    value: `${s1.scanMs} ms` },
  ];

  if (matched) {
    rows.push({
      label: 'Matched Rules',
      lines: s1.matchedRules.map((r) => ({
        text: `- ${r.name}`,
        sub: `tags: ${r.tags.join(', ')}`,
      })),
    });
  }

  rows.push({
    label: '[RESULT]',
    value: matched ? 'YARA MATCH' : 'YARA NO_MATCH',
    accent: matched ? 'danger' : 'ok',
  });

  return {
    title: 'UMV STAGE 1 - YARA-X ANALYSIS',
    badge: s1.status,
    badgeType: matched ? 'warn' : 'muted',
    rows,
  };
}

/* Stage 2 : "FEATURE BASED - HOST INFERENCE REPORT" CLI 리포트와 동일한 항목/순서 */
function buildStage2(ev) {
  const s2 = ev.stage2;
  const malware = s2.status === 'MALWARE';

  return {
    title: 'FEATURE BASED - HOST INFERENCE REPORT',
    badge: s2.status,
    badgeType: malware ? 'danger' : 'ok',
    rows: [
      { label: 'Input',          value: `${ev.sha256}.zip`, mono: true },
      { label: 'Inner file',     value: `${ev.sha256}.exe`, mono: true },
      { label: 'Format',         value: ev.format },
      { label: 'Subject size',   value: `${ev.size.toLocaleString()} bytes` },
      { label: 'Subject SHA256', value: ev.sha256, mono: true },
      /* Feature set / Model used 는 내부 구현 정보라 화면에 노출하지 않는다 */
      { label: 'Malware prob',   value: s2.prob.toFixed(6) },
      { label: 'Threshold',      value: s2.threshold.toFixed(2) },
      { label: 'Inference time', value: `${s2.inferenceSec} sec` },
      {
        label: '[RESULT] ==>',
        value: malware ? 'Malware (악성)' : 'Benign (정상)',
        accent: malware ? 'danger' : 'ok',
      },
    ],
  };
}

function buildStages(ev) {
  return [buildStage1(ev), buildStage2(ev)];
}

function buildVerdict(ev) {
  const malware = isMalware(ev);
  return {
    label: malware ? 'Malware' : 'Benign',
    summary: malware
      ? `악성 판정, 프로세스 강제 종료 및 격리 완료 (${ev.actionTaken})`
      : `정상 판정 (조치: ${ev.actionTaken})`,
    score: probToPercent(ev.stage2.prob, 2),
    ok: !malware,
  };
}

/* dt/dd 한 쌍 렌더링. row.lines(여러 줄) / row.sub / row.mono / row.accent 지원 */
function renderRow(row) {
  const cls = [
    row.mono ? 'is-mono' : '',
    row.accent === 'danger' ? 'is-danger' : row.accent === 'ok' ? 'is-ok' : '',
  ].filter(Boolean).join(' ');

  const body = row.lines
    ? row.lines.map((l) => `
        <div class="rule-line">${esc(l.text)}${l.sub ? `<span class="sub">${esc(l.sub)}</span>` : ''}</div>
      `).join('')
    : `${esc(row.value)}${row.sub ? `<span class="sub">${esc(row.sub)}</span>` : ''}`;

  return `<dt>${esc(row.label)}</dt><dd class="${cls}">${body}</dd>`;
}

function renderDetailModal(ev) {
  const verdict = buildVerdict(ev);

  const generalRows = buildGeneralRows(ev).map(renderRow).join('');

  const stages = buildStages(ev).map((stage) => `
    <section class="stage">
      <div class="stage__head">
        <span class="stage__title">${esc(stage.title)}</span>
        <span class="badge badge--${stage.badgeType}">${esc(stage.badge)}</span>
      </div>
      <dl class="dl">${stage.rows.map(renderRow).join('')}</dl>
    </section>
  `).join('');

  $('#detailGeneral').innerHTML = `
    <div class="verdict ${verdict.ok ? 'verdict--ok' : ''}">
      <span class="verdict__label">${icon('malware')} ${esc(verdict.label)}</span>
      <span class="verdict__summary">${esc(verdict.summary)}</span>
      <span class="verdict__score">${esc(verdict.score)}</span>
    </div>

    <h3 class="section-title">General Information</h3>
    <dl class="dl">${generalRows}</dl>

    <h3 class="section-title">Multi-Stage Analysis Details</h3>
    ${stages}

    <div class="insight">
      <div class="insight__title">Security Insight</div>
      <div class="insight__body">${esc(ev.insight)}</div>
    </div>

    <div class="quarantine-bar">
      <span class="quarantine-bar__label">${icon('warning')} Quarantine</span>
      <span>${esc(ev.actionTaken)} (프로세스 강제 종료 및 격리)</span>
      <button class="btn" data-close-detail>Close</button>
    </div>
  `;

  /* Tags 탭 */
  $('#detailTags').innerHTML = ev.tags && ev.tags.length
    ? `<div class="tag-list">${ev.tags.map((t) => `<span class="tag tag--${t.color}">${esc(t.name)}</span>`).join('')}</div>`
    : `<p class="placeholder">등록된 태그가 없습니다.</p>`;

  switchDetailTab('general');
  $('#detailModal').hidden = false;
}

function switchDetailTab(id) {
  $$('#detailTabs .tab').forEach((b) => b.classList.toggle('is-active', b.dataset.detailTab === id));
  $('#detailGeneral').hidden = id !== 'general';
  $('#detailTags').hidden    = id !== 'tags';
}

function closeDetailModal() { $('#detailModal').hidden = true; }

/* -------------------------------------------------------------
 * 5. 초기화
 * ----------------------------------------------------------- */
function init() {
  renderShell();
  renderFilters();
  refreshTable();

  /* 목록 행 클릭 → 상세 모달 */
  $('#eventRows').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-event-id]');
    if (!tr) return;
    const ev = MOCK_EVENTS.find((x) => x.id === tr.dataset.eventId);
    if (ev) renderDetailModal(ev);
  });

  /* 검색 */
  $('#searchInput').addEventListener('input', refreshTable);

  /* 상세 모달 닫기 / 탭 */
  $('#detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal' || e.target.closest('[data-close-detail]')) closeDetailModal();
    const tab = e.target.closest('[data-detail-tab]');
    if (tab) switchDetailTab(tab.dataset.detailTab);
  });

  /* ESC 로 모달 닫기 */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailModal();
  });
}

document.addEventListener('DOMContentLoaded', init);
