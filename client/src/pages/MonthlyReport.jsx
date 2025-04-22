import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { privateRequest } from "../utils/useFetch";
import {toast} from "react-toastify";

const MonthlyReport = () => {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // Default to current month (YYYY-MM)
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({}); // Track expanded category states
  const [showAllPending, setShowAllPending] = useState(false); // Track state of "View All Pending Payments"

  const user = useSelector((state) => state.user);
  const http = privateRequest(user.accessToken, user.refreshToken);

  useEffect(() => {
    fetchReport();
  }, [month]);

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await http.get(`/reservation/reports/monthly/${month}`);
      setReportData(response.data);
    } catch (err) {
      console.error("Error fetching report:", err);
      setError("Failed to fetch monthly report.");
    }
    setLoading(false);
  };

  // Toggle pending payments table for a specific category
  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleSendReminder = async (reservationId) => {
    try {
      const response = await http.post("/reservation/send-reminder", {reservationId});
      if (response.status === 200) {
        toast.success("Reminder sent successfully!");
      } else {
        throw new Error(response.data?.message || "Failed to send reminder");
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };
  const handleSendReminderToAll = async (pendingPaymentsDetails) => {
    try {
      const response = await http.post("/reservation/send-reminder-all", {pendingPaymentsDetails});
      if (response.status === 200) {
        toast.success("Reminder sent successfully!");
      } else {
        throw new Error(response.data?.message || "Failed to send reminder");
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Monthly Report</h2>

      <div className="mb-4">
        <label className="mr-2 font-semibold">Select Month:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border p-2 rounded-md"
        />
      </div>

      {loading ? (
        <p>Loading report...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : reportData ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 mb-6">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2">Month</th>
                <th className="border px-4 py-2">Total Bookings</th>
                <th className="border px-4 py-2">Total Revenue</th>
                <th className="border px-4 py-2">Total Checked Out</th>
                <th className="border px-4 py-2">Pending Payments</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-100">
                <td className="border px-4 py-2">{reportData.month}</td>
                <td className="border px-4 py-2">{reportData.totalBookings}</td>
                <td className="border px-4 py-2">Rs {reportData.revenue}</td>
                <td className="border px-4 py-2">{reportData.checkedOut}</td>
                <td className="border px-4 py-2">{reportData.pendingPayments}</td>
              </tr>
            </tbody>
          </table>

          {/* View All Pending Payments Button */}
          <button
            onClick={() => setShowAllPending(!showAllPending)}
            className="bg-red-500 text-white px-4 py-2 mb-4 rounded-md hover:bg-red-700"
          >
            {showAllPending ? "Hide All Pending Payments" : "View All Pending Payments"}
          </button>

          {showAllPending && (
            <div className="p-4 border border-gray-300 bg-gray-100 rounded-md mb-6">
              <h4 className="font-semibold mb-2">All Pending Payments</h4>
              <td className="border px-4 py-2">
                <button
                  onClick={() => handleSendReminderToAll(reportData.pendingPaymentsDetails)}
                  className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-700"
                >
                  Send Reminder To All
                </button>
              </td>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border px-4 py-2">Category</th>
                    <th className="border px-4 py-2">Guest Name</th>
                    <th className="border px-4 py-2">Email</th>
                    <th className="border px-4 py-2">Applicant Name</th>
                    <th className="border px-4 py-2">Amount</th>
                    <th className="border px-4 py-2">Payment Mode</th>
                    <th className="border px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.pendingPaymentsDetails?.length > 0 ? (
                    reportData.pendingPaymentsDetails.map((payment, idx) => (
                      <tr key={idx} className="hover:bg-gray-100">
                        <td className="border px-4 py-2">{payment.category}</td>
                        <td className="border px-4 py-2">{payment.guestName}</td>
                        <td className="border px-4 py-2">{payment.applicantEmail}</td>
                        <td className="border px-4 py-2">{payment.applicantName}</td>
                        <td className="border px-4 py-2">Rs {payment.paymentAmount}</td>
                        <td className="border px-4 py-2">{payment.paymentMode}</td>
                        <td className="border px-4 py-2">
                      <button
                        onClick={() => handleSendReminder(payment.reservationId)}
                        className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-700"
                      >
                        Send Reminder
                      </button>
                    </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="border px-4 py-2 text-center">
                        No pending payments available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="text-xl font-bold mb-2">Category-wise Breakdown</h3>
          <table className="w-full border-collapse border border-gray-300 mb-6">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-4 py-2">Category</th>
                <th className="border px-4 py-2">Total Bookings</th>
                <th className="border px-4 py-2">Revenue</th>
                <th className="border px-4 py-2">Checked Out</th>
                <th className="border px-4 py-2">Pending Payments</th>
                <th className="border px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {reportData.categories.map((category, index) => (
                <React.Fragment key={index}>
                  <tr className="hover:bg-gray-100">
                    <td className="border px-4 py-2">{category.name}</td>
                    <td className="border px-4 py-2">{category.totalBookings}</td>
                    <td className="border px-4 py-2">Rs {category.revenue}</td>
                    <td className="border px-4 py-2">{category.checkedOut}</td>
                    <td className="border px-4 py-2">{category.pendingPayments}</td>
                    <td className="border px-4 py-2">
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className="bg-red-500 text-white px-4 py-1 rounded-md hover:bg-red-700"
                      >
                        {expandedCategories[category.name] ? "Hide Details" : "View Details"}
                      </button>
                    </td>
                  </tr>

                  {expandedCategories[category.name] && (
                    <tr>
                      <td colSpan="6">
                      <div className="p-4 border border-gray-300 bg-gray-50 rounded-md shadow-md">
                        <h4 className="font-semibold text-lg text-blue-600">Pending Payments for {category.name}</h4>
                        <td className="border px-4 py-2">
                          <button
                            onClick={() => handleSendReminderToAll(category.pendingPaymentsDetails)}
                            className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-700"
                          >
                            Send Reminder To All
                          </button>
                        </td>
                        <table className="w-full border-collapse border border-gray-300 mt-2">
                        <thead>
                              <tr className="bg-gray-200">
                                <th className="border px-4 py-2">Guest Name</th>
                                <th className="border px-4 py-2">Email</th>
                                <th className="border px-4 py-2">Applicant Name</th>
                                <th className="border px-4 py-2">Amount</th>
                                <th className="border px-4 py-2">Payment Mode</th>
                                <th className="border px-4 py-2">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.pendingPaymentsDetails &&
                              category.pendingPaymentsDetails.length > 0 ? (
                                category.pendingPaymentsDetails.map((payment, idx) => (
                                  <tr key={idx} className="hover:bg-gray-100">
                                    <td className="border px-4 py-2">{payment.guestName}</td>
                                    <td className="border px-4 py-2">{payment.applicantEmail}</td>
                                    <td className="border px-4 py-2">{payment.applicantName}</td>
                                    <td className="border px-4 py-2">Rs {payment.paymentAmount}</td>
                                    <td className="border px-4 py-2">{payment.paymentMode}</td>
                                    <td className="border px-4 py-2">
                                      <button
                                        onClick={() => handleSendReminder(payment.reservationId)}
                                        className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-700"
                                      >
                                        Send Reminder
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="5" className="border px-4 py-2 text-center">
                                    No pending payments in this category.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No data available for this month.</p>
      )}
    </div>
  );
};

export default MonthlyReport;