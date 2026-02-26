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

// Manual mapping: description keywords → DB agent ID
// Used when system name is undefined or ambiguous
const descToAgentId = {
  'אורטל לנג': 407,
  'אריאל בר-חיים': 401,
  'אריאל בר חיים': 401,
  'אריאלבר-חיים': 401,
  'אתיר דאהר': 341, // uses גל אלמגור numbers
  'גל אלמגור - מסלולים': 341,
  'גל אלמגור – רכישת תיק מלי רוקח': 341,
  'גל אלמגור סוכנות לביטוח (2008)': 341,
  'גל אלמגור סוכנות לביטוח (2008) בע"מ': 341,
  'גל אלמגור סוכנות לביטוח (2008)בע"מ': 341,
  'גל אלמגור דרום': 349,
  'גל אלמגור דרום-איתי אדן': 591,
  'דאוד ביט': 427,
  'דני פחימה': 345,
  'דני פחימה מס משותף גל אלמגור (דני סוכן מוביל)': 345,
  'שת"פ דני פחימה גל אלמגור': 345,
  'חנה כצנלסון (מס סוכן של גל אלמגור)': 403,
  'חנה כצנלסון': 403,
  'מוטי לוי ז"ל (מס סוכן גל אלמגור)': 341, // deceased, numbers go to main
  'מלי רוקח': 573, // קשל"ק
  'מלי רוקח (מס\' גל אלמגור) לפעילות חדשה קשל"ק': 573,
  'נור אבו ראס לא פעיל מס סוכן גל אלמגור': 408,
  'נור אבו ראס חדש (מס גל אלמגור)': 408,
  'סמדר (קוג\'מן)': 476,
  'סמיר בלאן': 369,
  'סמיר בלאן (מספר של גל אלמגור נמכר לסמיר )': 369,
  'עבוד ששון (מס סוכן גל אלמגור)': 557,
  'עובדי גל אלמגור': 341,
  'ערן גירוני מספרי גל אלמגור': 473,
  'קשל"ק נשר': 573,
  'שלי מזרחי': 402,
  'שלי מזרחי (מס סוכן גל אלמגור)': 402,
  'שלי מזרחי (מספרים שנמכרו לשלי מגל אלמגור )': 402,
  'שלומי אחלופי - דרום': 399,
  'אלרם נפוסי': 354,
  'אלרם נפסוי': 354,
  'אלרם סוכנות לביטוח בע"מ': 354,
  'אבי גולדר': 356,
  'נעם זילברמן הלשטוק': 406,
  'נעם זילברמן (מספרי סוכן גל אלמגור)': 406,
  'נועם הלשטוק (עצמאי)': 406,
  'זאב גול': 394,
  'זאב גול - דרום': 394,
  'שירלי בוכריס - דרום': 393,
  'שירלי בוכריס': 393,
  'חיים לוי שת"פ יונתן מנחם (מוביל מס\' של חיים)': 376,
  'מקסימום סוכנות לביטוח': 351,
  'מקסימום סוכנות לביטוצ': 351,
  'מקסימום': 351,
  'גל בדלר (מס\' של שטרן) 2024': 350,
  'לנג ביט סוכ לביטוח פנסיוני 2022': 407,
  'לנג ביט סוכ לביטוח פניסיוני 2022': 407,
  'אורי צ\'קוטאי': 368,
  'בחוס יוסף': 366,
  'מועלם אלפרד': 359,
  'גל אלמגור - וייס סוכנות לביטוח (2010) בע"מ': 348,
  'גל אלמגור - וייס סוכנות לביטוח ( 2010 ) בע"מ': 348,
  'לילי שרון': 381,
  'בראשית סוכנות לביטוח': 346,
  'סברה סמיר': 363,
  'סברא סמיר': 363,
  'אסף סטולרז\'': 392,
  'אסף סטולרז\' - דרום': 392,
  'גדי דאי': 372,
  'אורן רכס': 355,
  'גרזוזי אימן': 341, // uses גל אלמגור numbers
  'שלבי סאוסן': 361,
  'שלבי מייסון': 365,
  'סיון קליין - דרום': 367,
  'סיון קליין': 367,
  'א.ד. אבידן ביטוחים בע""מ': 352,
  'דניאלה אביב רכב ( מס סוכן גל אלמגור)': 342,
  'דניאלה אביב רכס (מס סוכן גל אלמגור)': 342,
  'מיכאל וקסלר (מס סוכן גל אלמגור)': 404,
  'מוטי גוטגילף (מס\' סוכן של גל אלמגור)': 541,
  'משה שטרן גל אלמגור- NGA': 350,
  'משה שטרן NGA (מכירת תיק ורייפי)': 350,
  'משה שטרן גל אלמגור': 350,
  'רפאל גלעד - מס\' סוכן גל אלמגור': 581,
  'שלומי קזז - מספרי גל אלמגור': 585,
  'שני לוי (מספרי סוכן גל אלמגור)': 405,
  'רותי פרנקו מס סוכן גל אלמגור': 343,
  'גל אלמגור ישיר (רותי)': 343,
  'סיון פיינרו - מספרים של גל אלמגור': 391,
  'יהונתן שיוביץ (מס\' של גל אלמגור)': 390,
  'יונתן מנחם (מספרי גל אלמגור)': 387,
  'ינאי חיים בוני (מס\' גל אלמגור)': 388,
  'ליאת משטה הרצליה (מספר גל אלמגור)': 421,
  'עיז אלדין חוסאם': 341, // uses גל אלמגור numbers
  'עיז אלדין חוסאם, סוכני מג\'אר (מס סוכן של גל אלמגור)': 341,
  'אילנית דרור (מס סוכן של גל אלמגור)': 344,
  'אילנית כהן': 400,
  'אילנית כהן - דרום': 400,
  'אלינית כהן - דרום': 400,
  'איתי אזולאי(מס של גל אלמגור)': 341, // uses גל אלמגור numbers
  'איתי אזולאי & ענק הביטוח-גל אלמגור (מס גל אלמגור)': 341,
  'אביב מור יוסף': 396,
  'דניאל דאי': 379,
  'אלפא סוכנות לביטוח': 341, // maps to main
  'אנואר עאסי (מס\' של גל אלמגור)': 341,
  'לא קיים בבאפי': 341, // default to main
  'ניר יבלונקה': 386,
  'שלומי גילה': 341, // maps to main
  'סטו וסרמן': 341,
  'גרניק בני': 360,
  'אחמד עלי אחמד': 380,
  'בדראנה עומר': 341,
  'חלבי ריזק': 364,
  'אדהם דראושה': 374,
  'עאטף עדאוי (אלמנטרי יהלומה)': 395,
  'ניזאם אבו חיט': 377,
  'מוטי חג\'ג\'': 542,
  'יעקב ישראל שטרן': 385,
  'אנה גלידר': 423,
  'אנואר עאסי': 341,
};

// System name → DB agent ID mapping
const systemNameToAgentId = {
  'גל אלמגור סוכ': 341,
  'גל אלמגור סוכ?': 341,
  'אורטל / לנג ביג סוכנות לביטוח פנסיוני': 407,
  'אריאל בר-חיים': 401,
  'אילנית כהן': 400,
  'אילנית?': 344,
  'איתי אדן?': 591,
  'אלרם סוכנות לביטוח?': 354,
  'גל אלמגור דרום סוכ ל': 349,
  'רכס אורן': 355,
  'דאי גדי': 372,
  'New Agent': null, // needs description-based matching
  'למי לשייך?': null,
  'מספר כתוב אצלנו אצל מישהו אחר': null,
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

  // Build lookup: for each company column, map each number to agent id
  const lookup = {};
  Object.values(companyToCol).forEach(col => { lookup[col] = {}; });

  agents.forEach(agent => {
    Object.values(companyToCol).forEach(col => {
      const val = agent[col];
      if (val && val !== 'UNMAPPED') {
        val.split(',').map(n => n.trim()).forEach(num => {
          lookup[col][num] = agent.id;
        });
      }
    });
  });

  // Find missing numbers and determine target agent
  const updates = {}; // { agentId_col: { agentId, col, numbers: [] } }
  const unmatched = [];
  const skipped = [];

  const companies = Object.keys(companyToCol);

  companies.forEach(company => {
    const col = companyToCol[company];
    const rows = data.filter(r => r['יצרן'] === company);

    rows.forEach(row => {
      const num = String(row['מספר סוכן']);

      // Skip if already exists
      if (lookup[col][num]) return;

      const systemName = row['שם סוכן בפורמט המערכת שפיתחנו'];
      const desc = row['תיאור מספר סוכן'] || '';

      let targetAgentId = null;

      // Strategy 1: Use system name mapping
      if (systemName && systemNameToAgentId[systemName] !== undefined) {
        targetAgentId = systemNameToAgentId[systemName];
      }

      // Strategy 2: If system name didn't resolve, use description mapping
      if (!targetAgentId) {
        // Try exact match first
        if (descToAgentId[desc]) {
          targetAgentId = descToAgentId[desc];
        }
        // Try partial matches
        if (!targetAgentId) {
          for (const [key, id] of Object.entries(descToAgentId)) {
            if (desc.includes(key) || key.includes(desc)) {
              targetAgentId = id;
              break;
            }
          }
        }
      }

      // Strategy 3: Match description against DB agent names
      if (!targetAgentId) {
        for (const agent of agents) {
          const name = agent.agent_name || '';
          // Clean both for comparison
          const cleanDesc = desc.replace(/[-()\s]/g, '');
          const cleanName = name.replace(/[-()\s]/g, '');
          if (cleanDesc && cleanName && (cleanDesc.includes(cleanName) || cleanName.includes(cleanDesc))) {
            targetAgentId = agent.id;
            break;
          }
        }
      }

      if (!targetAgentId) {
        unmatched.push({ company, num, desc, systemName });
        return;
      }

      const key = `${targetAgentId}_${col}`;
      if (!updates[key]) {
        const agent = agents.find(a => a.id === targetAgentId);
        updates[key] = { agentId: targetAgentId, agentName: agent ? agent.agent_name : '?', col, currentValue: agent ? agent[col] : '', numbers: [] };
      }

      // Check for duplicates - don't add if already in the update list
      if (!updates[key].numbers.includes(num)) {
        // Also check if already in current DB value
        const currentNums = (updates[key].currentValue || '').split(',').map(n => n.trim());
        if (!currentNums.includes(num)) {
          updates[key].numbers.push(num);
        } else {
          skipped.push({ company, num, desc, reason: 'already in DB' });
        }
      }
    });
  });

  // Output results
  console.log('\n=== UPDATES TO MAKE ===');
  const updateEntries = Object.values(updates).filter(u => u.numbers.length > 0);
  let totalNumbers = 0;
  updateEntries.forEach((u, i) => {
    console.log(`${i+1}. Agent ${u.agentId} (${u.agentName}) → ${u.col}: ADD [${u.numbers.join(', ')}]`);
    totalNumbers += u.numbers.length;
  });
  console.log(`\nTotal: ${updateEntries.length} agents to update, ${totalNumbers} numbers to add`);

  if (unmatched.length > 0) {
    console.log(`\n=== UNMATCHED (${unmatched.length}) ===`);
    unmatched.forEach((u, i) => {
      console.log(`${i+1}. [${u.company}] ${u.num} | ${u.desc} | System: ${u.systemName}`);
    });
  }

  if (skipped.length > 0) {
    console.log(`\n=== SKIPPED - DUPLICATES (${skipped.length}) ===`);
  }

  // DRY RUN - comment out to execute
  if (process.argv.includes('--execute')) {
  console.log('\n=== EXECUTING UPDATES ===');
  for (const u of updateEntries) {
    const currentVal = u.currentValue || '';
    const newVal = currentVal ? currentVal + ', ' + u.numbers.join(', ') : u.numbers.join(', ');

    const { error: updateError } = await supabase
      .from('agent_data')
      .update({ [u.col]: newVal })
      .eq('id', u.agentId);

    if (updateError) {
      console.log(`ERROR updating agent ${u.agentId} (${u.col}): ${updateError.message}`);
    } else {
      console.log(`OK: Agent ${u.agentId} (${u.agentName}) ${u.col} += [${u.numbers.join(', ')}]`);
    }
  }

  console.log('\nDone!');
  } else {
    console.log('\n--- DRY RUN --- Add --execute flag to actually update the DB');
  }
}

main().catch(console.error);
