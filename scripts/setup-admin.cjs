/**
 * Admin Setup Script
 * 
 * Bu script yeni bir admin kullanıcısı oluşturmak için kullanılır.
 * Firebase Admin SDK gerektirir.
 * 
 * Kullanım:
 * 1. Firebase Admin SDK service account key indir
 * 2. Bu script'i çalıştır:
 *    node scripts/setup-admin.js <email> <password>
 */

const admin = require('firebase-admin');
const path = require('path');

// Service account key path
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '../serviceAccountKey.json');

// Initialize Firebase Admin
let app;
try {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.error('\nÖnce serviceAccountKey.json dosyasını indirmeniz gerekli:');
    console.error('1. Firebase Console → Project Settings → Service Accounts');
    console.error('2. "Generate new private key" butonuna tıklayın');
    console.error('3. İnen dosyayı proje köküne serviceAccountKey.json olarak kaydedin');
    process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

/**
 * Create admin user
 */
async function createAdmin(email, password) {
    try {
        console.log(`🔧 Creating admin user: ${email}`);

        // 1. Create Firebase Auth user
        let userRecord;
        try {
            userRecord = await auth.createUser({
                email: email,
                password: password,
                emailVerified: true
            });
            console.log('✅ Firebase Auth user created:', userRecord.uid);
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                console.log('ℹ️ User already exists, fetching...');
                userRecord = await auth.getUserByEmail(email);
                console.log('✅ Existing user:', userRecord.uid);
            } else {
                throw error;
            }
        }

        // 2. Set custom claims (admin role)
        await auth.setCustomUserClaims(userRecord.uid, {
            admin: true,
            role: 'admin'
        });
        console.log('✅ Custom claims set (admin: true)');

        // 3. Create admin document in Firestore
        const adminRef = db.collection('admins').doc(userRecord.uid);
        await adminRef.set({
            uid: userRecord.uid,
            email: email,
            role: 'admin',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: 'setup-script',
            lastLoginAt: null,
            lastLoginIp: null,
            loginCount: 0
        }, { merge: true });
        console.log('✅ Admin document created in Firestore');

        console.log('\n✅ Admin user setup complete!');
        console.log(`Email: ${email}`);
        console.log(`UID: ${userRecord.uid}`);
        console.log('\n⚠️  Lütfen şifreyi güvenli bir yerde saklayın!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * List all admins
 */
async function listAdmins() {
    try {
        console.log('\n📋 Listing all admins...\n');

        const adminsSnapshot = await db.collection('admins').get();
        
        if (adminsSnapshot.empty) {
            console.log('No admins found.');
            return;
        }

        console.log('UID                          | Email                    | Active | Login Count');
        console.log('-'.repeat(85));

        for (const doc of adminsSnapshot.docs) {
            const admin = doc.data();
            console.log(
                `${admin.uid.substring(0, 28).padEnd(28)} | ` +
                `${admin.email.padEnd(24)} | ` +
                `${admin.isActive ? '✅' : '❌'}     | ` +
                `${admin.loginCount || 0}`
            );
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Delete admin user
 */
async function deleteAdmin(email) {
    try {
        console.log(`🗑️  Deleting admin: ${email}`);

        // Get user
        const userRecord = await auth.getUserByEmail(email);
        
        // Delete from Firestore
        await db.collection('admins').doc(userRecord.uid).delete();
        console.log('✅ Admin document deleted from Firestore');

        // Delete from Auth
        await auth.deleteUser(userRecord.uid);
        console.log('✅ User deleted from Firebase Auth');

        console.log('\n✅ Admin user deleted successfully!');

    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error('❌ User not found:', email);
        } else {
            console.error('❌ Error:', error.message);
        }
        process.exit(1);
    }
}

// CLI Commands
const command = process.argv[2];

switch (command) {
    case 'create':
        const email = process.argv[3];
        const password = process.argv[4];
        
        if (!email || !password) {
            console.error('Usage: node setup-admin.js create <email> <password>');
            process.exit(1);
        }
        
        // Validate password strength
        if (password.length < 6) {
            console.error('❌ Password must be at least 6 characters');
            process.exit(1);
        }
        
        createAdmin(email, password).then(() => process.exit(0));
        break;

    case 'list':
        listAdmins().then(() => process.exit(0));
        break;

    case 'delete':
        const deleteEmail = process.argv[3];
        if (!deleteEmail) {
            console.error('Usage: node setup-admin.js delete <email>');
            process.exit(1);
        }
        deleteAdmin(deleteEmail).then(() => process.exit(0));
        break;

    default:
        console.log('Admin Setup Script\n');
        console.log('Commands:');
        console.log('  create <email> <password>  Create a new admin user');
        console.log('  list                       List all admin users');
        console.log('  delete <email>             Delete an admin user');
        console.log('\nExamples:');
        console.log('  node setup-admin.js create admin@example.com SecurePass123!');
        console.log('  node setup-admin.js list');
        console.log('  node setup-admin.js delete admin@example.com');
        process.exit(0);
}
