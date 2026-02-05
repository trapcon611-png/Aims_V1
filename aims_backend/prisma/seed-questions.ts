import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Comprehensive Question Bank Seeding...');

  // 1. Ensure System Teacher Exists
  const systemEmail = 'system_content_admin@aims.com';
  let teacher = await prisma.teacherProfile.findUnique({ where: { email: systemEmail } });

  if (!teacher) {
    console.log('Creating System Teacher Profile...');
    let user = await prisma.user.findUnique({ where: { username: 'content_admin' }});
    if (!user) {
        user = await prisma.user.create({
        data: { 
            username: 'content_admin', 
            password: 'secure_password_123', 
            role: 'TEACHER', 
            isActive: true 
        }
        });
    }
    teacher = await prisma.teacherProfile.create({
      data: { 
          userId: user.id, 
          fullName: 'System Content Admin', 
          email: systemEmail, 
          mobile: '0000000000', 
          subject: 'GENERAL', 
          qualification: 'System AI' 
      }
    });
  }

  const teacherId = teacher.id;
  const allQuestions: any[] = [];

  // --- HELPER: Option Mapper (Index to Key) ---
  const mapIndexToKey = (idx: number) => {
      const keys = ['a', 'b', 'c', 'd', 'e', 'f'];
      return keys[idx] || '';
  };

  // --- FILE 1: question_bank.csv (Original Format) ---
  const file1Path = path.join(__dirname, 'question_bank.csv');
  if (fs.existsSync(file1Path)) {
      console.log(`\n📂 Processing File 1: ${file1Path}...`);
      await new Promise((resolve, reject) => {
          fs.createReadStream(file1Path)
            .pipe(csv({ mapHeaders: ({ header }: { header: string }) => header.trim().toLowerCase() }))
            .on('data', (row: any) => {
                try {
                    // Options Parsing
                    let rawOptions = row.options || '[]';
                    let parsedOptions: string[] = [];
                    try {
                        let cleaned = rawOptions.trim();
                        if (cleaned.startsWith("[") && cleaned.endsWith("]")) cleaned = cleaned.slice(1, -1);
                        
                        if (cleaned.includes("', '") || cleaned.includes('", "')) {
                            parsedOptions = cleaned.split(/['"],\s?['"]/).map((opt: string) => opt.replace(/^['"]|['"]$/g, '').trim());
                        } else if (cleaned.includes(",")) {
                            parsedOptions = cleaned.split(",").map((opt: string) => opt.trim().replace(/^['"]|['"]$/g, ''));
                        } else {
                            parsedOptions = [cleaned.replace(/^['"]|['"]$/g, '')];
                        }
                    } catch (e) { parsedOptions = ["A", "B", "C", "D"]; }

                    // Correct Answer
                    const rawAnswer = row['correct-answer'] || row.answer || '';
                    const correctKey = rawAnswer.toString().replace(/[\[\]'"]/g, '').toLowerCase().replace(/\s/g, ''); 

                    // Validation
                    const qText = row.question || row.question_text || '';
                    if (!qText) return;

                    const subject = (row.subject || 'GENERAL').toUpperCase();
                    const topic = row.topic || 'General';
                    const type = (row.type || 'single').trim().toLowerCase();
                    const tags = [topic];
                    if (type.includes('multi')) tags.push('MULTIPLE');
                    if (type.includes('int')) tags.push('INTEGER');

                    allQuestions.push({
                        createdById: teacherId,
                        questionText: qText,
                        questionImage: (row['question-image'] && row['question-image'].length > 5) ? row['question-image'] : null,
                        solutionImage: (row['solution-image'] && row['solution-image'].length > 5) ? row['solution-image'] : null,
                        options: { 
                            a: parsedOptions[0] || '', 
                            b: parsedOptions[1] || '', 
                            c: parsedOptions[2] || '', 
                            d: parsedOptions[3] || '' 
                        },
                        correctOption: correctKey,
                        subject,
                        topic,
                        difficulty: 'MEDIUM',
                        marks: 4,
                        negative: -1,
                        expectedTime: 60,
                        isActive: true,
                        tags
                    });
                } catch (err) { console.error('Error parsing row in File 1', err); }
            })
            .on('end', resolve)
            .on('error', reject);
      });
  } else {
      console.warn(`⚠️ File not found: ${file1Path}`);
  }

  // --- FILE 2: merged_dataset.csv (New Format) ---
  const file2Path = path.join(__dirname, 'merged_dataset.csv');
  if (fs.existsSync(file2Path)) {
      console.log(`\n📂 Processing File 2: ${file2Path}...`);
      await new Promise((resolve, reject) => {
          let count = 0;
          fs.createReadStream(file2Path)
            .pipe(csv()) // Standard headers assumed from your snippet
            .on('data', (row: any) => {
                count++;
                try {
                    const qText = row.question || '';
                    if (!qText) return;

                    // Parse Options: ["-1080", "-1020", ...]
                    let optionsObj: any = { a: '', b: '', c: '', d: '' };
                    let isInteger = false;
                    
                    try {
                        const optsRaw = row.options || '[]';
                        // Handle Python/JSON string format
                        const cleanedOpts = optsRaw.replace(/'/g, '"'); // Fix single quotes if any
                        const optsArray = JSON.parse(cleanedOpts);
                        
                        if (Array.isArray(optsArray) && optsArray.length > 0) {
                            optsArray.forEach((opt: string, idx: number) => {
                                const key = mapIndexToKey(idx);
                                if (key) optionsObj[key] = opt.toString();
                            });
                        } else {
                            isInteger = true;
                        }
                    } catch (e) {
                        // Fallback if parsing fails - assume integer if looks empty or broken
                        isInteger = true;
                    }

                    // Determine Correct Option
                    let correctKey = '';
                    if (isInteger) {
                        correctKey = row.answer?.toString() || '';
                    } else {
                        // Parse correct_options indices: "[0]" -> "a", "[0, 1]" -> "a,b"
                        try {
                            const indicesRaw = row.correct_options || '[]';
                            const indices = JSON.parse(indicesRaw);
                            if (Array.isArray(indices)) {
                                correctKey = indices.map((i: number) => mapIndexToKey(i)).join(',');
                            }
                        } catch (e) {
                            // Fallback: try to match answer text to options? 
                            // For now leave empty or mark Manual Review
                        }
                    }

                    // Type & Tags
                    const qTypeVal = parseFloat(row.question_type || '0');
                    const tags: string[] = []; // Explicitly typed string array
                    if (isInteger || qTypeVal === 0.0) tags.push('INTEGER');
                    else if (correctKey.includes(',')) tags.push('MULTIPLE');
                    else tags.push('SINGLE');

                    allQuestions.push({
                        createdById: teacherId,
                        questionText: qText,
                        questionImage: null, // This dataset doesn't seem to have images based on snippet
                        solutionImage: null,
                        options: optionsObj,
                        correctOption: correctKey,
                        subject: (row.subject || 'Mathematics').toUpperCase(),
                        topic: 'General', // Dataset doesn't specify topic column
                        difficulty: 'HARD', // Assuming these are JEE questions
                        marks: 4,
                        negative: isInteger ? 0 : -1, // No negative for integers usually
                        expectedTime: 120,
                        isActive: true,
                        tags
                    });

                } catch (err) { 
                    // console.error(`Error parsing row ${count} in File 2`, err); 
                }
            })
            .on('end', resolve)
            .on('error', reject);
      });
  } else {
      console.warn(`⚠️ File not found: ${file2Path}`);
  }

  // --- BULK INSERT ---
  if (allQuestions.length === 0) {
    console.error('❌ No valid questions found in either file.');
    return;
  }

  console.log(`\n🚀 Inserting ${allQuestions.length} questions into DB...`);
  
  try {
    const batchSize = 50; 
    for (let i = 0; i < allQuestions.length; i += batchSize) {
        const batch = allQuestions.slice(i, i + batchSize);
        await prisma.questionBank.createMany({ data: batch, skipDuplicates: true });
        process.stdout.write(`.`);
    }
    console.log('\n✅ Question Bank Seeding Completed Successfully.');
  } catch (error) {
    console.error('\n❌ Database Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { 
    console.error(e); 
    process.exit(1); 
});