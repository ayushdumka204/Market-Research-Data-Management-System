import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
const rl=createInterface({input:stdin,output:stdout});
try {
 const email=(process.argv[2]||await rl.question('Admin email: ')).trim().toLowerCase();
 const name=(process.argv[3]||await rl.question('Admin full name: ')).trim();
 const password=process.argv[4]||await rl.question('Admin password (12+ characters): ');
 if(!/^\S+@\S+\.\S+$/.test(email)||!name||password.length<12)throw new Error('Provide a valid email, name, and password of at least 12 characters.');
 const db=await mysql.createConnection({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,...(process.env.DB_SSL==='true'?{ssl:{minVersion:'TLSv1.2',rejectUnauthorized:true}}:{})});
 const hash=await bcrypt.hash(password,12);
 await db.execute("INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')",[name,email,hash]);
 await db.end();console.log(`Admin account created for ${email}.`);
} catch(e){console.error(`Could not create admin: ${e.message}`);process.exitCode=1;} finally {rl.close();}
