import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import pdfFont from "../forms/Ubuntu-R.ttf";
import iconsFont from "../forms/Wingdings2.ttf";

const PDF_TEMPLATE_PATH = "/forms/Revised_Register_Form.pdf";

export const generateFilledPDF = async (formData) => {
  try {
    //  for debugging
    console.log("Generating PDF with form data:", 
      { 
        guestName: formData.guestName,
        guestGender: formData.guestGender,
        arrivalDate: formData.arrivalDate,
        roomType: formData.roomType,
        category: formData.category,
        adminAnnotation: formData.adminAnnotation,
        source: formData.source,
        payment: formData.payment
      }
    );
    
    //  font resources
    const fontBytes = await fetch(pdfFont).then((res) => res.arrayBuffer());
    const fontBytesIcons = await fetch(iconsFont).then((res) =>
      res.arrayBuffer()
    );

    // Use an absolute path from the server root
    const pdfPath = `${window.location.origin}${PDF_TEMPLATE_PATH}`;
    console.log("Attempting to load PDF from:", pdfPath);
    
    // Fetch the PDF with error handling
    const response = await fetch(pdfPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }
    
    const pdfData = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfData);

    // Register fonts
    pdfDoc.registerFontkit(fontkit);
    const ubuntuFont = await pdfDoc.embedFont(fontBytes, { subset: true });
    const pdfIconsFont = await pdfDoc.embedFont(fontBytesIcons, {
      subset: true,
    });

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const secondPage = pages[1];
    
    // Helper function to ensure text values are strings, not numbers
    const ensureString = (value) => {
      if (value === null || value === undefined) return "";
      return String(value);
    };
    
    // Helper function to format dates in Indian format (DD-MM-YYYY)
    const formatDateIndian = (dateValue) => {
      if (!dateValue) return "";
      try {
        // Handle ISO date strings (with T) or any other valid date format
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return ensureString(dateValue); // Fallback for invalid dates
        
        // Format as DD-MM-YYYY
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (error) {
        console.error("Error formatting date:", error);
        return ensureString(dateValue); // Fallback to original value
      }
    };
    
    // Name of Guest - Line 1
    firstPage.drawText(ensureString(formData.guestName), {
      x: 210,
      y: 698,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Gender of Guest - Line 1 (on the right side)
    const genderMap = {
      "MALE": "Male",
      "FEMALE": "Female",
      "OTHER": "Other"
    };
    const formattedGender = genderMap[formData.guestGender] || ensureString(formData.guestGender);
    firstPage.drawText(`${formattedGender}`, {
      x: 470,
      y: 698,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Address of Guest - Line 2
    firstPage.drawText(ensureString(formData.address), {
      x: 210, 
      y: 680,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Contact number - Line 3 - FIXED POSITION
    firstPage.drawText(ensureString(formData.applicant?.mobile), {
      x: 160, 
      y: 661,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Number of Guests - Line 3 (right side)
    firstPage.drawText(ensureString(formData.numberOfGuests), {
      x: 330,
      y: 661,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Number of Rooms - Line 4 (right side)
    firstPage.drawText(ensureString(formData.numberOfRooms), {
      x: 520,
      y: 661,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Room Type - Line 5 - FIXED POSITION
    firstPage.drawText(ensureString(formData.roomType), {
      x: 365,
      y: 643,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Arrival Date - In the table - FIXED POSITION
    firstPage.drawText(formatDateIndian(formData.arrivalDate), {
      x: 88,
      y: 605,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Arrival Time - FIXED POSITION
    firstPage.drawText(ensureString(formData.arrivalTime), {
      x: 200,
      y: 605,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Departure Date - FIXED POSITION
    firstPage.drawText(formatDateIndian(formData.departureDate), {
      x: 330,
      y: 605,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Departure Time - FIXED POSITION
    firstPage.drawText(ensureString(formData.departureTime), {
      x: 450,
      y: 605,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Purpose of Booking - Line 6 - FIXED POSITION
    firstPage.drawText(ensureString(formData.purpose), {
      x: 200,
      y: 575,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });

    // Check mark symbol
    var tick = "P";
    
    // Place tick marks for the correct Room Type selection (Executive Suite vs Business Room)
    if (formData.category.startsWith("ES-")) {
      // Executive Suite Room
      firstPage.drawText(tick, {
        x: 260,
        y: 550,
        size: 12,
        font: pdfIconsFont,
        color: rgb(0, 0, 0),
      });
    } else if (formData.category.startsWith("BR-")) {
      // Business Room
      firstPage.drawText(tick, {
        x: 395,
        y: 550,
        size: 12,
        font: pdfIconsFont,
        color: rgb(0, 0, 0),
      });
    }
    
    // Category tick marks - only place tick marks, no text
    if (formData.category === "ES-A") {
      // Executive Suite Room - Cat-A (Free)
      firstPage.drawText(tick, {
        x: 260,
        y: 483,
        size: 12,
        font: pdfIconsFont,
        color: rgb(0, 0, 0),
      });
    } else if (formData.category === "ES-B") {
      // Executive Suite Room - Cat-B
      firstPage.drawText(tick, {
        x: 260,
        y: 465,
        size: 12,
        font: pdfIconsFont,
        color: rgb(0, 0, 0),
      });
    } else if (formData.category === "BR-A") {
      // Business Room - Cat-A (Free)
      firstPage.drawText(tick, {
        x: 480,
        y: 482,
        size: 12,
        font: pdfIconsFont,
        color: rgb(0, 0, 0),
      });
    } else if (formData.category === "BR-B1") {
      // Business Room - B-1
      firstPage.drawText(tick, {
        x: 480,
        y: 462,
        size: 12,
        font: pdfIconsFont,
        color: rgb(0, 0, 0),
      });
    } else if (formData.category === "BR-B2") {
      // Business Room - B-2
      firstPage.drawText(tick, {
        x: 480,
        y: 445,
        size: 12,
        font: pdfIconsFont,
        color: rgb(0, 0, 0),
      });
    }
    
    // In the PDF form, there's a section "(c) Boarding/Lodging charges will be paid by the Guest or not: ___"
    // Handle both direct source and payment.source structure
    const source = formData.payment?.source || formData.source;
    if (source === "GUEST") {
      firstPage.drawText("YES", {
        x: 385,
        y: 339,
        size: 12,
        font: ubuntuFont,
        color: rgb(0, 0, 0),
      });
    } else {
      firstPage.drawText("NO", {
        x: 385,
        y: 339,
        size: 12,
        font: ubuntuFont,
        color: rgb(0, 0, 0),
      });
    }
    
    // Source Name - handle both direct sourceName and payment.sourceName
    const sourceName = formData.payment?.sourceName || formData.sourceName;
    if (source !== "GUEST" && sourceName) {
      firstPage.drawText(ensureString(sourceName), {
        x: 400,
        y: 325,
        size: 12,
        font: ubuntuFont,
        color: rgb(0, 0, 0),
      });
    }
    
    // Admin annotations - only if they exist
    if (formData.adminAnnotation) {
      // 1. Approval from competent authority
      if (formData.adminAnnotation.approvalAttached) {
        firstPage.drawText(ensureString(formData.adminAnnotation.approvalAttached), {
          x: 450,
          y: 311,
          size: 12,
          font: ubuntuFont,
          color: rgb(0, 0, 0),
        });
      }
      
      // 2. Confirmed Room Number
      if (formData.adminAnnotation.confirmedRoomNo) {
        firstPage.drawText(ensureString(formData.adminAnnotation.confirmedRoomNo), {
          x: 70,
          y: 100,
          size: 12,
          font: ubuntuFont,
          color: rgb(0, 0, 0),
        });
      }
      
      // 3. Entry Serial No and Page No
      if (formData.adminAnnotation.entrySerialNo) {
        const CentrySerialNo = ensureString(formData.adminAnnotation.entrySerialNo) + ' and ';
        firstPage.drawText(CentrySerialNo, {
          x: 130,
          y: 100,
          size: 12,
          font: ubuntuFont,
          color: rgb(0, 0, 0),
        });
      }
      
      if (formData.adminAnnotation.entryPageNo) {
        const CentryPageNo = ensureString(formData.adminAnnotation.entryPageNo); 
        firstPage.drawText(CentryPageNo, {
          x: 180,
          y: 100,
          size: 12,
          font: ubuntuFont,
          color: rgb(0, 0, 0),
        });
      }
      
      // 4. Date of Entry
      if (formData.adminAnnotation.entryDate) {
        firstPage.drawText(formatDateIndian(formData.adminAnnotation.entryDate), {
          x: 213,
          y: 100,
          size: 12,
          font: ubuntuFont,
          color: rgb(0, 0, 0),
        });
      }
      
      // 5. Date of Booking and check-in/check-out times
      if (formData.adminAnnotation.bookingDate) {
        const formattedBookingDate = formatDateIndian(formData.adminAnnotation.bookingDate) + ' ,';
        firstPage.drawText(ensureString(formattedBookingDate), {
          x: 285,
          y: 105,
          size: 12,
          font: ubuntuFont,
          color: rgb(0, 0, 0),
        });
      }
      
      if (formData.adminAnnotation.checkInTime) {
        const timeWithComma = ensureString(formData.adminAnnotation.checkInTime) + ' ,';
        firstPage.drawText(timeWithComma, {
          x: 355,
          y: 107,
          size: 12,
          font: ubuntuFont,
          color: rgb(0, 0, 0),
        });
      }
      
      if (formData.adminAnnotation.checkOutTime) {
        firstPage.drawText(ensureString(formData.adminAnnotation.checkOutTime), {
          x: 355,
          y: 94,
          size: 12,
          font: ubuntuFont,
          color: rgb(0, 0, 0),
        });
      }
      
      // 6. Remarks
      if (formData.adminAnnotation.remarks) {
        firstPage.drawText(ensureString(formData.adminAnnotation.remarks), {
          x: 420,
          y: 105,
          size: 11,
          font: ubuntuFont,
          color: rgb(0, 0, 0),
          maxWidth: 350,
          lineHeight: 14,
        });
      }
    }
    
    // Applicant details - Name
    firstPage.drawText(ensureString(formData.applicant?.name), {
      x: 55,
      y: 215,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Applicant details - Designation
    firstPage.drawText(ensureString(formData.applicant?.designation), {
      x: 155,
      y: 215,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Applicant details - Department
    firstPage.drawText(ensureString(formData.applicant?.department), {
      x: 255,
      y: 215,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Applicant details - Code
    firstPage.drawText(ensureString(formData.applicant?.code), {
      x: 340,
      y: 215,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Applicant details - Mobile
    firstPage.drawText(ensureString(formData.applicant?.mobile), {
      x: 440,
      y: 215,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Add current date in IST format (DD-MM-YYYY) in the date column of the PDF
    const currentDate = new Date();
    const options = { timeZone: 'Asia/Kolkata' };
    const istDate = formatDateIndian(currentDate.toLocaleDateString('en-IN', options));
    
    // Add date next to applicant signature
    firstPage.drawText(istDate, {
      x: 88,
      y: 190,
      size: 12,
      font: ubuntuFont,
      color: rgb(0, 0, 0),
    });
    
    // Add applicant signature if available
    if (formData.signature) {
      if (formData.signature.type === 'image') {
        // For uploaded or drawn image signatures
        try {
          // For data URLs (base64)
          if (typeof formData.signature.data === 'string' && formData.signature.data.startsWith('data:image')) {
            // Extract base64 data
            const base64Data = formData.signature.data.split(',')[1];
            if (base64Data) {
              const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              const signatureImage = await pdfDoc.embedPng(signatureBytes);
              firstPage.drawImage(signatureImage, {
                x: 415,
                y: 173,
                width: 120,
                height: 40,
              });
            }
          } else {
            // For direct image data
            const signatureImage = await pdfDoc.embedPng(formData.signature.data);
            firstPage.drawImage(signatureImage, {
              x: 440,
              y: 185,
              width: 120,
              height: 40,
            });
          }
        } catch (error) {
          console.error("Error embedding signature image:", error);
        }
      } else if (formData.signature.type === 'text') {
        // Draw text signature in a larger size to mimic handwriting
        firstPage.drawText(ensureString(formData.signature.data), {
          x: 440,
          y: 185,
          size: 12,
          font: ubuntuFont, // Using Ubuntu font since we don't have a cursive font
          color: rgb(0, 0, 0),
        });
      }
    } 
    
    // Reviewer information on page 2 (if needed)
    if(formData.reviewers){
      formData.reviewers.forEach((reviewer, index) => {
        if (reviewer.status === "APPROVED") {
          secondPage.drawText(ensureString(reviewer.role), {
            x: 55,
            y: 600 - (index * 20),
            size: 12,
            font: ubuntuFont,
            color: rgb(0, 0, 0),
          });
        }
      });
    }

    const filledPdfBytes = await pdfDoc.save();
    return filledPdfBytes;
  } catch (error) {
    console.error("Error generating filled PDF:", error);
    throw error;
  }
};

export const updateFilledPDF = async (formData) => {
  try {
    // Check for required form fields
    if (!formData || !formData.guestName || !formData.arrivalDate || !formData.departureDate) {
      console.error("Missing required form data for PDF generation");
      return null;
    }

    // Ensure applicant data exists
    if (!formData.applicant || !formData.applicant.name) {
      console.error("Missing applicant data for PDF generation");
      return null;
    }

    // Load existing PDF bytes with proper error handling
    const filledPdfBytes = await generateFilledPDF(formData);
    
    // Create and return the blob
    const blob = new Blob([filledPdfBytes], { type: "application/pdf" });
    return blob;
  } catch (error) {
    console.error("Error updating filled PDF:", error);
    // Return null to indicate failure
    return null;
  }
};
