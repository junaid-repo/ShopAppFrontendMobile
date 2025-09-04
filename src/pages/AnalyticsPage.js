import React, { useState, useEffect } from 'react';
import './CustomersPage.css';
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
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const AnalyticsPage = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedMetric, setSelectedMetric] = useState('everything');
    const [chartType, setChartType] = useState('line');
    const [data, setData] = useState({});
    const config = useConfig();
    const apiUrl = config ? config.API_URL : "";
    const token = localStorage.getItem("jwt_token");

    const colors = {
        sales: 'rgb(75, 192, 192)',
        stocks: 'rgb(255, 99, 132)',
        taxes: 'rgb(255, 206, 86)',
        customers: 'rgb(54, 162, 235)',
        profits: 'rgb(153, 102, 255)',
        onlinePayments: 'rgb(255, 159, 64)'
    };

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
    }, [startDate, endDate]);

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
        const payload = { startDate, endDate, metric: selectedMetric };

        try {
            const response = await fetch(`${apiUrl}/api/shop/get/analytics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',"Authorization": `Bearer ${token}`, },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Error fetching analytics data:", error);
        }
    };

    const chartData = (label, values) => ({
        labels: data.labels || [],
        datasets: [
            {
                label: label,
                data: values,
                borderColor: colors[label] || 'rgb(0,0,0)',
                backgroundColor: colors[label] || 'rgb(0,0,0)',
                tension: 0.3,
                fill: chartType === 'line',
            }
        ]
    });

    const metrics = ['sales', 'stocks', 'taxes', 'customers', 'profits', 'onlinePayments'];

    const renderChartComponent = (chartProps) =>
        chartType === 'line' ? <Line {...chartProps} /> : <Bar {...chartProps} />;

    const renderCharts = () => {
        if (selectedMetric === 'everything') {
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
                    {metrics.map(metric => (
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
            return (
                <div className="glass-card" style={{ width: '100%', maxWidth: '100%', margin: '20px auto', padding: '10px' }}>
                    <h3 style={{ textTransform: 'capitalize', textAlign: 'center', fontSize: '1rem' }}>
                        {selectedMetric === 'onlinePayments' ? 'Online Payment Count' : selectedMetric}
                    </h3>
                    {renderChartComponent({ data: chartData(selectedMetric, data[selectedMetric] || []) })}
                </div>
            );
        }
    };

    return (
        <div className="page-container" style={{ padding: '8px' }}>
            <h2 style={{ fontSize: '1.2rem', textAlign: 'center' }}>Analytics Dashboard</h2>

            {/* Filter bar */}
            <div
                className="filter-bar glass-card"
                style={{
                    display: 'flex',
                    flexDirection: 'column', // stack vertically on mobile
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px',
                    marginBottom: '15px'
                }}
            >
                <label style={{ width: '100%' }}>
                    Start Date:
                    <input type="date" value={startDate}
                           onChange={(e) => setStartDate(e.target.value)}
                           style={{ width: '100%', marginTop: '4px', padding: '6px', fontSize: '0.85rem' }}
                    />
                </label>
                <label style={{ width: '100%' }}>
                    End Date:
                    <input type="date" value={endDate}
                           onChange={(e) => setEndDate(e.target.value)}
                           style={{ width: '100%', marginTop: '4px', padding: '6px', fontSize: '0.85rem' }}
                    />
                </label>
                <select
                    className="time-range-selector glass-card"
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                >
                    <option value="everything">Everything</option>
                    {metrics.map(m => (
                        <option key={m} value={m}>
                            {m === 'onlinePayments' ? 'Online Payment Count' : m.charAt(0).toUpperCase() + m.slice(1)}
                        </option>
                    ))}
                </select>

                <select
                    className="time-range-selector glass-card"
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    style={{ width: '100%', padding: '6px', fontSize: '0.85rem' }}
                >
                    <option value="line">Line Chart</option>
                    <option value="bar">Bar Chart</option>
                </select>

                <button
                    className="btn"
                    style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                    onClick={() => {
                        if (validateDateRange(startDate, endDate)) {
                            fetchAnalyticsData();
                        }
                    }}
                >
                    Refresh
                </button>
            </div>

            {renderCharts()}
        </div>
    );
};

export default AnalyticsPage;
