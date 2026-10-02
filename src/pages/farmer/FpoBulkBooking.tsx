import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKishanData } from '@/context/DataContext';
import { FileUp, Users, Loader2, CheckCircle2, AlertTriangle, UploadCloud, Download, FileSpreadsheet, Trash2, TableProperties } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseDataService } from '@/services/supabaseData.service';

export default function FpoBulkBooking() {
  const store = useKishanData();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const data = [{
      farmer_name: "Ramesh Kumar",
      farmer_phone: "9876543210",
      crop_name: "Wheat",
      expected_quantity_q: 50,
      centre_id: "CEN-1234",
      slot_date: "2026-10-15"
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "FPO_Bulk_Booking_Template.xlsx");
    toast.success('Template downloaded successfully');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (fileToProcess: File) => {
    setFile(fileToProcess);
    setResults(null);
    setIsProcessing(true);
    setParsedData([]);
    setValidationErrors([]);

    try {
      const data = await fileToProcess.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

      const validRows: any[] = [];
      const errors: any[] = [];

      rows.forEach((row, index) => {
        if (!row.farmer_name || !row.farmer_phone || !row.crop_name || !row.expected_quantity_q || !row.centre_id || !row.slot_date) {
          errors.push({ row: index + 2, data: row, reason: 'Missing required fields' });
        } else {
          validRows.push(row);
        }
      });

      setParsedData(validRows);
      setValidationErrors(errors);
      setIsProcessing(false);
      
      if (validRows.length > 0) {
        toast.success(`Parsed ${validRows.length} valid rows from Excel`);
      }
      if (errors.length > 0) {
        toast.warning(`Found ${errors.length} invalid rows in Excel`);
      }
    } catch (error: any) {
      toast.error(`Error parsing Excel: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      toast.error('No valid data to upload');
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of parsedData) {
      try {
        const tokenNumber = `FPO-${Math.floor(10000 + Math.random() * 90000)}`;
        const payload = {
          farmer_id: row.farmer_id || `fpo-farmer-${uuidv4().substring(0, 8)}`,
          farmer_name: row.farmer_name,
          farmer_phone: row.farmer_phone,
          centre_id: row.centre_id,
          crop_name: row.crop_name,
          expected_quantity_q: parseFloat(row.expected_quantity_q),
          slot_date: row.slot_date,
          slot_time: row.slot_time || '09:00 AM - 11:00 AM',
          vehicle_number: row.vehicle_number || 'UNKNOWN',
          vehicle_type: row.vehicle_type || 'Tractor',
          token_number: tokenNumber,
          status: 'BOOKED' as const
        };

        const result = await SupabaseDataService.createBooking(payload);
        if (result) {
          successCount++;
        } else {
          // If the backend call failed without throwing, or returned null
          throw new Error('Supabase returned null or failed to insert');
        }
      } catch (err) {
        console.error('Failed to book row', row, err);
        failCount++;
      }
    }

    setResults({
      success: successCount,
      failed: failCount + validationErrors.length,
      total: parsedData.length + validationErrors.length
    });
    
    setIsUploading(false);
    if (successCount > 0) {
      toast.success(`Successfully booked ${successCount} slots!`);
      setParsedData([]);
      setValidationErrors([]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      toast.error('Failed to create any bookings from the CSV.');
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-24 md:pb-8">
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/50 border border-emerald-200/50 text-emerald-800 text-[10px] font-bold uppercase tracking-widest mb-3">
              <Users className="w-3.5 h-3.5" /> FPO Admin Portal
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Bulk Roster Scheduling</h1>
            <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
              Upload a standardized Excel manifest to instantly provision and schedule procurement slots for all member farmers.
            </p>
          </div>
          <Button onClick={downloadTemplate} variant="outline" className="h-12 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 font-bold gap-2 shadow-sm rounded-xl transition-all">
            <Download className="w-4 h-4" /> Download Excel Schema
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Area */}
          <Card className="p-6 md:p-8 border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl bg-white lg:col-span-1 h-fit relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-emerald-100/50">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mb-2">Upload Manifest</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Ensure the Excel file strictly adheres to the provided schema to prevent processing errors.
            </p>

            <Label htmlFor="excel-upload" className="sr-only">Select Excel File</Label>
            
            {!file ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-50/80 scale-[1.02] shadow-lg shadow-emerald-500/10' 
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 hover:border-emerald-300'
                }`}
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm mx-auto mb-4 border transition-colors duration-300 ${isDragging ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-white border-slate-100 text-emerald-500'}`}>
                  <FileUp className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">{isDragging ? 'Drop your Excel file here!' : 'Browse or drag Excel here'}</p>
                <p className="text-xs text-slate-400 font-medium">Supports .xlsx, .xls up to 10MB</p>
                <Input 
                  ref={fileInputRef}
                  id="excel-upload" 
                  type="file" 
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-emerald-100 bg-emerald-50/50 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-emerald-100 shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate pr-2 leading-tight">{file.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={resetForm} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {results && (
              <div className={`mt-8 p-5 rounded-2xl border text-left ${results.failed > 0 ? 'bg-amber-50 border-amber-200/60' : 'bg-emerald-50 border-emerald-200/60'}`}>
                <h3 className="font-bold mb-4 flex items-center gap-2 text-sm text-slate-900">
                  {results.failed > 0 ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  Processing Complete
                </h3>
                <ul className="text-xs space-y-3 font-medium">
                  <li className="flex justify-between border-b border-black/5 pb-2"><span className="text-slate-500">Total Rows Processed</span> <span className="font-bold text-slate-900">{results.total}</span></li>
                  <li className="flex justify-between border-b border-black/5 pb-2 text-emerald-700"><span>Successfully Booked</span> <span className="font-bold">{results.success}</span></li>
                  {results.failed > 0 && <li className="flex justify-between text-red-600 pt-1"><span>Failed / Invalid</span> <span className="font-bold">{results.failed}</span></li>}
                </ul>
              </div>
            )}
          </Card>

          {/* Preview & Action Area */}
          <div className="lg:col-span-2 space-y-8 flex flex-col h-full">
            <Card className="p-0 border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl bg-white overflow-hidden flex-1 flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                  <div className="bg-emerald-100 p-1.5 rounded-lg">
                    <TableProperties className="w-4 h-4 text-emerald-700" />
                  </div>
                  Data Preview
                </h2>
                {parsedData.length > 0 && (
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
                    {parsedData.length} Valid Rows
                  </span>
                )}
              </div>
              
              <div className="p-0 flex-1 relative bg-slate-50/30">
                {isProcessing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
                    <p className="text-sm font-bold tracking-wide">Validating Schema...</p>
                  </div>
                ) : !file ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 border border-slate-200">
                      <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">Awaiting Excel Manifest</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">Data preview will appear here upon upload.</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full min-h-[350px]">
                    <div className="overflow-x-auto flex-1 custom-scrollbar pb-2">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-[10px] text-slate-500 uppercase font-bold tracking-wider bg-white sticky top-0 border-b border-slate-100 z-10 shadow-sm">
                          <tr>
                            <th className="px-6 py-4">Farmer Name</th>
                            <th className="px-6 py-4">Phone</th>
                            <th className="px-6 py-4">Crop</th>
                            <th className="px-6 py-4 text-right">Qty (Q)</th>
                            <th className="px-6 py-4">Centre ID</th>
                            <th className="px-6 py-4">Slot Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {parsedData.slice(0, 5).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{row.farmer_name}</td>
                              <td className="px-6 py-4 font-mono text-slate-500 text-xs whitespace-nowrap">{row.farmer_phone}</td>
                              <td className="px-6 py-4 text-slate-600 whitespace-nowrap font-medium">{row.crop_name}</td>
                              <td className="px-6 py-4 text-slate-900 font-bold whitespace-nowrap text-right">{row.expected_quantity_q}</td>
                              <td className="px-6 py-4 text-slate-600 truncate max-w-[120px] font-mono text-xs">{row.centre_id}</td>
                              <td className="px-6 py-4 text-emerald-700 font-bold whitespace-nowrap">{row.slot_date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedData.length === 0 && validationErrors.length === 0 && (
                        <div className="p-10 text-center text-slate-500 text-sm font-medium">No valid records identified.</div>
                      )}
                    </div>
                    {parsedData.length > 5 && (
                      <div className="p-4 bg-white border-t border-slate-100 text-center text-xs text-slate-500 font-bold uppercase tracking-widest shadow-[0_-4px_10px_rgb(0,0,0,0.02)]">
                        Showing 5 of {parsedData.length} valid rows
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {validationErrors.length > 0 && (
              <Card className="p-0 border-amber-200/60 shadow-sm rounded-2xl overflow-hidden bg-white">
                <div className="p-4 bg-amber-50 border-b border-amber-100/60 flex items-center justify-between text-amber-900 font-bold text-sm">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" /> 
                    Found {validationErrors.length} Schema Violations
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-amber-700 bg-amber-200/50 px-2.5 py-1 rounded border border-amber-300/30">Action Required</span>
                </div>
                <div className="p-5 max-h-[180px] overflow-y-auto text-xs text-slate-600 custom-scrollbar">
                  <ul className="space-y-3">
                    {validationErrors.slice(0, 10).map((err, i) => (
                      <li key={i} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <span className="font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg min-w-[55px] text-center border border-amber-100/50">Row {err.row}</span> 
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-900 block mb-0.5">{err.reason}</span>
                          <span className="text-slate-500 block truncate font-mono text-[10px] bg-slate-50 px-2 py-1 rounded">Data: {JSON.stringify(err.data).substring(0, 80)}...</span>
                        </div>
                      </li>
                    ))}
                    {validationErrors.length > 10 && (
                      <li className="text-slate-400 font-bold text-center p-3 uppercase tracking-wider text-[10px]">
                        ...and {validationErrors.length - 10} more schema violations
                      </li>
                    )}
                  </ul>
                </div>
              </Card>
            )}

            <Button 
              onClick={handleUpload}
              disabled={parsedData.length === 0 || isUploading}
              className="w-full bg-[#0A2E1A] hover:bg-[#0f4527] text-white font-bold h-14 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.99] gap-2 text-base"
            >
              {isUploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Creating {parsedData.length} Bookings...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Confirm & Book {parsedData.length > 0 ? parsedData.length : ''} Slots</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
