import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./VisualizeData.css";
import toast, { Toaster } from "react-hot-toast";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Predefined field options based on Reservation model
const fieldOptions = [
  { value: "status", label: "Status" },
  { value: "category", label: "Category" },
  { value: "roomType", label: "Room Type" },
  { value: "payment.status", label: "Payment Status" },
  { value: "payment.source", label: "Payment Source" },
  { value: "checkOut", label: "Checked Out" },
  { value: "guestEmail", label: "Guest Email" },
];

// Predefined value options for each field
const valueOptions = {
  status: [
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "HOLD", label: "On Hold" },
  ],
  category: [
    { value: "ES-A", label: "Executive Suite - Category A (Free)" },
    { value: "ES-B", label: "Executive Suite - Category B (₹3500)" },
    { value: "BR-A", label: "Business Room - Category A (Free)" },
    { value: "BR-B1", label: "Business Room - Category B1 (₹2000)" },
    { value: "BR-B2", label: "Business Room - Category B2 (₹1200)" },
  ],
  roomType: [
    { value: "Single Occupancy", label: "Single Occupancy" },
    { value: "Double Occupancy", label: "Double Occupancy" },
  ],
  "payment.status": [
    { value: "PENDING", label: "Pending" },
    { value: "PAID", label: "Paid" },
  ],
  "payment.source": [
    { value: "GUEST", label: "Guest" },
    { value: "DEPARTMENT", label: "Department" },
    { value: "OTHERS", label: "Others" },
  ],
  checkOut: [
    { value: "true", label: "Yes" },
    { value: "false", label: "No" },
  ],
};

// Export field options
const exportFieldOptions = [
  { value: "id", label: "Reservation ID" },
  { value: "guestName", label: "Guest Name" },
  { value: "guestEmail", label: "Guest Email" },
  { value: "applicantEmail", label: "Applicant Email" },
  { value: "department", label: "Department" },
  { value: "roomType", label: "Room Type" },
  { value: "roomNumbers", label: "Room Numbers" },
  { value: "arrivalDate", label: "Arrival Date" },
  { value: "departureDate", label: "Departure Date" },
  { value: "status", label: "Status" },
  { value: "category", label: "Category" },
  { value: "paymentSource", label: "Payment Source" },
  { value: "paymentStatus", label: "Payment Status" },
  { value: "amount", label: "Amount" },
  { value: "createdAt", label: "Created At" }
];

// Predefined sort order options
const sortOrderOptions = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
];

// Define handleMultiSelectChange before the component that uses it
const handleMultiSelectChange = (setter, currentValues, value) => {
  // If empty value (All option) is selected, clear all selections
  if (value === "") {
    setter([]);
    return;
  }
  
  // If value is already selected, remove it
  if (currentValues.includes(value)) {
    setter(currentValues.filter(v => v !== value));
  } else {
    // Otherwise add it
    setter([...currentValues, value]);
  }
};

// MultiSelect Component
const MultiSelect = ({ options, values, onChange, placeholder, allOption = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);
  
  // Handle outside clicks to close the dropdown
  useEffect(() => {
    if (isOpen) {
      const handleOutsideClick = (e) => {
        if (!e.target.closest('.multi-select-container')) {
          closeDropdown();
        }
      };
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }
  }, [isOpen]);
  
  const handleOptionClick = (value) => {
    handleMultiSelectChange(onChange, values, value);
  };
  
  // Improved display text logic
  const getDisplayText = () => {
    if (values.length === 0) {
      return placeholder;
    } else if (values.length === 1) {
      const option = options.find(o => o.value === values[0]);
      return option ? option.label : placeholder;
    } else {
      return `${values.length} selected`;
    }
  };
    
  return (
    <div className="multi-select-container">
      <div 
        className="select-header"
        onClick={toggleDropdown}
      >
        <div>
          {getDisplayText()}
        </div>
        <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </div>
      
      {isOpen && (
        <div className="multi-select-options">
          {allOption && (
            <div 
              className={`multi-select-option all-option ${values.length === 0 ? 'selected' : ''}`}
              onClick={() => handleOptionClick("")}
            >
              <input 
                type="checkbox" 
                checked={values.length === 0}
                readOnly
              />
              <span>{placeholder}</span>
            </div>
          )}
          
          {options.map(option => (
            <div 
              key={option.value}
              className={`multi-select-option ${values.includes(option.value) ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option.value)}
            >
              <input 
                type="checkbox" 
                checked={values.includes(option.value)}
                readOnly
              />
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VisualizeData = () => {
  // State for selected options (visualization)
  const [selectedMatchFields, setSelectedMatchFields] = useState([]);
  const [selectedMatchValues, setSelectedMatchValues] = useState({});
  const [selectedGroupFields, setSelectedGroupFields] = useState([]);
  const [selectedSortFields, setSelectedSortFields] = useState([]);
  const [selectedSortOrders, setSelectedSortOrders] = useState({});
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState(null);
  const [exportMessage, setExportMessage] = useState("");
  const [exportStatus, setExportStatus] = useState(""); // 'success', 'error', or 'warning'
  const [exportTitle, setExportTitle] = useState("");

  // Advanced export options state
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportCategory, setExportCategory] = useState([]);
  const [exportRoomType, setExportRoomType] = useState([]);
  const [exportStatusFilter, setExportStatusFilter] = useState([]);
  const [exportPaymentStatus, setExportPaymentStatus] = useState([]);
  const [exportPaymentSource, setExportPaymentSource] = useState([]);
  const [selectedExportFields, setSelectedExportFields] = useState([]);

  // Select all export fields by default when component mounts
  useEffect(() => {
    selectAllExportFields();
  }, []);

  // Handle match field selection
  const handleMatchFieldSelect = (e) => {
    const field = e.target.value;
    if (!selectedMatchFields.includes(field)) {
      setSelectedMatchFields([...selectedMatchFields, field]);
      setSelectedMatchValues({
        ...selectedMatchValues,
        [field]: "",
      });
    }
  };

  // Handle match field removal
  const handleRemoveMatchField = (field) => {
    const updatedFields = selectedMatchFields.filter((f) => f !== field);
    setSelectedMatchFields(updatedFields);
    const updatedValues = { ...selectedMatchValues };
    delete updatedValues[field];
    setSelectedMatchValues(updatedValues);
  };

  // Handle match value selection
  const handleMatchValueSelect = (field, e) => {
    setSelectedMatchValues({
      ...selectedMatchValues,
      [field]: e.target.value,
    });
  };

  // Handle group field selection
  const handleGroupFieldSelect = (e) => {
    const field = e.target.value;
    if (!selectedGroupFields.includes(field)) {
      setSelectedGroupFields([...selectedGroupFields, field]);
    }
  };

  // Handle group field removal
  const handleRemoveGroupField = (field) => {
    setSelectedGroupFields(selectedGroupFields.filter((f) => f !== field));
  };

  // Handle sort field selection
  const handleSortFieldSelect = (e) => {
    const field = e.target.value;
    if (!selectedSortFields.includes(field)) {
      setSelectedSortFields([...selectedSortFields, field]);
      setSelectedSortOrders({
        ...selectedSortOrders,
        [field]: "asc",
      });
    }
  };

  // Handle sort field removal
  const handleRemoveSortField = (field) => {
    const updatedFields = selectedSortFields.filter((f) => f !== field);
    setSelectedSortFields(updatedFields);
    const updatedOrders = { ...selectedSortOrders };
    delete updatedOrders[field];
    setSelectedSortOrders(updatedOrders);
  };

  // Handle sort order selection
  const handleSortOrderSelect = (field, e) => {
    setSelectedSortOrders({
      ...selectedSortOrders,
      [field]: e.target.value,
    });
  };

  // --- Advanced Export Handlers ---
  const toggleExportOptions = () => {
    setShowExportOptions(!showExportOptions);
  };

  const handleExportFieldToggle = (field) => {
    if (selectedExportFields.includes(field)) {
      setSelectedExportFields(selectedExportFields.filter(f => f !== field));
    } else {
      setSelectedExportFields([...selectedExportFields, field]);
    }
  };

  const selectAllExportFields = () => {
    setSelectedExportFields(exportFieldOptions.map(field => field.value));
  };

  const clearExportFields = () => {
    setSelectedExportFields([]);
  };
  // --- End Advanced Export Handlers ---

  const handleVisualize = async () => {
    try {
      const params = {};
      if (selectedMatchFields.length > 0) {
        const matchCriteria = selectedMatchFields.map((field) => ({
          field,
          value: selectedMatchValues[field],
        }));
        params.matchCriteria = JSON.stringify(matchCriteria);
      }
      if (selectedGroupFields.length > 0) {
        params.groupFields = JSON.stringify(selectedGroupFields);
      }
      if (selectedSortFields.length > 0) {
        const sortCriteria = selectedSortFields.map((field) => ({
          field,
          order: selectedSortOrders[field],
        }));
        params.sortCriteria = JSON.stringify(sortCriteria);
      }

      const response = await axios.get("/reservation/aggregated-data", { params });
      const data = response.data.data;

      const labels = data.map((item) =>
        typeof item._id === "object" ? JSON.stringify(item._id) : item._id
      );
      const counts = data.map((item) => item.count);

      const newChartData = {
        labels,
        datasets: [
          {
            label: "Count",
            data: counts,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      };

      setChartData(newChartData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Error fetching aggregated data");
      setChartData(null);
    }
  };

  // Replace the existing showToast function with a completely fixed version
  const showToast = (message, type = 'success') => {
    // First completely clear all existing toasts to prevent conflicts
    toast.dismiss();
    
    // Small delay to ensure toasts are fully cleared
    setTimeout(() => {
      if (type === 'success') {
        toast.success("Data exported successfully to Google Sheets!", {
          id: 'export-success-toast',
          duration: 5000,
          icon: '✅',
          style: {
            background: '#e8f5e9',
            color: '#2e7d32',
            fontWeight: 'bold'
          }
        });
      } else if (type === 'error') {
        toast.error(message, {
          id: 'export-error-toast',
          duration: 5000,
          icon: '❌',
          style: {
            background: '#ffebee',
            color: '#c62828',
            fontWeight: 'bold'
          }
        });
      }
    }, 300);
  };

  // Function to export all data to Google Sheets
  const exportAllDataToSheets = async () => {
    // Remove any existing toast notifications first
    toast.dismiss();
    
    setIsExporting(true);
    setExportUrl(null);
    setExportMessage("");
    setExportStatus("");
    setExportTitle("");

    try {
      console.log('🔍 DEBUG - Starting export all process');
      console.log('🔍 DEBUG - Sending request to: /api/export/all');
      
      const response = await axios.get("/api/export/all", { 
        validateStatus: function (status) { return true; },
        // Add an interceptor to modify the response before it's processed by the global error handler
        headers: {
          'x-suppress-global-notification': 'true'
        }
      });
      
      // Prevent global success message by adding a flag to the response
      if (response.data && response.data.url) {
        response.data.hideMessage = true;
      }
      
      console.log('🔍 DEBUG - Export all response:', response);
      console.log('🔍 DEBUG - Response data:', response.data);
      console.log('🔍 DEBUG - Response status:', response.status);
      
      const sheetUrl = response.data?.url;
      console.log('🔍 DEBUG - Sheet URL:', sheetUrl);
      
      // If we have a URL, always treat it as success regardless of the message or status
      if (sheetUrl) {
        console.log('🔍 DEBUG - URL found, treating as success');
        // URL received - sheet was created successfully
        setExportUrl(sheetUrl);
        
        // Only set the title if it appears to be a proper sheet name (contains timestamp)
        const title = response.data?.title || "";
        if (title && !title.toLowerCase().includes('error') && title.includes('_')) {
          setExportTitle(title);
        } else {
          setExportTitle(""); // Don't display title if it looks like an error message
        }
        
        // Always set success status and message when URL is present
        setExportStatus("success");
        setExportMessage("Data exported successfully to Google Sheets!");
        
        // Show success toast and open sheet
        showToast("Data exported successfully to Google Sheets!");
        window.open(sheetUrl, '_blank');
      } else {
        console.log('🔍 DEBUG - No URL found, treating as error');
        // No URL means a definite error
        setExportStatus("error");
        setExportMessage(response.data?.message || "Failed to export data. No sheet URL returned.");
        showToast(response.data?.message || 'Export failed. No sheet URL returned.', 'error');
      }
    } catch (error) { 
      console.error('🔍 DEBUG - Caught exception during export all:', error);
      setExportStatus("error");
      setExportMessage("Network error during export. Please check your connection and try again.");
      showToast('Network error during export. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Function to export filtered data to Google Sheets using ADVANCED options
  const exportFilteredDataToSheets = async () => {
    // Remove any existing toast notifications first
    toast.dismiss();
    
    setIsExporting(true);
    setExportUrl(null);
    setExportMessage("");
    setExportStatus("");
    setExportTitle("");

    // Prepare the filtered export data using advanced state variables
    const exportData = {
      filters: {},
      dateRange: {},
      fields: selectedExportFields.length > 0 ? selectedExportFields : undefined
    };

    // Populate filters based on advanced selections
    if (exportCategory.length > 0) exportData.filters.category = exportCategory;
    if (exportRoomType.length > 0) exportData.filters.roomType = exportRoomType;
    if (exportStatusFilter.length > 0) exportData.filters.status = exportStatusFilter;
    if (exportPaymentStatus.length > 0) exportData.filters.paymentStatus = exportPaymentStatus;
    if (exportPaymentSource.length > 0) exportData.filters.paymentSource = exportPaymentSource;

    // Populate dateRange
    if (startDate) exportData.dateRange.startDate = startDate;
    if (endDate) exportData.dateRange.endDate = endDate;

    // Remove empty filter/dateRange objects if no criteria were selected
    if (Object.keys(exportData.filters).length === 0) delete exportData.filters;
    if (Object.keys(exportData.dateRange).length === 0) delete exportData.dateRange;

    // Check if at least one filter, date, or field selection exists
    if (!exportData.filters && !exportData.dateRange && !exportData.fields) {
      showToast('Please select at least one filter, date range, or specific fields for filtered export.', 'error');
      setIsExporting(false);
      return;
    }

    try {
      console.log("🔍 DEBUG - Filtered Export request data:", exportData);
      console.log('🔍 DEBUG - Sending request to: /api/export/filtered');
      
      const response = await axios.post("/api/export/filtered", exportData, { 
        validateStatus: function (status) { return true; },
        // Add an interceptor to modify the response before it's processed by the global error handler
        headers: {
          'x-suppress-global-notification': 'true'
        }
      });
      
      // Prevent global success message by adding a flag to the response
      if (response.data && response.data.url) {
        response.data.hideMessage = true;
      }
      
      console.log('🔍 DEBUG - Filtered export response:', response);
      console.log('🔍 DEBUG - Response data:', response.data);
      console.log('🔍 DEBUG - Response status:', response.status);
      
      const sheetUrl = response.data?.url;
      console.log('🔍 DEBUG - Sheet URL:', sheetUrl);
      
      // If we have a URL, always treat it as success regardless of the message or status
      if (sheetUrl) {
        console.log('🔍 DEBUG - URL found, treating as success');
        // URL received - sheet was created successfully
        setExportUrl(sheetUrl);
        
        // Only set the title if it appears to be a proper sheet name (contains timestamp)
        const title = response.data?.title || "";
        if (title && !title.toLowerCase().includes('error') && title.includes('_')) {
          setExportTitle(title);
        } else {
          setExportTitle(""); // Don't display title if it looks like an error message
        }
        
        // Always set success status and message when URL is present
        setExportStatus("success");
        setExportMessage("Filtered data exported successfully to Google Sheets!");
        
        // Show success toast and open sheet
        showToast("Filtered data exported successfully to Google Sheets!");
        window.open(sheetUrl, '_blank');
      } else {
        console.log('🔍 DEBUG - No URL found, checking status');
        // No URL - check if it's a 404 (no matching data)
        if (response.status === 404) {
          console.log('🔍 DEBUG - 404 status, no matching data');
          setExportStatus("error");
          setExportMessage("No reservations found matching your filter criteria.");
          showToast("No reservations found matching your filter criteria.", 'error');
        } else {
          console.log('🔍 DEBUG - Other error without URL, status:', response.status);
          // Other error without URL
          setExportStatus("error");
          setExportMessage(response.data?.message || "Failed to export filtered data. No sheet URL returned.");
          showToast(response.data?.message || 'Filtered export failed. No sheet URL returned.', 'error');
        }
      }
    } catch (error) {
      console.error('🔍 DEBUG - Caught exception during filtered export:', error);
      setExportStatus("error");
      setExportMessage("Network error during filtered export. Please check your connection and try again.");
      showToast('Network error during filtered export. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="visualize-container">
      <Toaster position="top-right" />
      <h2 className="visualize-header">Visualize Data</h2>

      <div className="export-section">
        <div className="export-buttons">
          <button
            className="export-btn"
            onClick={exportAllDataToSheets}
            disabled={isExporting}
          >
            {isExporting ? (
              <span>
                <div className="loading-icon"></div> Exporting...
              </span>
            ) : (
              <span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 9H15V3H9V9H5L12 16L19 9ZM5 18V20H19V18H5Z" fill="white"/>
                </svg>
                Export All Data to DEP-GS Sheet
              </span>
            )}
          </button>

          <button
            className="advanced-export-btn"
            onClick={toggleExportOptions}
            disabled={isExporting}
          >
            <span>
              {showExportOptions ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="white"/>
                  </svg>
                  Hide Advanced Export Options
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="white"/>
                  </svg>
                  Show Advanced Export Options
                </>
              )}
            </span>
          </button>
        </div>

        {showExportOptions && (
          <div className="advanced-export-options">
            <h3>Advanced Export Options</h3>

            <div className="export-filter-group">
              <h4>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11H7V13H9V11ZM13 11H11V13H13V11ZM17 11H15V13H17V11ZM19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20Z" fill="currentColor"/>
                </svg>
                Date Range Filter
              </h4>
              <div className="date-filters">
                <div className="form-control">
                  <label>Start Date (After):</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-control">
                  <label>End Date (Before):</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="export-filter-group">
              <h4>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 18H14V16H10V18ZM3 6V8H21V6H3ZM6 13H18V11H6V13Z" fill="currentColor"/>
                </svg>
                Additional Filters
              </h4>
              <div className="additional-filters">
                {/* Category Filter */}
                <div className="form-control">
                  <label>Category:</label>
                  <MultiSelect
                    options={valueOptions.category}
                    values={exportCategory}
                    onChange={setExportCategory}
                    placeholder="All Categories"
                  />
                </div>
                {/* Room Type Filter */}
                <div className="form-control">
                  <label>Room Type:</label>
                  <MultiSelect
                    options={valueOptions.roomType}
                    values={exportRoomType}
                    onChange={setExportRoomType}
                    placeholder="All Room Types"
                  />
                </div>
                {/* Status Filter */}
                <div className="form-control">
                  <label>Status:</label>
                  <MultiSelect
                    options={valueOptions.status}
                    values={exportStatusFilter}
                    onChange={setExportStatusFilter}
                    placeholder="All Statuses"
                  />
                </div>
                {/* Payment Status Filter */}
                <div className="form-control">
                  <label>Payment Status:</label>
                  <MultiSelect
                    options={valueOptions["payment.status"]}
                    values={exportPaymentStatus}
                    onChange={setExportPaymentStatus}
                    placeholder="All Payment Statuses"
                  />
                </div>
                {/* Payment Source Filter */}
                <div className="form-control">
                  <label>Payment Source:</label>
                  <MultiSelect
                    options={valueOptions["payment.source"]}
                    values={exportPaymentSource}
                    onChange={setExportPaymentSource}
                    placeholder="All Payment Sources"
                  />
                </div>
              </div>
            </div>

            <div className="export-filter-group">
              <h4>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 13H5V11H3V13ZM3 17H5V15H3V17ZM3 9H5V7H3V9ZM7 13H21V11H7V13ZM7 17H21V15H7V17ZM7 7V9H21V7H7Z" fill="currentColor"/>
                </svg>
                Select Fields to Export
              </h4>
              <div className="field-selection-controls">
                <button type="button" onClick={selectAllExportFields} className="field-control-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM17.99 9L16.58 7.58L9.99 14.17L7.41 11.6L5.99 13.01L9.99 17L17.99 9Z" fill="currentColor"/>
                  </svg>
                  Select All
                </button>
                <button type="button" onClick={clearExportFields} className="field-control-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM17 7H7V9H17V7ZM7 13H17V11H7V13ZM7 15H14V17H7V15Z" fill="currentColor"/>
                  </svg>
                  Clear All
                </button>
              </div>
              <div className="export-fields-grid">
                {exportFieldOptions.map(field => (
                  <div key={field.value} className="field-checkbox">
                    <input
                      type="checkbox"
                      id={`field-${field.value}`}
                      checked={selectedExportFields.includes(field.value)}
                      onChange={() => handleExportFieldToggle(field.value)}
                    />
                    <label htmlFor={`field-${field.value}`}>{field.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="apply-export-btn"
              onClick={exportFilteredDataToSheets}
              disabled={isExporting}
            >
              {isExporting ? (
                <span>
                  <div className="loading-icon"></div> Exporting...
                </span>
              ) : (
                <span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 9H15V3H9V9H5L12 16L19 9ZM5 18V20H19V18H5Z" fill="white"/>
                  </svg>
                  Export Filtered Data to DEP-GS Sheet
                </span>
              )}
            </button>
          </div>
        )}

        {/* Status Message Area */}
        {exportUrl && (
          <div className="export-success">
            <div className="success-icon">✓</div>
            <p className="success-message">Data exported successfully to Google Sheets!</p>
            {exportTitle && !exportTitle.toLowerCase().includes('error') && exportTitle.includes('_') && (
              <p className="sheet-name">Sheet name: {exportTitle}</p>
            )}
            <a
              href={exportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="view-export-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
                <path d="M19 19H5V5H12V3H5C3.89 3 3 3.9 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19ZM14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z" fill="white"/>
              </svg>
              View Exported Data
            </a>
            <p className="help-text">
              If you see "Access Denied", please check that you are logged into the Google account
              that has permission to access this sheet.
            </p>
          </div>
        )}

        {/* Only show error message if we don't have a URL */}
        {exportStatus === "error" && !exportUrl && (
          <div className="export-error">
            <div className="error-icon">⚠</div>
            <p className="error-message">{exportMessage}</p>
            <p className="error-help">
              <strong>Note:</strong> Please try again or contact the administrator if the problem persists.
            </p>
          </div>
        )}
      </div>

      {/* Visualization Form and Chart */}
      <div className="visualize-form">
        {/* Match Fields Section */}
        <div className="form-group">
          <label>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle', marginRight: '6px'}}>
              <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L20 21.49L21.49 20L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
            </svg>
            Match Fields:
          </label>
          <div className="dropdown-container">
            <select
              onChange={handleMatchFieldSelect}
              value=""
            >
              <option value="" disabled>Select a field to match</option>
              {fieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Display selected match fields with their value dropdowns */}
          <div className="selected-fields">
            {selectedMatchFields.map((field) => (
              <div key={field} className="selected-field">
                <span>{fieldOptions.find(o => o.value === field)?.label}</span>
                <select
                  value={selectedMatchValues[field] || ""}
                  onChange={(e) => handleMatchValueSelect(field, e)}
                >
                  <option value="" disabled>Select a value</option>
                  {valueOptions[field]?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveMatchField(field)}
                  title="Remove field"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Group Fields Section */}
        <div className="form-group">
          <label>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle', marginRight: '6px'}}>
              <path d="M10 18H14V16H10V18ZM3 6V8H21V6H3ZM6 13H18V11H6V13Z" fill="currentColor"/>
            </svg>
            Group Fields:
          </label>
          <div className="dropdown-container">
            <select
              onChange={handleGroupFieldSelect}
              value=""
            >
              <option value="" disabled>Select a field to group by</option>
              {fieldOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Display selected group fields */}
          <div className="selected-fields">
            {selectedGroupFields.map((field) => (
              <div key={field} className="selected-field">
                <span>{fieldOptions.find(o => o.value === field)?.label}</span>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveGroupField(field)}
                  title="Remove field"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sort Fields Section */}
        <div className="form-group">
          <label>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle', marginRight: '6px'}}>
              <path d="M3 18H9V16H3V18ZM3 6V8H21V6H3ZM3 13H15V11H3V13Z" fill="currentColor"/>
            </svg>
            Sort Fields:
          </label>
          <div className="dropdown-container">
            <select
              onChange={handleSortFieldSelect}
              value=""
            >
              <option value="" disabled>Select a field to sort by</option>
              {[...fieldOptions, { value: "count", label: "Count" }].map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Display selected sort fields with order dropdowns */}
          <div className="selected-fields">
            {selectedSortFields.map((field) => (
              <div key={field} className="selected-field">
                <span>{field === "count" ? "Count" : fieldOptions.find(o => o.value === field)?.label}</span>
                <select
                  value={selectedSortOrders[field] || "asc"}
                  onChange={(e) => handleSortOrderSelect(field, e)}
                >
                  {sortOrderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveSortField(field)}
                  title="Remove field"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <button className="visualize-btn" onClick={handleVisualize}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
            <path d="M9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17ZM19 19H5V5H19V19.1V19ZM19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="white"/>
          </svg>
          Generate Visualization
        </button>
      </div>

      <div className="chart-container">
        {error && <p className="error-message">{error}</p>}
        {chartData ? (
          <Bar 
            data={chartData} 
            options={{ 
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  labels: {
                    font: {
                      family: '"Segoe UI", sans-serif',
                      size: 14
                    }
                  }
                },
                title: {
                  display: true,
                  text: 'Reservation Data Visualization',
                  font: {
                    family: '"Segoe UI", sans-serif',
                    size: 16,
                    weight: 'bold'
                  },
                  padding: { bottom: 20 }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    font: {
                      family: '"Segoe UI", sans-serif'
                    }
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  ticks: {
                    font: {
                      family: '"Segoe UI", sans-serif'
                    }
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                }
              }
            }} 
          />
        ) : (
          <div className="no-chart-data">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17ZM19 19H5V5H19V19.1V19ZM19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z" fill="#cbd5e1"/>
            </svg>
            <p>No data to display. Please select criteria and click "Generate Visualization".</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizeData;
