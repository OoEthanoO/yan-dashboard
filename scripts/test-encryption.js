const CryptoJS = require("crypto-js");

const TEST_SALT = "test_salt_value";
const AI_PUBLIC_KEY = "AI_MODEL_PUBLIC_KEY_2023";
const combinedKey = `${AI_PUBLIC_KEY}_${TEST_SALT}`;

const TestEncryptionService = {
  encryptGradeData: async (data) => {
    if (data === null || data === undefined) return data;

    try {
      const stringData = JSON.stringify(data);

      const encrypted = CryptoJS.AES.encrypt(
        stringData,
        combinedKey
      ).toString();
      return encrypted;
    } catch (error) {
      return null;
    }
  },

  decryptGradeData: async (encryptedData) => {
    if (!encryptedData) return null;

    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, combinedKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

      const parsedValue = JSON.parse(decryptedString);

      return parsedValue;
    } catch (error) {
      return null;
    }
  },
};

async function testEncryption() {
  console.log("======= ENCRYPTION SERVICE MANUAL TEST =======\n");

  console.log("TESTING NUMBER VALUE:");
  const numValue = 95;
  console.log(`Original value: ${numValue} (${typeof numValue})`);
  const encryptedNum = await TestEncryptionService.encryptGradeData(numValue);
  console.log(`Encrypted value: ${encryptedNum}`);
  const decryptedNum = await TestEncryptionService.decryptGradeData(
    encryptedNum
  );
  console.log(`Decrypted value: ${decryptedNum} (${typeof decryptedNum})`);
  console.log(`Test passed: ${decryptedNum === numValue}\n`);

  console.log("TESTING STRING VALUE:");
  const strValue = "A+";
  console.log(`Original value: ${strValue} (${typeof strValue})`);
  const encryptedStr = await TestEncryptionService.encryptGradeData(strValue);
  console.log(`Encrypted value: ${encryptedStr}`);
  const decryptedStr = await TestEncryptionService.decryptGradeData(
    encryptedStr
  );
  console.log(`Decrypted value: ${decryptedStr} (${typeof decryptedStr})`);
  console.log(`Test passed: ${decryptedStr === strValue}\n`);

  console.log("TESTING OBJECT VALUE:");
  const objValue = { score: 95, letter: "A+" };
  console.log(
    `Original value: ${JSON.stringify(objValue)} (${typeof objValue})`
  );
  const encryptedObj = await TestEncryptionService.encryptGradeData(objValue);
  console.log(`Encrypted value: ${encryptedObj}`);
  const decryptedObj = await TestEncryptionService.decryptGradeData(
    encryptedObj
  );
  console.log(
    `Decrypted value: ${JSON.stringify(decryptedObj)} (${typeof decryptedObj})`
  );
  console.log(
    `Test passed: ${
      JSON.stringify(decryptedObj) === JSON.stringify(objValue)
    }\n`
  );

  console.log("TESTING NULL VALUE:");
  const nullValue = null;
  console.log(`Original value: ${nullValue} (${typeof nullValue})`);
  const encryptedNull = await TestEncryptionService.encryptGradeData(nullValue);
  console.log(`Encrypted value: ${encryptedNull}`);
  const decryptedNull = await TestEncryptionService.decryptGradeData(
    encryptedNull
  );
  console.log(`Decrypted value: ${decryptedNull} (${typeof decryptedNull})`);
  console.log(`Test passed: ${decryptedNull === nullValue}\n`);

  console.log("TESTING UNDEFINED VALUE:");
  const undefinedValue = undefined;
  console.log(`Original value: ${undefinedValue} (${typeof undefinedValue})`);
  const encryptedUndef = await TestEncryptionService.encryptGradeData(
    undefinedValue
  );
  console.log(`Encrypted value: ${encryptedUndef}`);
  const decryptedUndef = await TestEncryptionService.decryptGradeData(
    encryptedUndef
  );
  console.log(`Decrypted value: ${decryptedUndef} (${typeof decryptedUndef})`);
  console.log(`Test passed: ${decryptedUndef === undefinedValue}\n`);

  console.log("======= TEST COMPLETE =======");
}

testEncryption().catch((error) => console.error("Test failed:", error));
