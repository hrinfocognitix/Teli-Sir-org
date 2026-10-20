// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients and only the configured browser origins.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

const schemaOptions = { versionKey: false };
const clientSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  name: String, phone: String, email: String, panGst: String, pangst: String,
  serviceType: String, service: String,
  dueDate: String, amount: { type: Number, default: 0 }, paymentStatus: String,
  notes: String, sentLogs: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, schemaOptions);
const fssaiSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  firmName: String, address: String, emailId: String, emailPassword: String,
  oldFssaiUserId: String, licenseNoUserId: String, password: String, mobNo: String,
  issueDate: String, validUpto: String, renewalDate: String, village: String,
  taluka: String, district: String, addedDate: String
}, schemaOptions);
const whatsappLogSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true, index: true },
  clientId: Number, clientName: String, phone: String, serviceType: String,
  stageLabel: String, timestamp: String
}, schemaOptions);

const Client = mongoose.model('Client', clientSchema);
const FssaiRecord = mongoose.model('FssaiRecord', fssaiSchema);
const WhatsappLog = mongoose.model('WhatsappLog', whatsappLogSchema);

function getWhatsAppRecipient(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

function buildDueReminderMessage(client) {
  const service = client.service || client.serviceType || 'service';
  return `Dear ${client.name}, your ${service} due date is approaching on ${client.dueDate}. Please contact Maruti Teli & Associates to complete the required process.\n\nप्रिय ${client.name}, आपल्या ${service} ची अंतिम तारीख ${client.dueDate} रोजी आहे. कृपया आवश्यक प्रक्रिया पूर्ण करण्यासाठी Maruti Teli & Associates यांच्याशी संपर्क साधा.`;
}

async function sendWhatsAppTextMessage(to, body) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    const error = new Error('WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.');
    error.status = 503;
    throw error;
  }

  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v22.0';
  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: false, body }
    })
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'WhatsApp Cloud API rejected the message.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

// ================= AUTHENTICATION =================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'marutiteli' && password === 'admin123') {
    return res.json({
      success: true,
      user: { name: 'Maruti Teli', role: 'Owner / Senior Consultant' },
      token: 'demo-jwt-token-maruti-teli'
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// ================= CLIENT MANAGEMENT APIs =================
app.get('/api/clients', async (req, res, next) => {
  try {
    const clients = await Client.find().sort({ id: 1 }).lean();
    res.json({ success: true, count: clients.length, data: clients });
  } catch (error) { next(error); }
});

app.post('/api/clients', async (req, res, next) => {
  try {
    const newClient = await Client.create({
      id: req.body.id || Date.now(), // Auto-generate if missing from frontend
      ...req.body,
      amount: parseFloat(req.body.amount || 0),
      sentLogs: []
    });
    res.status(201).json({ success: true, message: 'Client added successfully', data: newClient.toObject() });
  } catch (error) { next(error); }
});

app.put('/api/clients/:id', async (req, res, next) => {
  try {
  const clientId = parseInt(req.params.id);
  const client = await Client.findOneAndUpdate({ id: clientId }, req.body, { new: true, runValidators: true }).lean();
  if (client) {
    return res.json({ success: true, message: 'Client updated', data: client });
  }
  res.status(404).json({ success: false, message: 'Client not found' });
  } catch (error) { next(error); }
});

app.delete('/api/clients/:id', async (req, res, next) => {
  try {
  const clientId = parseInt(req.params.id);
  const client = await Client.findOneAndDelete({ id: clientId });
  if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
  res.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) { next(error); }
});

// ================= FSSAI LICENSE APIs =================
app.get('/api/fssai', async (req, res, next) => {
  try {
    const fssaiRecords = await FssaiRecord.find().sort({ addedDate: -1, id: -1 }).lean();
    res.json({ success: true, count: fssaiRecords.length, data: fssaiRecords });
  } catch (error) { next(error); }
});

app.post('/api/fssai', async (req, res, next) => {
  try {
  const newRecord = await FssaiRecord.create({
    id: Date.now(),
    addedDate: new Date().toISOString().split('T')[0],
    ...req.body
  });
  res.status(201).json({ success: true, message: 'FSSAI License record saved', data: newRecord.toObject() });
  } catch (error) { next(error); }
});

app.put('/api/fssai/:id', async (req, res, next) => {
  try {
  const id = parseInt(req.params.id);
  const record = await FssaiRecord.findOneAndUpdate({ id }, req.body, { new: true, runValidators: true }).lean();
  if (record) {
    return res.json({ success: true, message: 'FSSAI Record updated', data: record });
  }
  res.status(404).json({ success: false, message: 'Record not found' });
  } catch (error) { next(error); }
});

app.delete('/api/fssai/:id', async (req, res, next) => {
  try {
  const id = parseInt(req.params.id);
  const record = await FssaiRecord.findOneAndDelete({ id });
  if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
  res.json({ success: true, message: 'FSSAI Record deleted' });
  } catch (error) { next(error); }
});

// ================= WHATSAPP & LOGS =================
app.post('/api/whatsapp/log', async (req, res, next) => {
  try {
  const { clientId, clientName, phone, serviceType, stageLabel } = req.body;
  const logEntry = await WhatsappLog.create({
    id: Date.now(),
    clientId,
    clientName,
    phone,
    serviceType,
    stageLabel,
    timestamp: new Date().toISOString()
  });
  res.json({ success: true, log: logEntry.toObject() });
  } catch (error) { next(error); }
});

app.post('/api/whatsapp/send-reminder', async (req, res, next) => {
  try {
    const client = await Client.findOne({ id: Number(req.body.clientId) }).lean();
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const recipient = getWhatsAppRecipient(client.phone);
    if (recipient.length < 10) {
      return res.status(400).json({ success: false, message: 'Client phone number is not valid for WhatsApp.' });
    }

    const whatsappResponse = await sendWhatsAppTextMessage(recipient, buildDueReminderMessage(client));
    const log = await WhatsappLog.create({
      id: Date.now(), clientId: client.id, clientName: client.name, phone: recipient,
      serviceType: client.service || client.serviceType, stageLabel: 'Due date reminder sent',
      timestamp: new Date().toISOString()
    });
    res.json({ success: true, message: 'WhatsApp reminder sent successfully.', log: log.toObject(), whatsappResponse });
  } catch (error) { next(error); }
});

app.get('/api/whatsapp/logs', async (req, res, next) => {
  try {
    const logs = await WhatsappLog.find().sort({ timestamp: -1 }).lean();
    res.json({ success: true, logs });
  } catch (error) { next(error); }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ success: false, message: error.message || 'Server operation failed' });
});

// Start Server
async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required. Add it to server/.env before starting the server.');
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  app.listen(PORT, () => {
    console.log(`Maruti Teli Backend Server Running on http://localhost:${PORT}`);
  });
}

startServer().catch(error => {
  console.error('Unable to start server:', error.message);
  process.exit(1);
});
