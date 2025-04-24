import express from 'express';
import { google } from 'googleapis';
import { checkAuth } from '../middlewares/tokens.js';
import Reservation from '../models/Reservation.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Get Google Sheets credentials from environment variables
const processEnvVar = (envVar) => {
  if (!envVar) return null;
  // Remove surrounding quotes if present
  return envVar.replace(/^["'](.*)["']$/, '$1');
};

const client_email = processEnvVar(process.env.client_email);
const private_key = processEnvVar(process.env.private_key);
const spreadsheetId = processEnvVar(process.env.GOOGLE_SHEET_ID);

// Log the credentials (without showing the full private key)
console.log('Google Sheets Configuration:');
console.log('- client_email:', client_email ? `${client_email.substring(0, 10)}...` : 'Missing');
console.log('- private_key:', private_key ? `${private_key.substring(0, 15)}... (length: ${private_key.length})` : 'Missing');
console.log('- spreadsheetId:', spreadsheetId || 'Missing');

// Create JWT auth client
const getAuthClient = () => {
  try {
    console.log('Creating Google Auth client with:');
    console.log('- client_email:', client_email ? 'Present (length: ' + client_email.length + ')' : 'Missing');
    console.log('- private_key:', private_key ? 'Present (length: ' + private_key.length + ')' : 'Missing');
    console.log('- spreadsheetId:', spreadsheetId || 'Missing');
    
    if (!client_email || !private_key || !spreadsheetId) {
      throw new Error('Missing required Google Sheets credentials');
    }
    
    return new google.auth.JWT(
      client_email,
      null,
      private_key,
      [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ]
    );
  } catch (error) {
    console.error('Error creating Google Auth client:', error);
    throw error;
  }
};


router.get('/all', checkAuth, async (req, res) => {
  try {
    console.log('Starting export process...');
    
    // Fetch all reservations with populated references
    const reservations = await Reservation.find()
      .populate('applicant', 'Name email department')
      .populate('bookings', 'roomNumber checkIn checkOut')
      .sort({ createdAt: -1 });
    
    if (!reservations || reservations.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No reservations found to export' 
      });
    }
    
    console.log(`Found ${reservations.length} reservations to export`);
    
    // Define column headers for the sheet
    const headers = [
      'Reservation ID', 
      'Guest Name', 
      'Guest Email',
      'Applicant Email',
      'Department',
      'Room Type', 
      'Room Numbers',
      'Arrival Date', 
      'Departure Date',
      'Status',
      'Category',
      'Payment Source',
      'Payment Status',
      'Amount',
      'Created At'
    ];
    
    // Format data for Google Sheets
    const data = reservations.map(reservation => {
      const roomNumbers = reservation.bookings?.map(booking => booking.roomNumber).join(', ') || '';
      
      return [
        reservation._id.toString(),
        reservation.guestName || '',
        reservation.guestEmail || '',
        reservation.applicant?.email || '',
        reservation.applicant?.department || '',
        reservation.roomType || '',
        roomNumbers,
        new Date(reservation.arrivalDate).toLocaleDateString(),
        new Date(reservation.departureDate).toLocaleDateString(),
        reservation.status || '',
        reservation.category || '',
        reservation.payment?.source || '',
        reservation.payment?.status || '',
        reservation.payment?.amount?.toString() || '',
        new Date(reservation.createdAt).toLocaleString()
      ];
    });
    
    // Format timestamp for sheet name
    const timestamp = new Date().toLocaleString().replace(/[/:]/g, '-').replace(/,/g, '');
    const sheetTitle = `Export_${timestamp}`;
    
    console.log(`Creating sheet with title: ${sheetTitle} in spreadsheet ID: ${spreadsheetId}`);
    
    // Try to create the sheet
    let result = null;
    let sheetId = null;
    let sheetUrl = null;
    
    try {
      result = await addSheetToSpreadsheet(sheetTitle, headers, data, {
        includeAnalysis: true
      });
      
      console.log('Export complete, result:', result);
      
      if (result && result.success && result.url) {
        return res.status(200).json({
          success: true,
          message: 'Data exported successfully to Google Sheets',
          url: result.url,
          rowCount: data.length,
          title: sheetTitle
        });
      }
    } catch (exportError) {
      console.error('Error creating sheet:', exportError);
      
      // Try to get the URL from the error if available
      if (exportError.url) {
        sheetUrl = exportError.url;
      } else if (result && result.url) {
        sheetUrl = result.url;
      } else {
        // Generate a fallback URL to the general spreadsheet
        sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      }
      
      return res.status(500).json({
        success: false,
        message: `Error while exporting: ${exportError.message}`,
        url: sheetUrl,
        rowCount: data.length,
        title: sheetTitle
      });
    }
    
    // Fallback case - should only happen if sheet creation fails
    return res.status(500).json({
      success: false,
      message: 'Failed to export data to Google Sheets. Please check the spreadsheet directly.',
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      title: 'Export Error'
    });
  } catch (error) {
    console.error('Error exporting all data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export data to Google Sheets',
      error: error.message,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    });
  }
});

/**
 * @route   POST /export/filtered
 * @desc    Export filtered reservations to Google Sheets
 * @access  Private
 */
router.post('/filtered', checkAuth, async (req, res) => {
  try {
    console.log('Starting filtered export process...');
    console.log('Received filters:', req.body);
    
    const { filters, dateRange, fields } = req.body;
    
    // Build query based on filters
    let query = {};
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          // Handle payment-related fields
          let fieldKey = key;
          if (key === "paymentStatus") {
            fieldKey = "payment.status";
          } else if (key === "paymentSource") {
            fieldKey = "payment.source";
          }

          // If the value is an array with elements, use $in operator for MongoDB
          if (Array.isArray(value) && value.length > 0) {
            query[fieldKey] = { $in: value };
          } else if (!Array.isArray(value) || value.length === 1) {
            // For single values or arrays with just one value
            query[fieldKey] = Array.isArray(value) ? value[0] : value;
          }
          // Skip empty arrays
        }
      });
    }
    
    // Add date range if provided
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      query.arrivalDate = {
        $gte: new Date(dateRange.startDate),
        $lte: new Date(dateRange.endDate)
      };
    }
    
    console.log('Built query:', query);
    console.log('Selected fields:', fields);
    
    // Fetch filtered reservations
    const reservations = await Reservation.find(query)
      .populate('applicant', 'Name email department')
      .populate('bookings', 'roomNumber checkIn checkOut')
      .sort({ createdAt: -1 });
    
    if (!reservations || reservations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No reservations found matching the filters'
      });
    }
    
    console.log(`Found ${reservations.length} filtered reservations to export`);
    
    // Define all possible columns and their mapping to data
    const columnMap = {
      'id': { header: 'Reservation ID', getValue: (r) => r._id.toString() },
      'guestName': { header: 'Guest Name', getValue: (r) => r.guestName || '' },
      'guestEmail': { header: 'Guest Email', getValue: (r) => r.guestEmail || '' },
      'applicantEmail': { header: 'Applicant Email', getValue: (r) => r.applicant?.email || '' },
      'department': { header: 'Department', getValue: (r) => r.applicant?.department || '' },
      'roomType': { header: 'Room Type', getValue: (r) => r.roomType || '' },
      'roomNumbers': { header: 'Room Numbers', getValue: (r) => r.bookings?.map(b => b.roomNumber).join(', ') || '' },
      'arrivalDate': { header: 'Arrival Date', getValue: (r) => new Date(r.arrivalDate).toLocaleDateString() },
      'departureDate': { header: 'Departure Date', getValue: (r) => new Date(r.departureDate).toLocaleDateString() },
      'status': { header: 'Status', getValue: (r) => r.status || '' },
      'category': { header: 'Category', getValue: (r) => r.category || '' },
      'paymentSource': { header: 'Payment Source', getValue: (r) => r.payment?.source || '' },
      'paymentStatus': { header: 'Payment Status', getValue: (r) => r.payment?.status || '' },
      'amount': { header: 'Amount', getValue: (r) => r.payment?.amount?.toString() || '' },
      'createdAt': { header: 'Created At', getValue: (r) => new Date(r.createdAt).toLocaleString() }
    };
    
    // Filter columns based on requested fields
    let selectedColumns = Object.keys(columnMap);
    if (fields && fields.length > 0) {
      // Only include fields that were requested
      selectedColumns = fields.filter(field => columnMap[field]);
      console.log('Filtered columns to:', selectedColumns);
    }
    
    // Get headers for selected columns
    const headers = selectedColumns.map(field => columnMap[field].header);
    
    // Format data for Google Sheets
    const data = reservations.map(reservation => {
      return selectedColumns.map(field => columnMap[field].getValue(reservation));
    });
    
    // Format timestamp for sheet name
    const timestamp = new Date().toLocaleString().replace(/[/:]/g, '-').replace(/,/g, '');
    const sheetTitle = `Filtered_Export_${timestamp}`;
    
    console.log(`Creating filtered sheet with title: ${sheetTitle}`);
    
    // Try to create the sheet
    let result = null;
    let sheetUrl = null;
    
    try {
      result = await addSheetToSpreadsheet(sheetTitle, headers, data, {
        includeAnalysis: true,
        filters: filters,
        dateRange: dateRange,
        fields: fields,
        selectedFields: selectedColumns,
        reservations: reservations
      });
      
      console.log('Filtered export complete, result:', result);
      
      if (result && result.success && result.url) {
        return res.status(200).json({
          success: true,
          message: 'Filtered data exported successfully to Google Sheets',
          url: result.url,
          rowCount: data.length,
          title: sheetTitle
        });
      }
    } catch (exportError) {
      console.error('Error creating filtered sheet:', exportError);
      
      // Try to get the URL from the error if available
      if (exportError.url) {
        sheetUrl = exportError.url;
      } else if (result && result.url) {
        sheetUrl = result.url;
      } else {
        // Generate a fallback URL to the general spreadsheet
        sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
      }
      
      return res.status(500).json({
        success: false,
        message: `Error while exporting filtered data: ${exportError.message}`,
        url: sheetUrl,
        rowCount: data.length,
        title: sheetTitle
      });
    }
    
    // Fallback case - should only happen if sheet creation fails
    return res.status(500).json({
      success: false,
      message: 'Failed to export filtered data to Google Sheets. Please check the spreadsheet directly.',
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      title: 'Filtered Export Error'
    });
  } catch (error) {
    console.error('Error exporting filtered data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export filtered data to Google Sheets',
      error: error.message,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    });
  }
});

/**
 * Add a new sheet to the existing spreadsheet
 */
async function addSheetToSpreadsheet(sheetTitle, headers, data, options = {}) {
  try {
    console.log('Starting addSheetToSpreadsheet process...');
    const auth = getAuthClient();
    
    console.log('Authorizing Google client...');
    try {
      await auth.authorize();
      console.log('Successfully authorized Google client');
    } catch (error) {
      console.error('Google auth error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error stack:', error.stack);
      throw new Error(`Google authentication failed: ${error.message}. Please check your credentials and try again.`);
    }
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log('Getting existing spreadsheet info...');
    
    // Get existing spreadsheet information
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });
      console.log('Successfully retrieved spreadsheet information');
      console.log(`Spreadsheet title: ${spreadsheet.data.properties.title}`);
      console.log(`Spreadsheet has ${spreadsheet.data.sheets.length} sheets`);
    } catch (error) {
      console.error('Error getting spreadsheet:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error stack:', error.stack);
      throw new Error(`Cannot access spreadsheet: ${error.message}. Please check your permissions and spreadsheet ID.`);
    }
    
    // Create a new sheet in the existing spreadsheet
    console.log(`Adding new sheet with title "${sheetTitle}" to spreadsheet...`);
    let addSheetResponse;
    try {
      addSheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetTitle,
                  gridProperties: {
                    frozenRowCount: 1  // Freeze the header row
                  }
                }
              }
            }
          ]
        }
      });
      
      // Get the new sheet ID
      const sheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
      console.log(`New sheet created with ID: ${sheetId} and title: ${sheetTitle}`);
      
      // Add a title row at the top with timestamp
      const titleText = options.filterCriteria 
        ? `Filtered Reservation Data - ${getFilterDescription(options.filterCriteria)} - Generated on ${new Date().toLocaleString()}`
        : `Reservation Data Export - Generated on ${new Date().toLocaleString()}`;
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetTitle}!A1:Z1`,
        valueInputOption: 'RAW',
        resource: { 
          values: [[titleText]] 
        }
      });
      
      // Write headers to the new sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `${sheetTitle}!A2`,
        valueInputOption: 'RAW',
        resource: { 
          values: [headers] 
        }
      });
      
      console.log('Headers written to sheet');
      
      // Write data if available
      if (data && data.length > 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: `${sheetTitle}!A3`,
          valueInputOption: 'RAW',
          resource: { 
            values: data 
          }
        });
        console.log(`${data.length} data rows written to sheet`);
      }
      
      // Enhanced formatting for a professional look
      const dataEndRow = data.length + 3; // +3 for title row, header row, and 0-indexing
      
      // Basic formatting requests
      const formattingRequests = getBasicFormattingRequests(sheetId, headers.length, dataEndRow);
      
      // Apply all formatting
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: {
          requests: formattingRequests
        }
      });
      
      console.log('Basic formatting applied to sheet');
      
      // Add revenue analysis if requested
      let analysisRowStart = dataEndRow + 2; // 2 row gap after data
      if (options.includeAnalysis) {
        analysisRowStart = await addRevenueAnalysis(sheets, spreadsheetId, sheetTitle, sheetId, headers, data, analysisRowStart, options);
        console.log('Revenue analysis added to sheet');
      }
      
      // Generate the URL to the sheet with a specific sheet reference
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`;
      
      console.log('Export complete. Returning result to client:', {
        success: true,
        message: 'Data exported successfully',
        url: url
      });
      
      return {
        success: true,
        message: 'Data exported successfully',
        url,
        rowCount: data.length + 1, // +1 for header
        sheetId,
        sheetTitle
      };
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.error(`Sheet with title "${sheetTitle}" already exists. Trying with a unique name...`);
        // Try with a more unique name
        const uniqueSheetTitle = `${sheetTitle}_${Date.now().toString().substring(8)}`;
        console.log(`Retrying with new sheet title: ${uniqueSheetTitle}`);
        return addSheetToSpreadsheet(uniqueSheetTitle, headers, data, options);
      }
      
      console.error('Error adding sheet to spreadsheet:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error stack:', error.stack);
      throw new Error(`Failed to create new sheet: ${error.message}. Please try again with a different sheet name.`);
    }
  } catch (error) {
    console.error('Error in addSheetToSpreadsheet:', error);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Get human-readable description of filters
 */
function getFilterDescription(filters) {
  const parts = [];
  
  if (filters.startDate) {
    parts.push(`From: ${new Date(filters.startDate).toLocaleDateString()}`);
  }
  
  if (filters.endDate) {
    parts.push(`To: ${new Date(filters.endDate).toLocaleDateString()}`);
  }
  
  if (filters.category) {
    // Handle both string and array values
    if (Array.isArray(filters.category)) {
      if (filters.category.length > 3) {
        parts.push(`Categories: ${filters.category.length} selected`);
      } else {
        parts.push(`Categories: ${filters.category.join(', ')}`);
      }
    } else {
      parts.push(`Category: ${filters.category}`);
    }
  }
  
  if (filters.roomType) {
    // Handle both string and array values
    if (Array.isArray(filters.roomType)) {
      if (filters.roomType.length > 3) {
        parts.push(`Room Types: ${filters.roomType.length} selected`);
      } else {
        parts.push(`Room Types: ${filters.roomType.join(', ')}`);
      }
    } else {
      parts.push(`Room Type: ${filters.roomType}`);
    }
  }
  
  if (filters.status) {
    // Handle both string and array values
    if (Array.isArray(filters.status)) {
      if (filters.status.length > 3) {
        parts.push(`Statuses: ${filters.status.length} selected`);
      } else {
        parts.push(`Statuses: ${filters.status.join(', ')}`);
      }
    } else {
      parts.push(`Status: ${filters.status}`);
    }
  }
  
  if (filters.paymentStatus) {
    // Handle both string and array values
    if (Array.isArray(filters.paymentStatus)) {
      if (filters.paymentStatus.length > 3) {
        parts.push(`Payment Statuses: ${filters.paymentStatus.length} selected`);
      } else {
        parts.push(`Payment Statuses: ${filters.paymentStatus.join(', ')}`);
      }
    } else {
      parts.push(`Payment Status: ${filters.paymentStatus}`);
    }
  }
  
  if (filters.paymentSource) {
    // Handle both string and array values
    if (Array.isArray(filters.paymentSource)) {
      if (filters.paymentSource.length > 3) {
        parts.push(`Payment Sources: ${filters.paymentSource.length} selected`);
      } else {
        parts.push(`Payment Sources: ${filters.paymentSource.join(', ')}`);
      }
    } else {
      parts.push(`Payment Source: ${filters.paymentSource}`);
    }
  }

  // Add information about selected fields if provided
  if (filters.fields && filters.fields.length > 0) {
    parts.push(`Selected Fields: ${filters.fields.length} fields`);
  }
  
  return parts.join(', ') || 'All Data';
}

/**
 * Get basic formatting requests for the sheet
 */
function getBasicFormattingRequests(sheetId, headerCount, endRowIndex) {
  return [
    // Title row formatting - merge cells and center
    {
      mergeCells: {
        range: {
          sheetId: sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: headerCount
        },
        mergeType: 'MERGE_ALL'
      }
    },
    // Title text formatting
    {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 1
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
              fontSize: 14
            },
            horizontalAlignment: 'CENTER',
            backgroundColor: {
              red: 0.95,
              green: 0.95,
              blue: 0.95
            }
          }
        },
        fields: 'userEnteredFormat(textFormat,horizontalAlignment,backgroundColor)'
      }
    },
    // Header row formatting
    {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: 1,
          endRowIndex: 2,
          startColumnIndex: 0,
          endColumnIndex: headerCount
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
              foregroundColor: {
                red: 1.0,
                green: 1.0,
                blue: 1.0
              }
            },
            backgroundColor: {
              red: 0.2,
              green: 0.4,
              blue: 0.6
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP'
          }
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy)'
      }
    },
    // Center align all data cells
    {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: 2,
          endRowIndex: endRowIndex,
          startColumnIndex: 0,
          endColumnIndex: headerCount
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment)'
      }
    },
    // Alternate row coloring for better readability
    {
      repeatCell: {
        range: {
          sheetId: sheetId,
          startRowIndex: 2,
          endRowIndex: endRowIndex,
          startColumnIndex: 0,
          endColumnIndex: headerCount
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 0.95,
              green: 0.95,
              blue: 0.95
            }
          }
        },
        fields: 'userEnteredFormat.backgroundColor'
      }
    },
    // Add borders to all cells
    {
      updateBorders: {
        range: {
          sheetId: sheetId,
          startRowIndex: 1,
          endRowIndex: endRowIndex,
          startColumnIndex: 0,
          endColumnIndex: headerCount
        },
        top: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 }
        },
        bottom: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 }
        },
        left: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 }
        },
        right: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 }
        },
        innerHorizontal: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 }
        },
        innerVertical: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 }
        }
      }
    },
    // Auto-resize columns for best fit
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId: sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: headerCount
        }
      }
    }
  ];
}

/**
 * Add revenue analysis section to the sheet
 */
async function addRevenueAnalysis(sheets, spreadsheetId, sheetTitle, sheetId, headers, data, startRow, options) {
  // Find the column index for amount, category, and payment status
  const amountIdx = headers.findIndex(h => h === 'Amount');
  const categoryIdx = headers.findIndex(h => h === 'Category');
  const statusIdx = headers.findIndex(h => h === 'Payment Status');
  const sourceIdx = headers.findIndex(h => h === 'Payment Source');
  
  if (amountIdx === -1) {
    console.log('Cannot add revenue analysis: Amount column not found');
    return startRow;
  }
  
  let currentRow = startRow;
  
  // Add section title
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A${currentRow}:Z${currentRow}`,
    valueInputOption: 'RAW',
    resource: { 
      values: [['REVENUE ANALYSIS']]
    }
  });
  
  // Format section title
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          mergeCells: {
            range: {
              sheetId,
              startRowIndex: currentRow - 1,
              endRowIndex: currentRow,
              startColumnIndex: 0,
              endColumnIndex: 5
            },
            mergeType: 'MERGE_ALL'
          }
        },
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: currentRow - 1,
              endRowIndex: currentRow,
              startColumnIndex: 0,
              endColumnIndex: 5
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true,
                  fontSize: 14
                },
                backgroundColor: {
                  red: 0.2,
                  green: 0.4,
                  blue: 0.6
                },
                foregroundColor: {
                  red: 1.0,
                  green: 1.0,
                  blue: 1.0
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor,foregroundColor,horizontalAlignment,verticalAlignment)'
          }
        }
      ]
    }
  });
  
  currentRow += 2;
  
  // Category breakdown if category column exists
  if (categoryIdx !== -1) {
    const categories = options.categories || ['ES-A', 'ES-B', 'BR-A', 'BR-B1', 'BR-B2'];
    
    // Add headers for category analysis
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A${currentRow}:E${currentRow}`,
      valueInputOption: 'RAW',
      resource: { 
        values: [['Category', 'Total Revenue', 'Paid Amount', 'Pending Amount', 'Reservation Count']]
      }
    });
    
    // Format headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: currentRow - 1,
                endRowIndex: currentRow,
                startColumnIndex: 0,
                endColumnIndex: 5
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true
                  },
                  backgroundColor: {
                    red: 0.9,
                    green: 0.9,
                    blue: 0.9
                  },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)'
            }
          }
        ]
      }
    });
    
    currentRow++;
    
    // Use arrayFormula to calculate totals by category
    const rowRange = `3:${data.length + 2}`; // +2 for header and title rows
    const categoryRows = {};
    
    // Convert data rows for calculation
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      
      // Calculate totals directly in JS for this category
      let totalRevenue = 0, paidAmount = 0, pendingAmount = 0, count = 0;
      
      if (data.length > 0 && options.reservations) {
        for (const reservation of options.reservations) {
          if (reservation.category === category) {
            count++;
            const amount = parseFloat(reservation.payment?.amount || 0);
            totalRevenue += amount;
            
            if (reservation.payment?.status === 'PAID') {
              paidAmount += amount;
            } else {
              pendingAmount += amount;
            }
          }
        }
      }
      
      // Add row for this category
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A${currentRow}:E${currentRow}`,
        valueInputOption: 'RAW',
        resource: { 
          values: [[
            category, 
            totalRevenue, 
            paidAmount,
            pendingAmount,
            count
          ]]
        }
      });
      
      currentRow++;
    }
    
    // Add total row with sum formulas
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A${currentRow}:E${currentRow}`,
      valueInputOption: 'RAW',
      resource: { 
        values: [['TOTAL', 
          `=SUM(B${currentRow-categories.length}:B${currentRow-1})`,
          `=SUM(C${currentRow-categories.length}:C${currentRow-1})`,
          `=SUM(D${currentRow-categories.length}:D${currentRow-1})`,
          `=SUM(E${currentRow-categories.length}:E${currentRow-1})`
        ]]
      }
    });
    
    // Format the total row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: currentRow - 1,
                endRowIndex: currentRow,
                startColumnIndex: 0,
                endColumnIndex: 5
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true
                  },
                  backgroundColor: {
                    red: 0.8,
                    green: 0.9,
                    blue: 0.8
                  }
                }
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)'
            }
          }
        ]
      }
    });
    
    currentRow += 3;
  }
  
  // Payment status breakdown
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A${currentRow}:C${currentRow}`,
    valueInputOption: 'RAW',
    resource: { 
      values: [['Payment Status', 'Amount', 'Reservation Count']]
    }
  });
  
  // Format payment status header
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: currentRow - 1,
              endRowIndex: currentRow,
              startColumnIndex: 0,
              endColumnIndex: 3
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true
                },
                backgroundColor: {
                  red: 0.9,
                  green: 0.9,
                  blue: 0.9
                },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)'
          }
        }
      ]
    }
  });
  
  currentRow++;
  
  // Calculate payment status breakdowns
  if (statusIdx !== -1 && options.reservations) {
    const statusTotals = {};
    
    for (const reservation of options.reservations) {
      const status = reservation.payment?.status || 'UNKNOWN';
      if (!statusTotals[status]) {
        statusTotals[status] = { amount: 0, count: 0 };
      }
      statusTotals[status].amount += parseFloat(reservation.payment?.amount || 0);
      statusTotals[status].count++;
    }
    
    // Add a row for each payment status
    for (const [status, data] of Object.entries(statusTotals)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A${currentRow}:C${currentRow}`,
        valueInputOption: 'RAW',
        resource: { 
          values: [[status, data.amount, data.count]]
        }
      });
      currentRow++;
    }
  } else {
    // Fallback if we can't calculate directly
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A${currentRow}:C${currentRow+1}`,
      valueInputOption: 'RAW',
      resource: { 
        values: [
          ['PAID', 'Calculated from data', 'Calculated from data'],
          ['PENDING', 'Calculated from data', 'Calculated from data']
        ]
      }
    });
    currentRow += 2;
  }
  
  // Add room occupancy section if room numbers column exists
  if (headers.includes('Room Numbers')) {
    currentRow += 2;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A${currentRow}:Z${currentRow}`,
      valueInputOption: 'RAW',
      resource: { 
        values: [['ROOM OCCUPANCY ANALYSIS']]
      }
    });
    
    // Format section title
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            mergeCells: {
              range: {
                sheetId,
                startRowIndex: currentRow - 1,
                endRowIndex: currentRow,
                startColumnIndex: 0,
                endColumnIndex: 5
              },
              mergeType: 'MERGE_ALL'
            }
          },
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: currentRow - 1,
                endRowIndex: currentRow,
                startColumnIndex: 0,
                endColumnIndex: 5
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                    fontSize: 14
                  },
                  backgroundColor: {
                    red: 0.2,
                    green: 0.4,
                    blue: 0.6
                  },
                  foregroundColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 1.0
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor,foregroundColor,horizontalAlignment,verticalAlignment)'
            }
          }
        ]
      }
    });
    
    currentRow += 2;
    
    // Collect all occupied room numbers
    const occupiedRooms = new Set();
    if (options.reservations) {
      for (const reservation of options.reservations) {
        if (reservation.bookings && reservation.bookings.length > 0) {
          for (const booking of reservation.bookings) {
            if (booking.roomNumber) {
              occupiedRooms.add(booking.roomNumber);
            }
          }
        }
      }
    }
    
    if (occupiedRooms.size > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A${currentRow}:B${currentRow}`,
        valueInputOption: 'RAW',
        resource: { 
          values: [['Occupied Rooms', Array.from(occupiedRooms).join(', ')]]
        }
      });
      
      currentRow += 2;
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A${currentRow}:B${currentRow}`,
        valueInputOption: 'RAW',
        resource: { 
          values: [['Total Occupied Rooms', occupiedRooms.size]]
        }
      });
      
      currentRow += 1;
    }
  }
  
  return currentRow;
}

export default router; 