window.gk_isXlsx = false;
window.gk_xlsxFileLookup = {};
window.gk_fileData = {};
window.markets = ['NASDAQ', 'SP500'];

function filledCell(cell) {
  return cell !== '' && cell != null;
}

function loadFileData(filename) {
  if (window.gk_isXlsx && window.gk_xlsxFileLookup[filename]) {
    try {
      var workbook = XLSX.read(window.gk_fileData[filename], { type: 'base64' });
      var firstSheetName = workbook.SheetNames[0];
      var worksheet = workbook.Sheets[firstSheetName];
      var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
      var filteredData = jsonData.filter(row => row.some(filledCell));
      var headerRowIndex = filteredData.findIndex((row, index) =>
        row.filter(filledCell).length >= (filteredData[index + 1]?.filter(filledCell).length || 0)
      );
      if (headerRowIndex === -1 || headerRowIndex > 25) {
        headerRowIndex = 0;
      }
      var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
      csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
      return csv;
    } catch (e) {
      console.error('Error processing XLSX file:', e);
      return "";
    }
  }
  return window.gk_fileData[filename] || "";
}