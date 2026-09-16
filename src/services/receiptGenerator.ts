import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React from 'react';
import QRCode from 'react-qr-code';
import { renderToStaticMarkup } from 'react-dom/server';
import { Booking } from '@/types';

// Extend jsPDF type to include autoTable
interface jsPDFWithPlugin extends jsPDF {
  autoTable: typeof autoTable;
  lastAutoTable: {
    finalY: number;
  };
}

const generateQRDataUrl = async (payload: string): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const svgElement = React.createElement(QRCode, { 
        value: payload,
        size: 100,
        level: 'H'
      });
      const svgString = renderToStaticMarkup(svgElement);
      
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 1.0));
        } else {
          resolve('');
        }
      };
      
      img.onerror = () => {
        resolve('');
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    } catch (err) {
      console.error('Failed to generate QR data URL', err);
      resolve('');
    }
  });
};

export const generateReceiptPdf = async (booking: Booking, weighmentData?: any, paymentData?: any) => {
  const doc = new jsPDF() as jsPDFWithPlugin;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('KISHAN SEVA', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Official Procurement Receipt', pageWidth / 2, 28, { align: 'center' });
  
  // Line separator
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(14, 35, pageWidth - 14, 35);
  
  // Token info
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.text(`Token Number: ${booking.token_number}`, 14, 45);
  doc.text(`Date: ${booking.slot_date}`, pageWidth - 14, 45, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  
  // Details table
  const details = [
    ['Farmer Name', booking.farmer_name],
    ['Farmer ID', booking.farmer_id],
    ['Procurement Centre', booking.centre_name || booking.centre_id],
    ['Crop', booking.crop_name],
    ['Expected Quantity', `${booking.expected_quantity_q} Quintals`],
  ];
  
  if (weighmentData) {
    details.push(['Actual Weighed Quantity', `${weighmentData.net_weight_q || weighmentData.actual_weight} Quintals`]);
  }
  
  if (paymentData) {
    details.push(['MSP Rate', `₹${paymentData.rate_per_q || paymentData.msp_rate} / Quintal`]);
    details.push(['Total Amount', `₹${paymentData.total_amount || paymentData.amount}`]);
    if (paymentData.dbt_reference) {
      details.push(['DBT Reference', paymentData.dbt_reference]);
    }
  }

  autoTable(doc, {
    startY: 55,
    head: [['Field', 'Details']],
    body: details,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105] }, // emerald-600
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 'auto' }
    }
  });

  // QR Code
  const qrPayload = JSON.stringify({
    token: booking.token_number,
    farmer_id: booking.farmer_id,
    farmer_name: booking.farmer_name,
    centre_id: booking.centre_id,
    slot_date: booking.slot_date,
    slot_time: booking.slot_time,
    quantity_quintals: booking.expected_quantity_q,
    vehicle_number: booking.vehicle_number || 'WB-04-T-8812',
  });
  
  const qrDataUrl = await generateQRDataUrl(qrPayload);
  
  const finalY = doc.lastAutoTable?.finalY || 150;
  
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'JPEG', pageWidth / 2 - 25, finalY + 15, 50, 50);
  }
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('This is a digitally generated receipt and does not require a physical signature.', pageWidth / 2, finalY + 75, { align: 'center' });
  doc.text('Thank you for using Kishan Seva.', pageWidth / 2, finalY + 82, { align: 'center' });
  
  // Save PDF
  doc.save(`KishanSeva_Receipt_${booking.token_number}.pdf`);
  
  return true;
};
