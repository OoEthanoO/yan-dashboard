// Manual test for EncryptionService

// Create a mock version of the encryption service that doesn't rely on AsyncStorage
const CryptoJS = require("crypto-js");

// Define constant key for testing
const TEST_SALT = "test_salt_value";
const AI_PUBLIC_KEY = "AI_MODEL_PUBLIC_KEY_2023";
const combinedKey = `${AI_PUBLIC_KEY}_${TEST_SALT}`;

// Create a simplified version of the encryption service for testing
const TestEncryptionService = {
  encryptGradeData: async (data) => {
    if (data === null || data === undefined) return data;

    try {
      console.log(`[ENCRYPT] Input grade data: ${data} (type: ${typeof data})`);
      console.log(`[ENCRYPT] Using test key: ${combinedKey}`);

      const stringData = JSON.stringify(data);
      console.log(`[ENCRYPT] Stringified grade data: ${stringData}`);

      const encrypted = CryptoJS.AES.encrypt(
        stringData,
        combinedKey
      ).toString();
      console.log(
        `[ENCRYPT] Resulting encrypted data: ${encrypted.substring(0, 20)}...`
      );
      return encrypted;
    } catch (error) {
      console.error("[ENCRYPT] Encryption error:", error);
      return null;
    }
  },

  decryptGradeData: async (encryptedData) => {
    if (!encryptedData) return null;

    try {
      console.log(
        `[DECRYPT] Attempting to decrypt: ${encryptedData.substring(0, 20)}...`
      );
      console.log(`[DECRYPT] Using test key: ${combinedKey}`);

      const bytes = CryptoJS.AES.decrypt(encryptedData, combinedKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      console.log(`[DECRYPT] Decrypted string: ${decryptedString}`);

      const parsedValue = JSON.parse(decryptedString);
      console.log(
        `[DECRYPT] Parsed value: ${parsedValue} (type: ${typeof parsedValue})`
      );

      return parsedValue;
    } catch (error) {
      console.error("[DECRYPT] Decryption error:", error);
      return null;
    }
  },
};

// Test function
async function testEncryption() {
  console.log("======= ENCRYPTION SERVICE MANUAL TEST =======\n");

  // Test number value
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

  // Test string value
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

  // Test object value
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

  // Test null value
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

  // Test undefined value
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

// Run the test
testEncryption().catch((error) => console.error("Test failed:", error));
