import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKishanData } from '@/context/DataContext';
import { FileUp, Users, Loader2, CheckCircle2, AlertTriangle, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

export default function FpoBulkBooking() {
  const store = useKishanData();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; total: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast.error('Please select a CSV file first');
      return;
    }

    setIsProcessing(true);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let successCount = 0;
        let failCount = 0;

        for (const row of rows) {
          try {
            // Very basic validation
            if (!row.farmer_name || !row.farmer_phone || !row.crop_name || !row.expected_quantity_q || !row.centre_id || !row.slot_date) {
              failCount++;
              continue;
            }

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
              status: 'BOOKED'
            };

            await store.createBooking(payload);
            successCount++;
          } catch (err) {
            console.error('Failed to book row', row, err);
            failCount++;
          }
        }

        setResults({
          success: successCount,
          failed: failCount,
          total: rows.length
        });
        
        setIsProcessing(false);
        if (successCount > 0) {
          toast.success(`Successfully booked ${successCount} slots!`);
        } else {
          toast.error('Failed to create any bookings from the CSV.');
        }
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
        setIsProcessing(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-8">
      <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">FPO Bulk Booking</h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload a CSV file to create multiple slots for your group members.
            </p>
          </div>
        </div>

        <Card className="p-6 md:p-10 border-slate-200 shadow-sm rounded-2xl bg-white max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8" />
          </div>
          
          <div className="space-y-6 text-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Upload Roster (CSV)</h2>
              <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
                CSV must include: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">farmer_name</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">farmer_phone</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">crop_name</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">expected_quantity_q</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">centre_id</code>, <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">slot_date</code>.
              </p>
            </div>

            <div className="max-w-xs mx-auto text-left space-y-2">
              <Label htmlFor="csv-upload" className="sr-only">Select CSV File</Label>
              <div className="flex items-center gap-3">
                <Input 
                  id="csv-upload" 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            </div>

            <Button 
              onClick={handleUpload}
              disabled={!file || isProcessing}
              className="w-full max-w-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 rounded-lg transition-transform active:scale-[0.98]"
            >
              {isProcessing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing {file?.name}...</>
              ) : (
                <><UploadCloud className="w-4 h-4 mr-2" /> Upload & Book Slots</>
              )}
            </Button>

            {results && (
              <div className={`mt-6 p-4 rounded-xl border text-left ${results.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  {results.failed > 0 ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  Processing Complete
                </h3>
                <ul className="text-sm space-y-1">
                  <li>Total Rows: <strong>{results.total}</strong></li>
                  <li className="text-emerald-700">Successful Bookings: <strong>{results.success}</strong></li>
                  {results.failed > 0 && <li className="text-red-600">Failed/Invalid Rows: <strong>{results.failed}</strong></li>}
                </ul>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
