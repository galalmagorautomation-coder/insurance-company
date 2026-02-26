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

  // Get all agents from DB
  const { data: agents, error } = await supabase
    .from('agent_data')
    .select('id, agent_name, migdal_agent_id, harel_agent_id, menorah_agent_id, phoenix_agent_id, ayalon_agent_id, altshuler_agent_id, clal_agent_id, hachshara_agent_id, mor_agent_id');

  if (error) { console.error(error); return; }

  // Build lookup: for each company column, map each number to agent id+name
  const lookup = {};
  Object.values(companyToCol).forEach(col => { lookup[col] = {}; });

  agents.forEach(agent => {
    Object.values(companyToCol).forEach(col => {
      const val = agent[col];
      if (val && val !== 'UNMAPPED') {
        val.split(',').map(n => n.trim()).forEach(num => {
          lookup[col][num] = { id: agent.id, name: agent.agent_name };
        });
      }
    });
  });

  // Check each Excel row
  const notFound = [];
  const companies = Object.keys(companyToCol);

  companies.forEach(company => {
    const col = companyToCol[company];
    const rows = data.filter(r => r['יצרן'] === company);
    const uniqueNums = [...new Set(rows.map(r => String(r['מספר סוכן'])))];

    let found = 0;
    let missing = 0;

    uniqueNums.forEach(num => {
      if (lookup[col][num]) {
        found++;
      } else {
        missing++;
        const row = rows.find(r => String(r['מספר סוכן']) === num);
        notFound.push({
          company,
          col,
          num,
          desc: row['תיאור מספר סוכן'],
          systemName: row['שם סוכן בפורמט המערכת שפיתחנו'],
          status: row['האם קיים אצלנו?']
        });
      }
    });

    console.log(`${company} (${col}): ${found}/${uniqueNums.length} found, ${missing} missing`);
  });

  console.log(`\n=== MISSING NUMBERS (${notFound.length} total) ===`);
  notFound.forEach((r, i) => {
    console.log(`${i+1}. [${r.company}] ${r.num} | ${r.desc} | System: ${r.systemName} | Excel status: ${r.status}`);
  });
}

main().catch(console.error);
