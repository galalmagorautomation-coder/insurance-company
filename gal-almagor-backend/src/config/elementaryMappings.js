// Elementary Insurance Company Column Mappings
// This file contains mappings for elementary insurance data processing

const { getAyalonElementaryMapping } = require('./ayalonElementaryMapping');

// TODO: Uncomment as each company mapping is implemented
 const { getHachsharaElementaryMapping } = require('./hachsharaElementaryMapping');
 const { getPhoenixElementaryMapping } = require('./phoenixElementaryMapping');
 const { getHarelElementaryMapping } = require('./harelElementaryMapping');
const { getHaklaiElementaryMapping } = require('./haklaiElementaryMapping');
// const { getYeshirimElementaryMapping } = require('./yeshirimElementaryMapping');
 const { getClalElementaryMapping } = require('./clalElementaryMapping');
 const { getMigdalElementaryMapping } = require('./migdalElementaryMapping');
 const { getMMSElementaryMapping } = require('./mmsElementaryMapping');
 const { getMenorahElementaryMapping } = require('./menorahElementaryMapping');
 const { getPassportCardElementaryMapping } = require('./passportCardElementaryMapping');
 const { getShomeraElementaryMapping } = require('./shomeraElementaryMapping');
 const { getShirbitElementaryMapping } = require('./shirbitElementaryMapping');
 const { getShlomoElementaryMapping } = require('./shlomoElementaryMapping');
 const { getCooperNinevehElementaryMapping } = require('./cooperNinevehElementaryMapping');
 const { getSecuritiesElementaryMapping } = require('./securitiesElementaryMapping');
 const { getKashElementaryMapping } = require('./kashElementaryMapping');

/**
 * Get the appropriate elementary mapping based on company name and columns
 * @param {string} companyName - The name of the insurance company
 * @param {Array<string>} columns - The column headers from the Excel file
 * @param {string} month - The selected month in YYYY-MM format (for dynamic mappings)
 * @returns {Object} - The mapping configuration for the company
 */
function getElementaryMapping(companyName, columns, month = null) {
  console.log(`Getting elementary mapping for company: ${companyName}, month: ${month}`);

  // Route to appropriate company mapping based on company name
  switch (companyName) {
    case 'איילון':
    case 'Ayalon':
      return getAyalonElementaryMapping(columns);

    // TODO: Uncomment as each company is implemented
    
    case 'הכשרה':
    case 'Hachshara':
      return getHachsharaElementaryMapping(columns);

    case 'הפניקס':
    case 'The Phoenix (Including excellence)':
      return getPhoenixElementaryMapping(columns);

    case 'הראל':
    case 'Harel':
      return getHarelElementaryMapping(columns);


    case 'כלל':
    case 'Clal':
      return getClalElementaryMapping(columns);

    case 'מגדל':
    case 'Migdal':
      return getMigdalElementaryMapping(columns);

    case 'מ.מ.ס':
    case 'M.M.S':
    case 'MMS':
      return getMMSElementaryMapping(columns);

    case 'מנורה':
    case 'Menorah':
      return getMenorahElementaryMapping(columns);

    case 'פספורט קארד':   // With קארד
    case 'פספורט':        // Without קארד (matches database)
    case 'Passport Card': // English with Card
    case 'Passport':      // English without Card (matches database)
      return getPassportCardElementaryMapping(columns);

    case 'שומרה':
    case 'Shomera':
      return getShomeraElementaryMapping(columns);

    case 'שירביט':
    case 'Shirbit':
      return getShirbitElementaryMapping(columns);

    case 'שלמה':
    case 'Shlomo':
      if (!month) {
        throw new Error('Month parameter is required for Shlomo Elementary mapping');
      }
      return getShlomoElementaryMapping(month);

    case 'קופר נינווה':
    case 'Cooper Nineveh':
      return getCooperNinevehElementaryMapping(columns);

    case 'סקוריטס':
    case 'Securities':
      return getSecuritiesElementaryMapping(columns);

    case 'קאש':
    case 'Kash':
      return getKashElementaryMapping(columns);

    case 'חקלאי':
    case 'Haklai':
      return getHaklaiElementaryMapping(columns);

/*
    case 'ישירים':
    case 'Yeshirim':
      return getYeshirimElementaryMapping(columns);
*/

    default:
      throw new Error(`No elementary mapping found for company: ${companyName}`);
  }
}

module.exports = {
  getElementaryMapping
};