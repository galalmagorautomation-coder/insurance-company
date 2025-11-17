const PHOENIX_MAPPING = require('./phoenixMapping');
const AYALON_MAPPING = require('./ayalonMapping');
const ANALYST_MAPPING = require('./analystMapping');
const MENORAH_MAPPING = require('./menorahMapping');
const MOR_MAPPING = require('./morMapping');
const MEDIHO_MAPPING = require('./medihoMapping');
const MIGDAL_MAPPING = require('./migdalMapping');
const HAREL_MAPPING = require('./harelMapping');
const { HACHSHARA_MAPPING_1, HACHSHARA_MAPPING_2, getHachsharaMapping } = require('./hatchsharaMapping');
const { ALTSHULER_MAPPING_1, ALTSHULER_MAPPING_2, getAltshulerMapping } = require('./altshulerMapping');
const { CLAL_MAPPING_SET1, CLAL_MAPPING_SET2, CLAL_MAPPING_SET3, getClalMapping } = require('./clalMapping'); 

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
  'הראל': HAREL_MAPPING,
  'Hachshara': HACHSHARA_MAPPING_1,
  'הכשרה': HACHSHARA_MAPPING_1,
  'Hachshara2': HACHSHARA_MAPPING_2,
  'הכשרה 2': HACHSHARA_MAPPING_2,
  'Altshuler Shaham': ALTSHULER_MAPPING_1,
  'אלטשולר שחם': ALTSHULER_MAPPING_1,
  'Clal': CLAL_MAPPING_SET1,        
  'כלל': CLAL_MAPPING_SET1,         
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
  HACHSHARA_MAPPING_1,
  HACHSHARA_MAPPING_2,
  ALTSHULER_MAPPING_1,
  ALTSHULER_MAPPING_2,
  CLAL_MAPPING_SET1,        
  CLAL_MAPPING_SET2,        
  CLAL_MAPPING_SET3,        
  COMPANY_MAPPINGS,
  getCompanyMapping,
  getHachsharaMapping,
  getAltshulerMapping,
  getClalMapping,           
};