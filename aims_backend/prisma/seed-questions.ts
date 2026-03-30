import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();
const CSV_DIR = path.join(__dirname, 'csvs');

// ✨ SMART FINDER: Recursively searches subfolders to find EXACTLY the file we want
function findSpecificFile(dir: string, targetName: string, fileList: string[] = []) {
    if (!fs.existsSync(dir)) return fileList;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findSpecificFile(filePath, targetName, fileList);
        } else if (file.toLowerCase() === targetName.toLowerCase()) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

async function main() {
    console.log('🚀 Starting AIMS Intelligent DB Seed (SINGLE FILE APPEND MODE)...');
    console.log('🛡️  Existing questions will NOT be deleted.');
    console.log('🎯 Targeting ONLY "maths-cet.csv" to prevent duplicating older files.');

    // Only grabs maths-cet.csv, even if it's hidden inside the MHT-CET subfolder!
    const targetFiles = findSpecificFile(CSV_DIR, 'maths-cet.csv');

    if (targetFiles.length === 0) {
        console.log(`❌ Could not find "maths-cet.csv" anywhere inside ${CSV_DIR}`);
        return;
    }

    const systemAdmin = await prisma.user.findUnique({ where: { username: 'system_admin' } });
    
    // ✨ FIX: Explicitly type as 'any' to prevent TypeScript from locking it as strictly 'null'
    let teacherProfile: any = null; 
    
    if (systemAdmin) {
        teacherProfile = await prisma.teacherProfile.findFirst({ where: { userId: systemAdmin.id } });
    }

    for (const filePath of targetFiles) {
        const fileName = path.basename(filePath);
        console.log(`\n📄 Processing: ${fileName} (Found at: ${filePath})`);

        let examType = 'MHT-CET'; // Default for this file
        const lowerFile = fileName.toLowerCase();
        
        if (lowerFile.includes('cet')) examType = 'MHT-CET';
        else if (lowerFile.includes('advance')) examType = 'JEE Advanced';
        else if (lowerFile.includes('main')) examType = 'JEE Main';
        else if (lowerFile.includes('neet')) examType = 'NEET';

        const questions: any[] = [];

        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
              .pipe(csv())
              .on('data', (row) => {
                  let subject = row.subject ? row.subject.trim().toUpperCase() : 'GENERAL';
                  
                  // Aggressive subject mapping to ensure it goes to Mathematics
                  if (subject.includes('MATH') || lowerFile.includes('math')) subject = 'Mathematics';
                  else if (subject.includes('PHY')) subject = 'Physics';
                  else if (subject.includes('CHEM')) subject = 'Chemistry';
                  else if (subject.includes('BIO')) subject = 'Biology';

                  let qType = 'MCQ';
                  if (row.type && row.type.toLowerCase().includes('numerical')) qType = 'NUMERICAL';
                  else if (row.type && row.type.toLowerCase().includes('single')) qType = 'MCQ';

                  const options = {
                      a: row.option_a || '',
                      b: row.option_b || '',
                      c: row.option_c || '',
                      d: row.option_d || '',
                      img_a: row.option_image_a && row.option_image_a !== 'null' ? row.option_image_a : null,
                      img_b: row.option_image_b && row.option_image_b !== 'null' ? row.option_image_b : null,
                      img_c: row.option_image_c && row.option_image_c !== 'null' ? row.option_image_c : null,
                      img_d: row.option_image_d && row.option_image_d !== 'null' ? row.option_image_d : null,
                  };

                  questions.push({
                      examType: examType,
                      subject: subject,
                      topic: row.topic_name ? (row.topic_name.charAt(0).toUpperCase() + row.topic_name.slice(1).toLowerCase()) : 'Uncategorized',
                      type: qType,
                      questionText: row.question_text || '',
                      questionImage: row.image_data && row.image_data !== 'null' ? row.image_data : null,
                      solutionImage: row.solution_images && row.solution_images !== 'null' ? row.solution_images : null,
                      explanation: row.solution && row.solution !== 'null' ? row.solution : '',
                      options: options,
                      correctOption: row.correct_answer ? String(row.correct_answer).toLowerCase() : 'pending',
                      difficulty: 'pending', 
                      marks: examType === 'JEE Advanced' ? 4 : (examType === 'MHT-CET' && subject === 'Mathematics' ? 2 : 4),
                      negative: examType === 'MHT-CET' ? 0 : -1,
                      expectedTime: 60,
                      isActive: true,
                      createdById: teacherProfile ? teacherProfile.id : null
                  });
              })
              .on('end', resolve)
              .on('error', reject);
        });

        const batchSize = 100;
        let inserted = 0;
        
        for (let i = 0; i < questions.length; i += batchSize) {
            const batch = questions.slice(i, i + batchSize);
            await prisma.questionBank.createMany({
                data: batch,
                skipDuplicates: true
            });
            inserted += batch.length;
            process.stdout.write(`\r✅ Inserted ${inserted} / ${questions.length} questions...`);
        }
        console.log(`\n🎉 Finished ${fileName}. Extracted Exam Type: [${examType}] Subject: [Mathematics]`);
    }

    console.log('\n=============================================');
    console.log('🏆 MATHS CET SUCCESSFULLY APPENDED!');
    console.log('=============================================');
}

main()
  .catch(e => {
    console.error('Fatal Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });