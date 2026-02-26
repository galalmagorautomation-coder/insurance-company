const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const companyToCol = {
  'Migdal': 'migdal_agent_id',
  'Harel': 'harel_agent_id',
  'Menorah': 'menorah_agent_id',
  'The Phoenix': 'phoenix_agent_id',
  'Ayalon': 'ayalon_agent_id',
  'Altshuler Shaham': 'altshuler_agent_id',
  'Clal': 'clal_agent_id',
  'Hachshara': 'hachshara_agent_id',
  'Mor': 'mor_agent_id'
};

async function main() {
  const wb = XLSX.readFile('../Check these numbers-.xlsx');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws);

  const { data: agents, error } = await supabase
    .from('agent_data')
    .select('id, agent_name, migdal_agent_id, harel_agent_id, menorah_agent_id, phoenix_agent_id, ayalon_agent_id, altshuler_agent_id, clal_agent_id, hachshara_agent_id, mor_agent_id');

  if (error) { console.error(error); return; }

  // Build lookup per company column - track which agent(s) each number belongs to
  const lookup = {};
  Object.values(companyToCol).forEach(col => { lookup[col] = {}; });

  agents.forEach(agent => {
    Object.values(companyToCol).forEach(col => {
      const val = agent[col];
      if (val && val !== 'UNMAPPED') {
        val.split(',').map(n => n.trim()).forEach(num => {
          if (num === '') return;
          if (lookup[col][num]) {
            lookup[col][num].push({ id: agent.id, name: agent.agent_name });
          } else {
            lookup[col][num] = [{ id: agent.id, name: agent.agent_name }];
          }
        });
      }
    });
  });

  // Check every single Excel row
  const missing = [];
  const duplicatesInDb = [];
  let foundCount = 0;
  let skippedCompany = 0;

  data.forEach((row, idx) => {
    const company = row['יצרן'];
    const col = companyToCol[company];
    if (col === undefined) {
      skippedCompany++;
      return;
    }

    const num = String(row['מספר סוכן']);
    const desc = row['תיאור מספר סוכן'] || '';
    const systemName = row['שם סוכן בפורמט המערכת שפיתחנו'] || '';
    const status = row['האם קיים אצלנו?'] || '';

    if (lookup[col][num]) {
      foundCount++;
      if (lookup[col][num].length > 1) {
        duplicatesInDb.push({
          row: idx + 2,
          company,
          num,
          desc,
          agents: lookup[col][num].map(a => 'ID ' + a.id + ' (' + a.name + ')').join(' | ')
        });
      }
    } else {
      missing.push({ row: idx + 2, company, num, desc, systemName, status });
    }
  });

  console.log('=== FULL RECHECK RESULTS ===');
  console.log('Total Excel rows:', data.length);
  console.log('Rows with known companies:', data.length - skippedCompany);
  console.log('Skipped (unknown company):', skippedCompany);
  console.log('Found in DB:', foundCount);
  console.log('Missing from DB:', missing.length);
  console.log('Numbers in multiple agents:', duplicatesInDb.length);

  if (missing.length > 0) {
    console.log('\n=== MISSING FROM DB ===');
    missing.forEach(m => {
      console.log('Row ' + m.row + ': [' + m.company + '] ' + m.num + ' | ' + m.desc + ' | System: ' + m.systemName + ' | Status: ' + m.status);
    });
  }

  if (duplicatesInDb.length > 0) {
    console.log('\n=== NUMBERS FOUND IN MULTIPLE AGENTS (potential duplicates) ===');
    // Deduplicate - same number may appear in multiple Excel rows
    const seen = new Set();
    duplicatesInDb.forEach(d => {
      const key = d.company + '_' + d.num;
      if (seen.has(key)) return;
      seen.add(key);
      console.log('[' + d.company + '] ' + d.num + ' | ' + d.desc + ' → ' + d.agents);
    });
  }

  // Summary per company
  console.log('\n=== PER COMPANY SUMMARY ===');
  Object.entries(companyToCol).forEach(([company, col]) => {
    const rows = data.filter(r => r['יצרן'] === company);
    const uniqueNums = [...new Set(rows.map(r => String(r['מספר סוכן'])))];
    const found = uniqueNums.filter(n => lookup[col][n]);
    const miss = uniqueNums.filter(n => !lookup[col][n]);
    console.log(company + ': ' + found.length + '/' + uniqueNums.length + ' found' + (miss.length > 0 ? ', ' + miss.length + ' MISSING' : ''));
  });
}

main().catch(console.error);
