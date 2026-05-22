const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const DEFAULT_EMPLOYEE_PASSWORD = '123456';

exports.resetEmployeePasswordToDefault = functions.database
  .ref('/password_reset_requests/{uid}')
  .onWrite(async (change, context) => {
    const after = change.after.val();
    if (!after || after.status !== 'pending-admin-sdk') return null;

    const uid = context.params.uid;
    await admin.auth().updateUser(uid, { password: DEFAULT_EMPLOYEE_PASSWORD });
    await admin.database().ref(`/users/${uid}`).update({
      passwordResetRequired: true,
      passwordResetDoneAt: new Date().toISOString()
    });
    await change.after.ref.update({
      status: 'done',
      completed_at: new Date().toISOString()
    });
    return null;
  });
