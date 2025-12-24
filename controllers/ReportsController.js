const History = require('../models/History');
const Branch = require('../models/Branch');
const Sensor = require('../models/Sensor');
const User = require('../models/Users');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

// Get all branches for reports filter
const getReportBranches = async (req, res) => {
    try {
        const branches = await Branch.findAll({
            attributes: ['id', 'name', 'city']
        });
        res.json(branches);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error fetching branches' });
    }
};

// Helper function to calculate date range based on report type
const getDateRange = (type, date) => {
    let startDate, endDate;
    const now = date ? new Date(date) : new Date();

    switch (type) {
        case 'daily':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            break;
        case 'weekly':
            const dayOfWeek = now.getDay();
            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
            endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
            endDate.setHours(23, 59, 59);
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            endDate = new Date();
    }

    return { startDate, endDate };
};

// Get report summary statistics
const getReportSummary = async (req, res) => {
    try {
        const { type, date, branch_id } = req.query;
        const { startDate, endDate } = getDateRange(type, date);

        const whereClause = {
            date: {
                [Op.between]: [startDate, endDate]
            }
        };

        if (branch_id) {
            whereClause.branch_id = branch_id;
        }

        // Get total detections
        const totalDetections = await History.count({ where: whereClause });

        // Get emergency events
        const emergencyEvents = await History.count({
            where: {
                ...whereClause,
                isEmergency: true
            }
        });

        // Get sensor stats
        const sensorWhereClause = branch_id ? { branch_id } : {};
        const totalSensors = await Sensor.count({ where: sensorWhereClause });
        const activeSensors = await Sensor.count({
            where: {
                ...sensorWhereClause,
                isOn: true
            }
        });

        const systemUptime = totalSensors > 0
            ? Math.round((activeSensors / totalSensors) * 100)
            : 100;

        // Calculate average response time (in minutes)
        // Response time = updatedAt - createdAt for resolved reports (status = 0)
        const resolvedHistories = await History.findAll({
            where: {
                ...whereClause,
                status: 0, // Only resolved/completed reports
                updatedAt: { [Op.ne]: null }
            },
            attributes: ['createdAt', 'updatedAt']
        });

        let avgResponseTime = 0;
        if (resolvedHistories.length > 0) {
            let totalResponseTimeMinutes = 0;
            resolvedHistories.forEach(history => {
                const alertTime = new Date(history.createdAt).getTime();
                const reportTime = new Date(history.updatedAt).getTime();
                const responseTimeMs = reportTime - alertTime;
                const responseTimeMinutes = responseTimeMs / (1000 * 60); // Convert to minutes
                totalResponseTimeMinutes += responseTimeMinutes;
            });
            avgResponseTime = Math.round(totalResponseTimeMinutes / resolvedHistories.length);
        }

        res.json({
            totalDetections,
            emergencyEvents,
            avgResponseTime,
            systemUptime,
            activeSensors,
            totalSensors,
            period: {
                startDate,
                endDate
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error fetching report summary' });
    }
};

// Get report preview data
const getReportPreview = async (req, res) => {
    try {
        const { type, date, branch_id } = req.query;
        const { startDate, endDate } = getDateRange(type, date);

        const whereClause = {
            date: {
                [Op.between]: [startDate, endDate]
            }
        };

        if (branch_id) {
            whereClause.branch_id = branch_id;
        }

        const histories = await History.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['name']
                },
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['name', 'city']
                },
                {
                    model: Sensor,
                    as: 'sensor',
                    attributes: ['code']
                }
            ],
            order: [['date', 'DESC']],
            limit: 50
        });

        const preview = histories.map(h => ({
            id: h.id,
            date: h.date,
            createdAt: h.createdAt,
            updatedAt: h.updatedAt,
            branch: h.branch ? `${h.branch.name} - ${h.branch.city}` : 'N/A',
            sensorCode: h.sensor ? h.sensor.code : 'N/A',
            security: h.user ? h.user.name : 'N/A',
            isEmergency: h.isEmergency,
            status: h.status
        }));

        res.json(preview);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error fetching report preview' });
    }
};

// Download Excel report
const downloadReport = async (req, res) => {
    try {
        const { type, date, branch_id } = req.query;
        const { startDate, endDate } = getDateRange(type, date);

        const whereClause = {
            date: {
                [Op.between]: [startDate, endDate]
            }
        };

        if (branch_id) {
            whereClause.branch_id = branch_id;
        }

        const histories = await History.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['name']
                },
                {
                    model: Branch,
                    as: 'branch',
                    attributes: ['name', 'city']
                },
                {
                    model: Sensor,
                    as: 'sensor',
                    attributes: ['code']
                }
            ],
            order: [['date', 'DESC']]
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Security Report');

        // Add headers
        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Alert Time', key: 'alertTime', width: 10 },
            { header: 'Report Time', key: 'reportTime', width: 10 },
            { header: 'Branch', key: 'branch', width: 25 },
            { header: 'Sensor', key: 'sensor', width: 15 },
            { header: 'Security', key: 'security', width: 20 },
            { header: 'Emergency', key: 'emergency', width: 12 },
            { header: 'Status', key: 'status', width: 18 },
            { header: 'Description', key: 'description', width: 30 }
        ];

        // Add data rows
        histories.forEach(h => {
            const dateObj = new Date(h.date);
            const createdAtObj = new Date(h.createdAt);
            const updatedAtObj = new Date(h.updatedAt);
            worksheet.addRow({
                date: dateObj.toLocaleDateString('id-ID'),
                alertTime: createdAtObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                reportTime: updatedAtObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                branch: h.branch ? `${h.branch.name} - ${h.branch.city}` : 'N/A',
                sensor: h.sensor ? h.sensor.code : 'N/A',
                security: h.user ? h.user.name : 'N/A',
                emergency: h.isEmergency ? 'Emergency' : 'Normal',
                status: h.status === 1 ? 'Notifikasi Terkirim' : 'Selesai',
                description: h.description || ''
            });
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E4DB7' }
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // Set response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=security_report_${type}_${new Date().toISOString().split('T')[0]}.xlsx`
        );

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error generating report' });
    }
};

// Send report via email (placeholder - needs SMTP configuration)
const sendReportEmail = async (req, res) => {
    try {
        // Note: This requires nodemailer and SMTP configuration
        // For now, returning a success message
        res.json({
            message: 'Email feature requires SMTP configuration',
            note: 'Configure nodemailer with your SMTP settings in .env file'
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error sending email' });
    }
};

module.exports = {
    getReportBranches,
    getReportSummary,
    getReportPreview,
    downloadReport,
    sendReportEmail
};
