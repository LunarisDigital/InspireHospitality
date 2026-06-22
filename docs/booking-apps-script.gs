/**
 * Inspire Hospitality — consultation booking backend
 * Google Apps Script bound to a Google Sheet.
 *
 * Powers the booking widget on contact.html:
 *   • doGet(?date=YYYY-MM-DD)  → { booked: ["10:00", "11:30", …] }
 *       Returns the times already taken for that date, so the widget can
 *       grey them out. A request that is NOT confirmed frees itself up
 *       after HOLD_DAYS days; a request you mark Confirmed = TRUE stays
 *       blocked permanently.
 *   • doPost(JSON body)        → appends a booking row, returns { ok:true }
 *
 * Setup steps are in BOOKING-SETUP.md.
 */

var SHEET_NAME = 'Bookings';
var HOLD_DAYS = 7; // an unconfirmed request frees up after this many days

function doGet(e) {
  var date = (e && e.parameter && e.parameter.date) || '';
  var booked = [];
  if (date) {
    var rows = getSheet().getDataRange().getValues();
    var now = new Date();
    for (var i = 1; i < rows.length; i++) { // row 0 = header
      var r = rows[i];
      if (String(r[1]) !== date) continue; // col B = Date
      var confirmed = r[9] === true || String(r[9]).toUpperCase() === 'TRUE'; // col J
      var expires = r[10] ? new Date(r[10]) : null; // col K
      var live = confirmed || !expires || expires > now;
      if (live) booked.push(String(r[2])); // col C = Time (HH:MM)
    }
  }
  return json({ booked: booked });
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    var now = new Date();
    var expires = new Date(now.getTime() + HOLD_DAYS * 24 * 60 * 60 * 1000);
    getSheet().appendRow([
      now,                  // A  Timestamp
      p.date || '',         // B  Date (YYYY-MM-DD)
      p.time || '',         // C  Time (HH:MM)
      p.name || '',         // D  Name
      p.email || '',        // E  Email
      p.organisation || '', // F  Organisation
      p.phone || '',        // G  Phone
      p.notes || '',        // H  Notes
      p.timezone || '',     // I  Timezone label
      false,                // J  Confirmed — set TRUE by hand to lock the slot
      expires               // K  Expires (auto-frees if not confirmed)
    ]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Timestamp', 'Date', 'Time', 'Name', 'Email',
      'Organisation', 'Phone', 'Notes', 'Timezone', 'Confirmed', 'Expires']);
  }
  return sh;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
