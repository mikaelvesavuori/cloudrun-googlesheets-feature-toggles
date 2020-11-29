import Sheets from 'google-spreadsheet';

const { GoogleSpreadsheet } = Sheets;

/**
 * @description Use Google Sheets to host feature toggles, and let this application process and bring them to your users
 * @example
 * const featureToggles = new GoogleSheetsFeatureToggles(request.query);
 * const toggles = await featureToggles.getToggles();
 */
export class GoogleSheetsFeatureToggles {
  /**
   * @param queryParams HTTP query parameters
   * @example {
   *   sheet: '{SHEET_ID}',
   *   toggles: 'somevalue1,somevalue2'
   * }
   */
  constructor(queryParams) {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY)
      throw new Error('Missing required environment variables!');

    if (!queryParams) throw new Error('Missing query parameters!');

    const { sheet, toggles } = queryParams;
    if (!sheet || !toggles || toggles.length === 0)
      throw new Error(
        'Must provide "sheet" and "toggles" as query parameters! Example: {URL}?sheet={GOOGLE_SHEETS_DOCUMENT_ID}&toggles={COMMA_SEPARATED_LIST_OF_KEYS}'
      );

    this.sheetId = sheet;
    this.toggles = toggles.split(',');
  }

  /**
   * @description The controller/orchestrator for GoogleSheetsFeatureToggles
   */
  async getToggles() {
    try {
      const sheet = await this.loadSheet(this.sheetId);
      const rows = await this.loadRows(sheet);

      if (!sheet || !rows || !this.toggles || this.toggles.length === 0)
        throw new Error('Missing required input in getToggles()!');

      const matchedToggles = this.getMatchedToggles(this.toggles, rows);

      return {
        statusCode: 200,
        response: {
          toggles: matchedToggles,
          fetchedAt: Date.now()
        }
      };
    } catch (error) {
      console.error(error);
      return {
        statusCode: 500,
        response: error.toString()
      };
    }
  }

  /**
   * @description Authenticate to Google Sheets and load sheet
   *
   * @param {string} sheetId Google Sheets document ID
   */
  async loadSheet(sheetId) {
    if (!sheetId) throw new Error('No sheetId passed to loadSheet()!');

    const doc = new GoogleSpreadsheet(sheetId);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY
    });
    await doc.loadInfo();

    // Return first sheet/page
    return doc.sheetsByIndex[0];
  }

  /**
   * @description Get rows from document, add a bit of offset for heading and limit results to 100
   *
   * @param sheet Google sheet
   */
  async loadRows(sheet) {
    if (!sheet) throw new Error('No sheet passed to loadRows()!');

    return await sheet.getRows({
      offset: 0,
      limit: 100
    });
  }

  /**
   * @description Get all matched toggles by mapping and filtering them out from sheet rows
   *
   * @param {string[]} toggles List of toggle names
   * @param rows Rows from spreadsheet
   */
  getMatchedToggles(toggles, rows) {
    if (!toggles) throw new Error('Missing toggles or rows in getMatchedToggles()!');

    const _toggles = toggles.map((toggle) => this.getSingleToggle(toggle, rows));
    return _toggles.filter((toggle) => toggle !== undefined);
  }

  /**
   * @description Get matching row and return final toggle object
   *
   * @param {string} toggle Toggle name
   * @param rows Rows from spreadsheet
   */
  getSingleToggle(toggle, rows) {
    if (!toggle || !rows) throw new Error('Missing toggle or rows in getSingleToggle()!');

    const match = this.getMatchingRow(toggle, rows);
    if (!match || match.length === 0) return;
    return this.createToggleObject(match);
  }

  /**
   * @description Filter out a matching row
   *
   * @param {string} keyName Key/toggle name
   * @param rows Rows from spreadsheet
   */
  getMatchingRow(keyName, rows) {
    if (!keyName || !rows) throw new Error('No keyName and/or rows passed to getMatchingRow()!');

    const _row = rows.filter((row) => row.Key === keyName);
    if (_row[0]) return _row[0];
  }

  /**
   * @description Create the toggle object that will be returned
   *
   * @param match The matched item from the spreadsheet object response
   */
  createToggleObject(match) {
    if (!match) throw new Error('No match passed to createToggleObject()!');

    const { Key, Value, Group } = match;
    return {
      name: Key.toString(),
      value: Value.toString(),
      groups: this.createGroupObjects(Group.split(','))
    };
  }

  /**
   * @description Create the group object. The rolloutPercentage will coerce non-numeric values as default (= 100).
   *
   * @param {string[]} groups List of groups
   */
  createGroupObjects(groups) {
    if (!groups || groups.length === 0)
      throw new Error('No groups (or array is zero-length) passed to createGroupObject()!');

    const setRolloutPercentage = (percentage) => {
      if (percentage && !isNaN(percentage)) {
        if (percentage > 100) percentage = 100;
        return parseInt(percentage);
      }
      return 100;
    };

    return groups.map((group) => {
      const _group = group.split('=');
      const name = _group[0].replace(/\s/g, '');
      const rolloutPercentage = setRolloutPercentage(_group[1]);

      return {
        name,
        rolloutPercentage
      };
    });
  }
}
