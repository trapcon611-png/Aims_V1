import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
const csv = require('csv-parser');

const prisma = new PrismaClient();

const cleanStr = (val: any) => {
    if (!val || String(val).trim().toLowerCase() === 'nan') return null;
    return String(val).trim();
};

const formatImage = (val: any) => {
    const str = cleanStr(val);
    if (!str) return null;
    if (str.startsWith('http') || str.startsWith('data:image')) return str;
    return `data:image/png;base64,${str}`;
};

const normalizeForCompare = (text: string) => text ? text.replace(/\s+/g, '').toLowerCase() : '';

const getSubjectFromFileName = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.includes('physics')) return 'Physics';
    if (lower.includes('chemistry')) return 'Chemistry';
    if (lower.includes('biology')) return 'Biology';
    if (lower.includes('math')) return 'Mathematics';
    return 'General';
};

const formatExamType = (folderName: string) => {
    if (folderName === 'JEE_Advanced') return 'JEE Advanced';
    if (folderName === 'JEE_Main') return 'JEE Main';
    if (folderName === 'MHT_CET') return 'MHT-CET';
    return folderName;
};

async function processFile(filePath: string, examType: string, fallbackSubject: string, teacherId: string, approvedMap: Map<string, boolean>) {
    return new Promise<void>((resolve, reject) => {
        const questionsToInsert: any[] = [];
        let skippedCount = 0;
        let rowCount = 0; 
        
        // Grab a base time so we can perfectly increment it
        const baseTime = Date.now(); 

        console.log(`\n📄 Processing: [${examType}] - (${path.basename(filePath)})`);
        console.log(`   -> Forcing Subject to: ${fallbackSubject}`); // Log what we are forcing it to

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row: any) => {
                rowCount++; 
                const qTextRaw = cleanStr(row.question_text);
                if (!qTextRaw) return;

                const normalizedQText = normalizeForCompare(qTextRaw) + `_${examType}`;

                // Skip if already approved
                if (approvedMap.has(normalizedQText)) {
                    skippedCount++;
                    return;
                }

                const parsedOptions = {
                    a: cleanStr(row.option_a) || '',
                    b: cleanStr(row.option_b) || '',
                    c: cleanStr(row.option_c) || '',
                    d: cleanStr(row.option_d) || '',
                    img_a: formatImage(row.option_image_a),
                    img_b: formatImage(row.option_image_b),
                    img_c: formatImage(row.option_image_c),
                    img_d: formatImage(row.option_image_d),
                };

                const mainImage = formatImage(row.image_data) || formatImage(row.extra_question_images);
                const solImage = formatImage(row.hint_image) || formatImage(row.solution_images);
                const solText = cleanStr(row.solution);
                
                let dbCorrectOpt = cleanStr(row.correct_answer)?.toLowerCase() || 'pending';
                if (!['a', 'b', 'c', 'd'].includes(dbCorrectOpt)) dbCorrectOpt = 'pending';
                
                // Force the creation time to increase by 1000 milliseconds (1 second) per row!
                // This guarantees the database strictly respects the original CSV Top-to-Bottom order.
                const sequentialTime = new Date(baseTime + (rowCount * 1000));

                questionsToInsert.push({
                    createdById: teacherId,
                    examType: examType,
                    
                    // 🚀 CRITICAL FIX: We completely ignore `row.subject` because your CSV data is dirty.
                    // We FORCE the subject based purely on the file name!
                    subject: fallbackSubject, 
                    
                    topic: cleanStr(row.topic_name) || 'Uncategorized',
                    questionText: qTextRaw,
                    questionImage: mainImage,
                    solutionImage: solImage,
                    explanation: solText,
                    options: parsedOptions,
                    correctOption: dbCorrectOpt,
                    difficulty: 'pending',    
                    type: cleanStr(row.type) === 'numerical' ? 'NUMERICAL' : 'MCQ',
                    marks: 4,
                    negative: -1,
                    createdAt: sequentialTime
                });
            })
            .on('end', async () => {
                if (questionsToInsert.length > 0) {
                    const chunkSize = 500;
                    for (let i = 0; i < questionsToInsert.length; i += chunkSize) {
                        const chunk = questionsToInsert.slice(i, i + chunkSize);
                        await prisma.questionBank.createMany({ data: chunk, skipDuplicates: true });
                    }
                    console.log(`✅ Successfully imported ${questionsToInsert.length} fresh questions in PERFECT ORDER!`);
                }
                if (skippedCount > 0) {
                    console.log(`🛡️ Skipped ${skippedCount} approved questions.`);
                }
                
                resolve();
            })
            .on('error', reject);
    });
}

async function main() {
    const csvBaseDir = path.join(__dirname, 'csv_uploads');
    if (!fs.existsSync(csvBaseDir)) {
        console.error(`❌ Please create the folder structure at: ${csvBaseDir}`);
        process.exit(1);
    }

    let systemUser = await prisma.user.findFirst({ where: { username: 'system_admin' } });
    if (!systemUser) systemUser = await prisma.user.create({ data: { username: 'system_admin', password: 'hashed_password', role: 'SUPER_ADMIN' } });

    let systemTeacher = await prisma.teacherProfile.findFirst({ where: { userId: systemUser.id } });
    if (!systemTeacher) systemTeacher = await prisma.teacherProfile.create({ data: { userId: systemUser.id, fullName: 'System Auto-Importer' } });

    console.log('⏳ Securing previously approved questions...');
    const approvedDbQuestions = await prisma.questionBank.findMany({ 
        where: { difficulty: { not: 'pending' } },
        select: { questionText: true, examType: true } 
    });
    
    const approvedMap = new Map();
    approvedDbQuestions.forEach(q => {
        const safeExam = q.examType || 'General';
        approvedMap.set(normalizeForCompare(q.questionText) + `_${safeExam}`, true);
    });

    const folders = fs.readdirSync(csvBaseDir);
    for (const folder of folders) {
        const folderPath = path.join(csvBaseDir, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const examType = formatExamType(folder);
            
            console.log(`\n🧹 Wiping old 'pending' questions for ${examType}...`);
            const deleted = await prisma.questionBank.deleteMany({
                where: { examType: examType, difficulty: 'pending' }
            });
            console.log(`🗑️ Cleared ${deleted.count} old pending questions.`);

            const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.csv'));
            
            for (const file of files) {
                const subject = getSubjectFromFileName(file);
                await processFile(path.join(folderPath, file), examType, subject, systemTeacher.id, approvedMap);
            }
        }
    }

    console.log('\n🎉 ALL FOLDERS PROCESSED AND SYNCED SUCCESSFULLY!');
    await prisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});