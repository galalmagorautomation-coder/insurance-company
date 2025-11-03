const PHOENIX_MAPPING = require('./phoenixMapping');
const AYALON_MAPPING = require('./ayalonMapping');
const ANALYST_MAPPING = require('./analystMapping');  
const MENORAH_MAPPING = require('./menorahMapping');
const MOR_MAPPING = require('./morMapping');
const MEDIHO_MAPPING = require('./medihoMapping');
const MIGDAL_MAPPING = require('./migdalMapping');
const HAREL_MAPPING = require('./harelMapping');

const COMPANY_MAPPINGS = {
  'The Phoenix': PHOENIX_MAPPING,
  'הפניקס': PHOENIX_MAPPING,
  'Ayalon': AYALON_MAPPING,
  'איילון': AYALON_MAPPING,
  'Analyst': ANALYST_MAPPING,      
  'אנליסט': ANALYST_MAPPING,
  'Menorah': MENORAH_MAPPING,      
  'מנורה': MENORAH_MAPPING,
  'Mor': MOR_MAPPING,          
  'מור': MOR_MAPPING,
  'Mediho': MEDIHO_MAPPING,        
  'מדיהו': MEDIHO_MAPPING,
  'Migdal': MIGDAL_MAPPING,
  'מגדל': MIGDAL_MAPPING,
  'Harel': HAREL_MAPPING,          
  'הראל': HAREL_MAPPING      
};

function getCompanyMapping(companyName) {
  return COMPANY_MAPPINGS[companyName] || null;
}

module.exports = {
  PHOENIX_MAPPING,
  AYALON_MAPPING,
  ANALYST_MAPPING,  
  MENORAH_MAPPING,
  MOR_MAPPING,
  MEDIHO_MAPPING,
  MIGDAL_MAPPING,
  HAREL_MAPPING,
  COMPANY_MAPPINGS,
  getCompanyMapping
};