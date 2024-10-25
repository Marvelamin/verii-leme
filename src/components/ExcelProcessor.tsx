import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, Search, Calendar, Filter } from 'lucide-react';
import { ExcelData, ExcelProcessorProps } from '../types';

const ExcelProcessor: React.FC<ExcelProcessorProps> = ({ mainExcel, setMainExcel }) => {
  const [newExcel, setNewExcel] = useState<ExcelData[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [isDateFiltered, setIsDateFiltered] = useState(false);
  const [noResults, setNoResults] = useState(false);

  // Load saved Excel data from localStorage
  useEffect(() => {
    const savedExcel = localStorage.getItem('excelData');
    if (savedExcel) {
      setNewExcel(JSON.parse(savedExcel));
    }
  }, []);

  // Save Excel data to localStorage whenever it changes
  useEffect(() => {
    if (newExcel.length > 0) {
      localStorage.setItem('excelData', JSON.stringify(newExcel));
    }
  }, [newExcel]);

  const handleNewExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelData[];
        setNewExcel(jsonData);
        setFilters({});
        setDateRange({ start: '', end: '' });
        setIsDateFiltered(false);
        setNoResults(false);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const mergeExcelFiles = () => {
    const mergedData = [...mainExcel, ...newExcel];
    setMainExcel(mergedData);
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(mergedData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Merged Data');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'merged_excel.xlsx';
    link.click();
  };

  const isDateColumn = (header: string, value: any): boolean => {
    return (
      header.toLowerCase().includes('date') ||
      header.toLowerCase().includes('tarih') ||
      (typeof value === 'string' && !isNaN(Date.parse(value)))
    );
  };

  const filteredData = useMemo(() => {
    const filtered = newExcel.filter((row) => {
      // Check if row matches all filters
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const cellValue = row[key]?.toString().toLowerCase() || '';
        return cellValue.includes(value.toLowerCase());
      });

      // Check if row matches date range
      const matchesDateRange = Object.entries(row).every(([key, value]) => {
        if (!isDateColumn(key, value)) return true;
        if (!isDateFiltered || (!dateRange.start && !dateRange.end)) return true;

        const cellDate = new Date(value);
        const start = dateRange.start ? new Date(dateRange.start) : new Date(0);
        const end = dateRange.end ? new Date(dateRange.end) : new Date(8640000000000000);

        return cellDate >= start && cellDate <= end;
      });

      return matchesFilters && matchesDateRange;
    });

    setNoResults(filtered.length === 0);
    return filtered;
  }, [newExcel, filters, dateRange, isDateFiltered]);

  const handleFilterChange = (header: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [header]: value,
    }));
  };

  const handleDateFilter = () => {
    if (!dateRange.start && !dateRange.end) {
      alert('Lütfen en az bir tarih seçin');
      return;
    }
    setIsDateFiltered(true);
  };

  const clearDateFilter = () => {
    setDateRange({ start: '', end: '' });
    setIsDateFiltered(false);
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Yeni Excel Dosyası Ekle</h2>
      <div className="mb-6">
        <label htmlFor="newExcel" className="block text-sm font-medium text-gray-700 mb-2">
          Yeni Excel Dosyası Yükle
        </label>
        <div className="flex items-center justify-center w-full">
          <label htmlFor="newExcel" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-10 h-10 mb-3 text-gray-400" />
              <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Yüklemek için tıklayın</span> veya sürükleyip bırakın</p>
              <p className="text-xs text-gray-500">XLSX, XLS</p>
            </div>
            <input id="newExcel" type="file" className="hidden" onChange={handleNewExcelUpload} accept=".xlsx,.xls" />
          </label>
        </div>
      </div>

      <button
        onClick={mergeExcelFiles}
        disabled={newExcel.length === 0}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed mb-6"
      >
        <div className="flex items-center justify-center">
          <Download className="w-5 h-5 mr-2" />
          Birleştir ve İndir
        </div>
      </button>
      
      {newExcel.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Yüklenen Excel Verisi</h3>

          {/* Date Range Filter */}
          <div className="mb-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center gap-4 flex-wrap">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div className="flex gap-2 items-center flex-1">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
                <span>-</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDateFilter}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Tarihe Göre Filtrele
                </button>
                {isDateFiltered && (
                  <button
                    onClick={clearDateFilter}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                  >
                    Filtreyi Temizle
                  </button>
                )}
              </div>
            </div>
          </div>

          {noResults ? (
            <div className="text-center py-8 text-gray-500">
              Seçilen tarih aralığında veri bulunamadı
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(newExcel[0]).map((header) => (
                      <th key={header} className="px-6 py-3">
                        <div className="space-y-2">
                          <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={filters[header] || ''}
                              onChange={(e) => handleFilterChange(header, e.target.value)}
                              placeholder="Filtrele..."
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            />
                            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td
                          key={i}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {value?.toString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            Toplam {filteredData.length} kayıt gösteriliyor (Toplam: {newExcel.length})
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelProcessor;