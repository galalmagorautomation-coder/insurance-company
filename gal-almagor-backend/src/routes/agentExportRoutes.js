/**
 * Agent Export Routes
 *
 * - GET  /api/agents/:id/export  → xlsx for one agent (profile + all IDs)
 * - POST /api/agents/export      → xlsx roster for a filtered subset of agents
 */

const express = require('express');
const ExcelJS = require('exceljs');
const supabase = require('../config/supabase');

const router = express.Router();

const ARIAL = 'Arial';
const TEAL = 'FF2E7D8A';
const LIGHT_TEAL_BG = 'FFE8F4F6';
const LIGHT_GRAY_BG = 'FFF7FAFC';
const BORDER = {
  top:    { style: 'thin', color: { argb: 'FFCCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  left:   { style: 'thin', color: { argb: 'FFCCCCCC' } },
  right:  { style: 'thin', color: { argb: 'FFCCCCCC' } },
};

const LIFE_COMPANIES = [
  ['איילון', 'ayalon_agent_id'],
  ['הראל', 'harel_agent_id'],
  ['מגדל', 'migdal_agent_id'],
  ['מנורה', 'menorah_agent_id'],
  ['הפניקס', 'phoenix_agent_id'],
  ['כלל', 'clal_agent_id'],
  ['אלטשולר שחם', 'altshuler_agent_id'],
  ['הכשרה', 'hachshara_agent_id'],
  ['מור', 'mor_agent_id'],
  ['מדיהו', 'mediho_agent_id'],
  ['אנליסט', 'analyst_agent_id'],
  ['מיטב', 'meitav_agent_id'],
  ['ילין לפידות', 'yalin_lapidot_agent_id'],
  ['איפיניטי', 'infinity_agent_id'],
  ['שלמה', 'shlomo_agent_id'],
  ['פספורט', 'passport_agent_id'],
  ['מיי דוקטור', 'mydoctor_agent_id'],
];

const ELEMENTARY_COMPANIES = [
  ['איילון', 'elementary_id_ayalon'],
  ['הכשרה', 'elementary_id_hachshara'],
  ['הראל', 'elementary_id_harel'],
  ['כלל', 'elementary_id_clal'],
  ['מגדל', 'elementary_id_migdal'],
  ['מנורה', 'elementary_id_menorah'],
  ['הפניקס', 'elementary_id_phoenix'],
  ['שומרה', 'elementary_id_shomera'],
  ['שלמה', 'elementary_id_shlomo'],
  ['שירביט', 'elementary_id_shirbit'],
  ['חקלאי', 'elementary_id_haklai'],
  ['מ.מ.ס', 'elementary_id_mms'],
  ['ק.ש', 'elementary_id_kash'],
  ['פספורט', 'elementary_id_passport'],
  ['קופר נינווה', 'elementary_id_cooper_ninova'],
  ['סקוריטס', 'elementary_id_securities'],
];

function formatLifeStatus(v) {
  if (v === null || v === undefined || v === '') return 'ריק';
  const map = {
    active: 'פעיל', yes: 'פעיל', Yes: 'פעיל',
    inactive: 'לא פעיל', no: 'לא פעיל', No: 'לא פעיל',
    employee_gal_amagor: 'עובד בגל אלמגור',
    independent_agent: 'סוכן עצמאי',
    former_employee: 'עובד לשעבר',
    former_independent_agent: 'סוכן עצמאי לשעבר',
  };
  return map[v] || v;
}

function formatElemStatus(v) {
  if (v === null || v === undefined) return 'ריק';
  return v ? 'פעיל' : 'לא פעיל';
}

function setEmptyOrValue(cell, value) {
  if (value === null || value === undefined || value === '') {
    cell.value = 'ריק';
    cell.font = { name: ARIAL, size: 11, italic: true, color: { argb: 'FF888888' } };
  } else {
    cell.value = value;
    cell.font = { name: ARIAL, size: 11 };
  }
  cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
  cell.border = BORDER;
}

function buildSingleAgentSheet(workbook, agent) {
  const ws = workbook.addWorksheet('כרטיס סוכן', { views: [{ rightToLeft: true }] });
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 70;

  ws.mergeCells('A1:B1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'כרטיס סוכן — מספרי סוכן בכל החברות';
  titleCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: TEAL } };
  titleCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const profile = [
    ['שם הסוכן', agent.agent_name],
    ['תעודת זהות', agent.agent_id],
    ['מפקח', agent.inspector],
    ['מחלקה - ביטוח חיים', agent.department],
    ['מחלקה - אלמנטרי', agent.category],
    ['תת-קטגוריה אלמנטרי', agent.sub_category],
    ['סטטוס ביטוח חיים', formatLifeStatus(agent.is_active)],
    ['סטטוס אלמנטרי', formatElemStatus(agent.elementary_status)],
    ['טלפון', agent.phone],
    ['אימייל', agent.email],
    ['הערות', agent.notes],
  ];
  let row = 3;
  for (const [label, value] of profile) {
    const labelCell = ws.getCell(row, 1);
    labelCell.value = label;
    labelCell.font = { name: ARIAL, size: 11, bold: true };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_TEAL_BG } };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    labelCell.border = BORDER;
    setEmptyOrValue(ws.getCell(row, 2), value);
    ws.getRow(row).height = 22;
    row++;
  }

  row++;
  ws.mergeCells(row, 1, row, 2);
  const lifeHeader = ws.getCell(row, 1);
  lifeHeader.value = 'Agent IDs - ביטוח חיים';
  lifeHeader.font = { name: ARIAL, size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  lifeHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  lifeHeader.alignment = { horizontal: 'right', vertical: 'middle' };
  lifeHeader.border = BORDER;
  ws.getRow(row).height = 28;
  row++;

  ['חברה', 'מספרי סוכן'].forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h;
    c.font = { name: ARIAL, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = BORDER;
  });
  ws.getRow(row).height = 24;
  row++;

  for (const [label, col] of LIFE_COMPANIES) {
    const labelCell = ws.getCell(row, 1);
    labelCell.value = label;
    labelCell.font = { name: ARIAL, size: 11, bold: true };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY_BG } };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    labelCell.border = BORDER;
    setEmptyOrValue(ws.getCell(row, 2), agent[col]);
    ws.getRow(row).height = 22;
    row++;
  }

  row++;
  ws.mergeCells(row, 1, row, 2);
  const elemHeader = ws.getCell(row, 1);
  elemHeader.value = 'Agent ID אלמנטרי';
  elemHeader.font = { name: ARIAL, size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  elemHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  elemHeader.alignment = { horizontal: 'right', vertical: 'middle' };
  elemHeader.border = BORDER;
  ws.getRow(row).height = 28;
  row++;

  ['חברה', 'מספרי סוכן'].forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h;
    c.font = { name: ARIAL, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = BORDER;
  });
  ws.getRow(row).height = 24;
  row++;

  for (const [label, col] of ELEMENTARY_COMPANIES) {
    const labelCell = ws.getCell(row, 1);
    labelCell.value = label;
    labelCell.font = { name: ARIAL, size: 11, bold: true };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY_BG } };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    labelCell.border = BORDER;
    setEmptyOrValue(ws.getCell(row, 2), agent[col]);
    ws.getRow(row).height = 22;
    row++;
  }
}

function buildAgentsListSheet(workbook, agents, filterDesc) {
  const ws = workbook.addWorksheet('רשימת סוכנים', { views: [{ rightToLeft: true }] });

  const profileCols = [
    ['שם הסוכן', 'agent_name'],
    ['תעודת זהות', 'agent_id'],
    ['מפקח', 'inspector'],
    ['מחלקה - ביטוח חיים', 'department'],
    ['מחלקה - אלמנטרי', 'category'],
    ['תת-קטגוריה אלמנטרי', 'sub_category'],
    ['סטטוס ביטוח חיים', 'is_active'],
    ['סטטוס אלמנטרי', 'elementary_status'],
  ];
  const lifeCols = LIFE_COMPANIES.map(([name, key]) => [`${name} (חיים)`, key]);
  const elemCols = ELEMENTARY_COMPANIES.map(([name, key]) => [`${name} (אלמנטרי)`, key]);
  const allCols = [...profileCols, ...lifeCols, ...elemCols];

  ws.mergeCells(1, 1, 1, allCols.length);
  const title = ws.getCell(1, 1);
  title.value = 'רשימת סוכנים — ייצוא מסונן';
  title.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: TEAL } };
  title.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.mergeCells(2, 1, 2, allCols.length);
  const subtitle = ws.getCell(2, 1);
  subtitle.value = filterDesc + `   (${agents.length} סוכנים)`;
  subtitle.font = { name: ARIAL, size: 10, italic: true, color: { argb: 'FF555555' } };
  subtitle.alignment = { horizontal: 'right', vertical: 'middle' };

  const headerRow = 4;
  allCols.forEach(([label], i) => {
    const c = ws.getCell(headerRow, i + 1);
    c.value = label;
    c.font = { name: ARIAL, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = BORDER;
  });
  ws.getRow(headerRow).height = 36;

  allCols.forEach(([, _], i) => {
    const w = i === 0 || i === 1 ? 28 : i < profileCols.length ? 20 : 26;
    ws.getColumn(i + 1).width = w;
  });

  agents.forEach((agent, idx) => {
    const rIdx = headerRow + 1 + idx;
    allCols.forEach(([, key], cIdx) => {
      let display;
      if (key === 'is_active') display = formatLifeStatus(agent[key]);
      else if (key === 'elementary_status') display = formatElemStatus(agent[key]);
      else display = agent[key] ? agent[key] : 'ריק';

      const c = ws.getCell(rIdx, cIdx + 1);
      c.value = display;
      const isEmpty = display === 'ריק';
      c.font = {
        name: ARIAL, size: 10, italic: isEmpty,
        color: { argb: isEmpty ? 'FF888888' : 'FF000000' },
      };
      c.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      c.border = BORDER;
      if (rIdx % 2 === 0) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY_BG } };
      }
    });
  });

  ws.views = [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: headerRow }];
  ws.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow + agents.length, column: allCols.length },
  };
}

function safeFilename(name) {
  return (name || 'agent').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
}

/**
 * GET /api/agents/:id/export → xlsx for one agent.
 */
router.get('/:id/export', async (req, res) => {
  try {
    const { data: agent, error } = await supabase
      .from('agent_data')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    buildSingleAgentSheet(workbook, agent);

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `agent_${safeFilename(agent.agent_name)}.xlsx`;
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (e) {
    console.error('Agent export error:', e);
    res.status(500).json({ success: false, message: 'Failed to export agent', error: e.message });
  }
});

/**
 * POST /api/agents/export → xlsx roster for a filtered subset.
 * Body accepts the current Agents-page filters:
 *   { selectedCompany?: string, searchQuery?: string }
 * `selectedCompany` is matched against the company_id array; `searchQuery`
 * is used as a case-insensitive substring filter across agent_name, agent_id,
 * department, category, sub_category, email, phone, and every
 * company-specific _agent_id / elementary_id_*. (Inspector was intentionally
 * removed from the search per boss's request — searching by inspector name
 * was matching too many unrelated agents.)
 */
router.post('/export', async (req, res) => {
  try {
    const { selectedCompany, searchQuery } = req.body || {};

    let query = supabase.from('agent_data').select('*');
    if (selectedCompany) {
      query = query.contains('company_id', [parseInt(selectedCompany)]);
    }
    const { data: agents, error } = await query;
    if (error) throw error;

    // Drop the system "UNMAPPED_" buckets — they're not real agents.
    let filtered = (agents || []).filter(a => !String(a.agent_id || '').startsWith('UNMAPPED_'));

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a => {
        if ((a.agent_name || '').toLowerCase().includes(q)) return true;
        if (String(a.agent_id || '').toLowerCase().includes(q)) return true;
        if ((a.department || '').toLowerCase().includes(q)) return true;
        if ((a.category || '').toLowerCase().includes(q)) return true;
        if ((a.sub_category || '').toLowerCase().includes(q)) return true;
        if ((a.email || '').toLowerCase().includes(q)) return true;
        if ((a.phone || '').toLowerCase().includes(q)) return true;
        for (const [k, v] of Object.entries(a)) {
          if (v === null || v === undefined) continue;
          if (k.endsWith('_agent_id') || k.startsWith('elementary_id_') || k.startsWith('commission_id_')) {
            if (String(v).toLowerCase().includes(q)) return true;
          }
        }
        return false;
      });
    }

    filtered.sort((a, b) =>
      (a.agent_name || '').localeCompare(b.agent_name || '', 'he'));

    const filterBits = [];
    if (selectedCompany) filterBits.push(`חברה=${selectedCompany}`);
    if (searchQuery && searchQuery.trim()) filterBits.push(`חיפוש="${searchQuery.trim()}"`);
    const filterDesc = filterBits.length
      ? `פילטר: ${filterBits.join(' | ')}`
      : 'ללא פילטר (כל הסוכנים)';

    const workbook = new ExcelJS.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    buildAgentsListSheet(workbook, filtered, filterDesc);

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `agents_list_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    console.error('Agents list export error:', e);
    res.status(500).json({ success: false, message: 'Failed to export agents list', error: e.message });
  }
});

module.exports = router;
