import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom'; // Added for dropdown portal
import './CustomersPage.css'; // Assuming this imports shared styles like ReportsPage.css
import { useConfig } from "./ConfigProvider";
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler // <-- IMPORTANT: Added Filler plugin for gradients
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler // <-- Register Filler plugin
);

// --- Helper for fading gradient (Goal 2) ---
/**
 * Converts an 'rgb(r, g, b)' string to 'rgba(r, g, b, a)'
 * @param {string} rgb - The 'rgb(r, g, b)' color string
 * @param {number} alpha - The opacity value (0 to 1)
 * @returns {string} - The 'rgba(r, g, b, a)' color string
 */
const rgbToRgba = (rgb, alpha) => {
    if (!rgb || !rgb.startsWith('rgb(')) {
        return `rgba(0, 0, 0, ${alpha})`; // Fallback
    }
    return rgb.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
};


const AnalyticsPage = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [chartType, setChartType] = useState('Line Chart'); // Changed to match options
    const [data, setData] = useState({});
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";
    const token = localStorage.getItem("jwt_token");

    // --- State & Refs for Dropdowns (Goal 1) ---
    const [selectedMetric, setSelectedMetric] = useState('Everything'); // Changed to match options
    const [showMetricMenu, setShowMetricMenu] = useState(false);
    const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 220 });
    const metricBtnRef = useRef(null);
    const chartTypeBtnRef = useRef(null);

    const colors = {
        sales: 'rgb(75, 192, 192)',
        stocks: 'rgb(255, 99, 132)',
        taxes: 'rgb(255, 206, 86)',
        customers: 'rgb(54, 162, 235)',
        profits: 'rgb(153, 102, 255)',
        onlinePayments: 'rgb(255, 159, 64)'
    };

    // --- Dropdown Options (Goal 1) ---
    // Using a generic icon, update as needed
    const METRIC_OPTIONS = {
        'Everything': { icon: "fa-solid fa-grip" },
        'Sales': { icon: "fa-duotone fa-solid fa-chart-mixed" },
        'Stocks': { icon: "fa-duotone fa-solid fa-box" },
        'Taxes': { icon: "fa-solid fa-landmark" },
        'Customers': { icon: "fa-duotone fa-solid fa-users" },
        'Profits': { icon: "fa-solid fa-sack-dollar" },
        'Online Payments': { icon: "fa-duotone fa-solid fa-credit-card" }
    };

    const CHART_TYPE_OPTIONS = {
        'Line Chart': { icon: 'fa-solid fa-chart-line' },
        'Bar Chart': { icon: 'fa-solid fa-chart-bar' }
    };

    // Arrays of keys for mapping
    const metricKeys = Object.keys(METRIC_OPTIONS);
    const chartTypeKeys = Object.keys(CHART_TYPE_OPTIONS);


    useEffect(() => {
        const today = new Date();
        const end = today;
        const start = new Date(today);
        start.setMonth(start.getMonth() - 5);

        const formatDate = (date) => date.toISOString().split('T')[0];
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            if (!validateDateRange(startDate, endDate)) return;
            fetchAnalyticsData();
        }
    }, [startDate, endDate]); // Will re-fetch on date change

    const validateDateRange = (start, end) => {
        const startDt = new Date(start);
        const endDt = new Date(end);
        const diffMonths = (endDt.getFullYear() - startDt.getFullYear()) * 12 + (endDt.getMonth() - startDt.getMonth());
        if (diffMonths > 12) {
            alert("Date range cannot exceed 12 months.");
            return false;
        }
        return true;
    };

    const fetchAnalyticsData = async () => {
        // Convert 'Everything' to 'everything' for the API
        const apiMetric = selectedMetric === 'Everything' ? 'everything' : selectedMetric.toLowerCase();
        const payload = { startDate, endDate, metric: apiMetric };

        try {
            const response = await fetch(`${apiUrl}/api/shop/get/analytics`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Error fetching analytics data:", error);
        }
    };

    // --- Chart.js Data object (Goal 2) ---
    const chartData = (label, values) => ({
        labels: data.labels || [],
        datasets: [
            {
                label: label,
                data: values,
                borderColor: colors[label] || 'rgb(0,0,0)',
                tension: 0.3,
                fill: true, // Needs to be true for gradient
                // --- Fading Gradient Logic (Goal 2) ---
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const chartArea = context.chart.chartArea;

                    if (!chartArea) {
                        // Return null or undefined if chartArea is not available
                        return null;
                    }

                    const baseColor = colors[label] || 'rgb(0,0,0)';
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);

                    // Use helper to create RGBA strings
                    gradient.addColorStop(0, rgbToRgba(baseColor, 0.6)); // Start with 60% opacity
                    gradient.addColorStop(1, rgbToRgba(baseColor, 0));   // Fade to 0% opacity

                    return gradient;
                },
            }
        ]
    });

    // Renamed to match new state
    const metricsForCharts = ['sales', 'stocks', 'taxes', 'customers', 'profits', 'onlinePayments'];

    const renderChartComponent = (chartProps) =>
        chartType === 'Line Chart' ? <Line {...chartProps} /> : <Bar {...chartProps} />;

    const renderCharts = () => {
        // Use state variable
        if (selectedMetric === 'Everything') {
            return (
                <div
                    className="customer-grid"
                    style={{
                        marginTop: '20px',
                        display: 'grid',
                        gridTemplateColumns: '1fr', // single column for mobile
                        gap: '15px',
                        justifyItems: 'stretch'
                    }}
                >
                    {metricsForCharts.map(metric => (
                        <div className="glass-card" key={metric} style={{ width: '100%', padding: '10px' }}>
                            <h3 style={{ textTransform: 'capitalize', textAlign: 'center', fontSize: '1rem' }}>
                                {metric === 'onlinePayments' ? 'Online Payment Count' : metric}
                            </h3>
                            {renderChartComponent({ data: chartData(metric, data[metric] || []) })}
                        </div>
                    ))}
                </div>
            );
        } else {
            // Convert state 'Sales' to API 'sales'
            const metricKey = selectedMetric.toLowerCase();
            return (
                <div className="glass-card" style={{ width: '100%', maxWidth: '100%', margin: '20px auto', padding: '10px' }}>
                    <h3 style={{ textTransform: 'capitalize', textAlign: 'center', fontSize: '1rem' }}>
                        {selectedMetric === 'Online Payments' ? 'Online Payment Count' : selectedMetric}
                    </h3>
                    {renderChartComponent({ data: chartData(metricKey, data[metricKey] || []) })}
                </div>
            );
        }
    };

    // --- Dropdown Open Functions (Goal 1) ---
    const openMetricMenu = () => {
        if (!metricBtnRef.current) return;
        const rect = metricBtnRef.current.getBoundingClientRect();
        setMenuPos({
            top: rect.bottom + window.scrollY + 6,
            left: rect.left + window.scrollX,
            width: Math.max(220, rect.width),
        });
        setShowChartTypeMenu(false); // Close other menu
        setShowMetricMenu(true);
    };

    const openChartTypeMenu = () => {
        if (!chartTypeBtnRef.current) return;
        const rect = chartTypeBtnRef.current.getBoundingClientRect();
        setMenuPos({
            top: rect.bottom + window.scrollY + 6,
            left: rect.left + window.scrollX,
            width: Math.max(220, rect.width),
        });
        setShowMetricMenu(false); // Close other menu
        setShowChartTypeMenu(true);
    };

    // --- Close Dropdown Hook (Goal 1) ---
    useEffect(() => {
        if (!showMetricMenu && !showChartTypeMenu) return;

        const handleOutside = (e) => {
            // Check metric menu
            if (showMetricMenu && metricBtnRef.current && !metricBtnRef.current.contains(e.target)) {
                setShowMetricMenu(false);
            }
            // Check chart type menu
            if (showChartTypeMenu && chartTypeBtnRef.current && !chartTypeBtnRef.current.contains(e.target)) {
                setShowChartTypeMenu(false);
            }
        };

        const closeOnScrollOrResize = () => {
            setShowMetricMenu(false);
            setShowChartTypeMenu(false);
        };

        document.addEventListener('mousedown', handleOutside);
        window.addEventListener('scroll', closeOnScrollOrResize, true);
        window.addEventListener('resize', closeOnScrollOrResize);

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setShowMetricMenu(false);
                setShowChartTypeMenu(false);
            }
        };
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('mousedown', handleOutside);
            window.removeEventListener('scroll', closeOnScrollOrResize, true);
            window.removeEventListener('resize', closeOnScrollOrResize);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [showMetricMenu, showChartTypeMenu]);

    // --- Dropdown Select Handlers (Goal 1) ---
    const selectMetric = (metric) => {
        setSelectedMetric(metric);
        setShowMetricMenu(false);
    };

    const selectChartType = (type) => {
        setChartType(type);
        setShowChartTypeMenu(false);
    };

    const handleRefresh = (e) => {
        e.preventDefault(); // Prevent form submission
        if (validateDateRange(startDate, endDate)) {
            fetchAnalyticsData();
        }
    };

    return (
        <div className="page-container" style={{ padding: '8px' }}>
            <h2 style={{ fontSize: '1.2rem', textAlign: 'center' }}>Analytics Dashboard</h2>

            {/* === Filter bar (Goal 1) === */}
            <div className="glass-card report-form-container">
                <form onSubmit={handleRefresh}>
                    <div className="generate-report-grid" style={{ gridTemplateColumns: '1fr' }}> {/* Stacked 1-col layout */}

                        {/* Row 1: Date selectors */}
                        <div className="date-inputs-container">
                            <div className="form-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    style={{color: 'var(--text-color)'}}                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    style={{color: 'var(--text-color)'}}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* === Row 2: Metric and Chart Type Dropdowns (THIS IS THE CHANGE) === */}
                        <div className="date-inputs-container">

                            {/* Metric Dropdown */}
                            <div className="form-group" style={{ flex: '1 1 0' }}>
                                <label>Metric</label>
                                <div className="report-type-dropdown-wrapper">
                                    <button
                                        type="button"
                                        className="date-input report-type-button"
                                        ref={metricBtnRef}
                                        onClick={openMetricMenu}
                                    >
                                        <span className="report-icon-label">
                                            <i className={METRIC_OPTIONS[selectedMetric]?.icon}></i>
                                            {selectedMetric}
                                        </span>
                                    </button>
                                    {showMetricMenu && ReactDOM.createPortal(
                                        <ul className="glass-card report-portal-menu" style={{ ...menuPos }}>
                                            {metricKeys.map((m) => (
                                                <li key={m}>
                                                    <button type="button" className="report-option-item" onClick={() => selectMetric(m)}>
                                                        <span className="report-icon-label">
                                                            <i className={METRIC_OPTIONS[m].icon}></i>
                                                            {m}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>, document.body
                                    )}
                                </div>
                            </div>

                            {/* Chart Type Dropdown */}
                            <div className="form-group" style={{ flex: '1 1 0' }}>
                                <label>Chart Type</label>
                                <div className="report-type-dropdown-wrapper">
                                    <button
                                        type="button"
                                        className="date-input report-type-button"
                                        ref={chartTypeBtnRef}
                                        onClick={openChartTypeMenu}
                                    >
                                        <span className="report-icon-label">
                                            <i className={CHART_TYPE_OPTIONS[chartType]?.icon}></i>
                                            {chartType}
                                        </span>
                                    </button>
                                    {showChartTypeMenu && ReactDOM.createPortal(
                                        <ul className="glass-card report-portal-menu" style={{ ...menuPos }}>
                                            {chartTypeKeys.map((t) => (
                                                <li key={t}>
                                                    <button type="button" className="report-option-item" onClick={() => selectChartType(t)}>
                                                        <span className="report-icon-label">
                                                            <i className={CHART_TYPE_OPTIONS[t].icon}></i>
                                                            {t}
                                                        </span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>, document.body
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Row 3: Refresh Button */}
                        <button
                            type="submit"
                            className="btn"
                            style={{ width: '50%', padding: '8px', fontSize: '0.85rem', marginLeft: '5rem' }}
                        >
                            Refresh
                        </button>
                    </div>
                </form>
            </div>

            {renderCharts()}
        </div>
    );
};

export default AnalyticsPage;