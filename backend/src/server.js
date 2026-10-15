import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const app = express();
const port = Number(process.env.PORT || 8080);
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(x => x.trim()).filter(Boolean);
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  ...(process.env.DB_SSL === 'true' ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {})
});
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('Origin is not allowed by CORS.')); }, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

const publicUser = u => ({ id: Number(u.id), name: u.name, email: u.email, role: u.role });
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const cleanString = (v, max = 255) => String(v ?? '').trim().slice(0, max);

async function auth(req, res, next) {
  try {
    const raw = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i)?.[1];
    if (!raw) return res.status(401).json({ error: 'Please sign in to continue.' });
    const [rows] = await pool.execute(`SELECT u.id,u.name,u.email,u.role FROM api_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at > UTC_TIMESTAMP() LIMIT 1`, [hashToken(raw)]);
    if (!rows.length) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    req.user = publicUser(rows[0]);
    next();
  } catch (e) { next(e); }
}
const adminOnly = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Administrator permission is required for this action.' });
app.get('/api/health', asyncRoute(async (_req, res) => { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }));
app.get('/api', (_req, res) => res.json({ name: 'NexGen Research API', version: '1.0.0' }));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = cleanString(req.body?.email, 190).toLowerCase(); const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
  const [rows] = await pool.execute('SELECT id,name,email,role,password_hash FROM users WHERE email=? LIMIT 1', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  const token = crypto.randomBytes(32).toString('base64url'); const days = Math.min(30, Math.max(1, Number(process.env.TOKEN_TTL_DAYS || 7)));
  await pool.execute('INSERT INTO api_tokens (user_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? DAY))', [rows[0].id, hashToken(token), days]);
  res.json({ token, user: publicUser(rows[0]) });
}));
app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));
app.post('/api/auth/logout', auth, asyncRoute(async (req, res) => { const token = req.headers.authorization.slice(7); await pool.execute('DELETE FROM api_tokens WHERE token_hash=?', [hashToken(token)]); res.json({ ok: true }); }));

app.get('/api/dashboard', auth, asyncRoute(async (_req, res) => {
  const [[counts]] = await pool.query(`SELECT (SELECT COUNT(*) FROM projects) total_projects,(SELECT COUNT(*) FROM projects WHERE status='active') active_projects,(SELECT COUNT(*) FROM responses) total_responses,(SELECT COUNT(*) FROM projects WHERE status='completed') completed_projects`);
  const [projects] = await pool.query(`SELECT p.*,COUNT(r.id) response_count FROM projects p LEFT JOIN responses r ON r.project_id=p.id GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 5`);
  const [responses] = await pool.query(`SELECT r.*,p.name project_name FROM responses r JOIN projects p ON p.id=r.project_id ORDER BY r.response_date DESC,r.id DESC LIMIT 5`);
  res.json({ ...Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,Number(v)])), recent_projects: projects, recent_responses: responses.map(r=>({...r,id:Number(r.id),project_id:Number(r.project_id),answers:parseAnswers(r.answers)})) });
}));
function parseAnswers(v) { if (typeof v !== 'string') return v ?? {}; try { return JSON.parse(v); } catch { return {}; } }
const projectSelect = `SELECT p.*,COUNT(r.id) response_count FROM projects p LEFT JOIN responses r ON r.project_id=p.id`;
app.get('/api/projects', auth, asyncRoute(async (_req,res)=>{ const [rows]=await pool.query(`${projectSelect} GROUP BY p.id ORDER BY p.updated_at DESC`); res.json(rows); }));
app.post('/api/projects', auth, asyncRoute(async (req,res)=>{
  const b=req.body||{}; const name=cleanString(b.name,180); if(!name) return res.status(400).json({error:'Project name is required.'});
  const status=['planning','active','on_hold','completed'].includes(b.status)?b.status:'planning';
  const start=b.start_date||null,end=b.end_date||null; if(start&&!isDate(start)||end&&!isDate(end)) return res.status(400).json({error:'Dates must use YYYY-MM-DD format.'});
  const [result]=await pool.execute('INSERT INTO projects (name,client,industry,description,start_date,end_date,status,created_by) VALUES (?,?,?,?,?,?,?,?)',[name,cleanString(b.client,180),cleanString(b.industry,120),cleanString(b.description,10000)||null,start,end,status,req.user.id]);
  const [rows]=await pool.execute(`${projectSelect} WHERE p.id=? GROUP BY p.id`,[result.insertId]); res.status(201).json(rows[0]);
}));
app.put('/api/projects/:id', auth, asyncRoute(async (req,res)=>{
  const b=req.body||{}; const name=cleanString(b.name,180); if(!name) return res.status(400).json({error:'Project name is required.'});
  const status=['planning','active','on_hold','completed'].includes(b.status)?b.status:'planning'; const start=b.start_date||null,end=b.end_date||null;
  if(start&&!isDate(start)||end&&!isDate(end)) return res.status(400).json({error:'Dates must use YYYY-MM-DD format.'});
  const [r]=await pool.execute('UPDATE projects SET name=?,client=?,industry=?,description=?,start_date=?,end_date=?,status=? WHERE id=?',[name,cleanString(b.client,180),cleanString(b.industry,120),cleanString(b.description,10000)||null,start,end,status,req.params.id]);
  if(!r.affectedRows) return res.status(404).json({error:'Project not found.'}); const [rows]=await pool.execute(`${projectSelect} WHERE p.id=? GROUP BY p.id`,[req.params.id]); res.json(rows[0]);
}));
app.delete('/api/projects/:id', auth, adminOnly, asyncRoute(async(req,res)=>{const [r]=await pool.execute('DELETE FROM projects WHERE id=?',[req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Project not found.'});res.json({ok:true});}));

app.get('/api/responses', auth, asyncRoute(async(_req,res)=>{const [rows]=await pool.query('SELECT r.*,p.name project_name FROM responses r JOIN projects p ON p.id=r.project_id ORDER BY r.response_date DESC,r.id DESC');res.json(rows.map(r=>({...r,id:Number(r.id),project_id:Number(r.project_id),answers:parseAnswers(r.answers)})));}));
function validateResponse(b){if(!Number.isInteger(Number(b.project_id))||Number(b.project_id)<1)return 'Choose a valid project.';if(!cleanString(b.respondent_code,100))return 'Respondent code is required.';if(!isDate(b.response_date))return 'Response date must use YYYY-MM-DD format.';let answers=b.answers??{};if(typeof answers==='string'){try{answers=JSON.parse(answers)}catch{return 'Answers must be valid JSON.'}}if(!answers||typeof answers!=='object'||Array.isArray(answers))return 'Answers must be a JSON object.';return null;}
app.post('/api/responses', auth, asyncRoute(async(req,res)=>{const b=req.body||{};const error=validateResponse(b);if(error)return res.status(400).json({error});try{const [r]=await pool.execute('INSERT INTO responses (project_id,respondent_code,response_date,channel,answers,notes) VALUES (?,?,?,?,?,?)',[Number(b.project_id),cleanString(b.respondent_code,100),b.response_date,cleanString(b.channel,100)||'Other',JSON.stringify(b.answers??{}),cleanString(b.notes,10000)||null]);const [rows]=await pool.execute('SELECT r.*,p.name project_name FROM responses r JOIN projects p ON p.id=r.project_id WHERE r.id=?',[r.insertId]);const x=rows[0];res.status(201).json({...x,id:Number(x.id),project_id:Number(x.project_id),answers:parseAnswers(x.answers)});}catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'That respondent code already exists for this project.'});if(e.code==='ER_NO_REFERENCED_ROW_2')return res.status(400).json({error:'The selected project does not exist.'});throw e;}}));
app.put('/api/responses/:id', auth, asyncRoute(async(req,res)=>{const b=req.body||{};const error=validateResponse(b);if(error)return res.status(400).json({error});try{const [r]=await pool.execute('UPDATE responses SET project_id=?,respondent_code=?,response_date=?,channel=?,answers=?,notes=? WHERE id=?',[Number(b.project_id),cleanString(b.respondent_code,100),b.response_date,cleanString(b.channel,100)||'Other',JSON.stringify(b.answers??{}),cleanString(b.notes,10000)||null,req.params.id]);if(!r.affectedRows){const [exists]=await pool.execute('SELECT id FROM responses WHERE id=?',[req.params.id]);if(!exists.length)return res.status(404).json({error:'Response not found.'});}const [rows]=await pool.execute('SELECT r.*,p.name project_name FROM responses r JOIN projects p ON p.id=r.project_id WHERE r.id=?',[req.params.id]);const x=rows[0];res.json({...x,id:Number(x.id),project_id:Number(x.project_id),answers:parseAnswers(x.answers)});}catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'That respondent code already exists for this project.'});throw e;}}));
app.delete('/api/responses/:id', auth, adminOnly, asyncRoute(async(req,res)=>{const [r]=await pool.execute('DELETE FROM responses WHERE id=?',[req.params.id]);if(!r.affectedRows)return res.status(404).json({error:'Response not found.'});res.json({ok:true});}));
app.post('/api/responses/import', auth, upload.single('file'), asyncRoute(async(req,res)=>{
  if(!req.file)return res.status(400).json({error:'Choose a CSV file to import.'});
  const text=req.file.buffer.toString('utf8').replace(/^\uFEFF/,''); let records;
  try{records=parse(text,{columns:header=>header.map(h=>h.trim().toLowerCase()),skip_empty_lines:true,trim:true,relax_column_count:true,max_record_size:100000});}catch{return res.status(400).json({error:'Could not read CSV. Check its header row and quoting.'});}
  if(records.length>5000)return res.status(400).json({error:'Import is limited to 5,000 rows per file.'});
  const errors=[];let imported=0;const conn=await pool.getConnection();
  try{await conn.beginTransaction();for(let i=0;i<records.length;i++){const b=records[i];const issue=validateResponse(b);if(issue){errors.push(`Row ${i+2}: ${issue}`);continue;}let answers=b.answers??'{}';try{answers=typeof answers==='string'?JSON.parse(answers):answers;if(!answers||typeof answers!=='object'||Array.isArray(answers))throw new Error();}catch{errors.push(`Row ${i+2}: answers must contain a JSON object.`);continue;}
    try{await conn.execute('INSERT INTO responses (project_id,respondent_code,response_date,channel,answers,notes) VALUES (?,?,?,?,?,?)',[Number(b.project_id),cleanString(b.respondent_code,100),b.response_date,cleanString(b.channel,100)||'Other',JSON.stringify(answers),cleanString(b.notes,10000)||null]);imported++;}catch(e){if(e.code==='ER_DUP_ENTRY')errors.push(`Row ${i+2}: respondent code already exists for this project.`);else if(e.code==='ER_NO_REFERENCED_ROW_2')errors.push(`Row ${i+2}: project_id does not exist.`);else throw e;}}
    await conn.commit();res.json({imported,errors:errors.slice(0,100)});
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}));

app.get('/api/users', auth, adminOnly, asyncRoute(async(_req,res)=>{const [rows]=await pool.query('SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC');res.json(rows.map(publicUser));}));
app.post('/api/users', auth, adminOnly, asyncRoute(async(req,res)=>{const b=req.body||{};const name=cleanString(b.name,120);const email=cleanString(b.email,190).toLowerCase();const password=String(b.password||'');const role=b.role==='admin'?'admin':'team';if(!name||!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'Enter a name and valid email address.'});if(password.length<12)return res.status(400).json({error:'Password must be at least 12 characters.'});const password_hash=await bcrypt.hash(password,12);try{const [r]=await pool.execute('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',[name,email,password_hash,role]);res.status(201).json({id:Number(r.insertId),name,email,role});}catch(e){if(e.code==='ER_DUP_ENTRY')return res.status(409).json({error:'An account with this email already exists.'});throw e;}}));
app.delete('/api/users/:id', auth, adminOnly, asyncRoute(async(req,res)=>{if(Number(req.params.id)===req.user.id)return res.status(400).json({error:'You cannot remove your own account.'});const [[counts]]=await pool.execute("SELECT COUNT(*) n FROM users WHERE role='admin'");const [[target]]=await pool.execute('SELECT role FROM users WHERE id=?',[req.params.id]);if(!target)return res.status(404).json({error:'User not found.'});if(target.role==='admin'&&Number(counts.n)<=1)return res.status(400).json({error:'At least one administrator account must remain.'});const [r]=await pool.execute('DELETE FROM users WHERE id=?',[req.params.id]);res.json({ok:!!r.affectedRows});}));

app.use((req,res)=>res.status(404).json({error:'API endpoint not found.'}));
app.use((err,req,res,_next)=>{if(err instanceof multer.MulterError)return res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'File must be 5 MB or smaller.':'Upload could not be processed.'});if(err.message==='Origin is not allowed by CORS.')return res.status(403).json({error:err.message});console.error(`[${new Date().toISOString()}]`,err.code||err.name,err.message);res.status(500).json({error:process.env.NODE_ENV==='production'?'An unexpected server error occurred.':'Server error. Check backend logs.'});});
app.listen(port,'0.0.0.0',()=>console.log(`NexGen Research API listening on ${port}`));
